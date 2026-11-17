package com.directbone.jangle

import android.net.Uri
import android.util.Base64
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.MimeTypeMap
import android.webkit.JavascriptInterface
import androidx.documentfile.provider.DocumentFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.FilterInputStream
import java.io.FileNotFoundException
import java.io.InputStream
import java.nio.charset.StandardCharsets
import java.util.Locale

/** Narrow SAF bridge: JavaScript can access only the user-selected tree URI. */
class AndroidLibraryBridge(private val activity: MainActivity) {
    private val prefs by lazy { activity.getSharedPreferences(PREFS, 0) }
    private val resolver get() = activity.contentResolver

    fun saveSelectedTree(uri: Uri) {
        prefs.edit().putString(KEY_TREE_URI, uri.toString()).apply()
    }

    private fun root(): DocumentFile? {
        val raw = prefs.getString(KEY_TREE_URI, null) ?: return null
        return try { DocumentFile.fromTreeUri(activity, Uri.parse(raw)) } catch (_: Exception) { null }
    }

    private fun pathParts(relativePath: String): List<String> {
        val normal = relativePath.replace('\\', '/').trim('/')
        if (normal.isEmpty()) return emptyList()
        val parts = normal.split('/').filter { it.isNotBlank() }
        require(parts.none { it == "." || it == ".." || it.contains('\u0000') }) { "Недопустимый путь" }
        return parts
    }

    private fun findNode(relativePath: String): DocumentFile? {
        var current = root() ?: return null
        for (part in pathParts(relativePath)) {
            current = current.findFile(part) ?: return null
        }
        return current
    }

    private fun findOrCreateDirectory(relativePath: String): DocumentFile? {
        var current = root() ?: return null
        for (part in pathParts(relativePath)) {
            val existing = current.findFile(part)
            current = when {
                existing?.isDirectory == true -> existing
                existing != null -> return null
                else -> current.createDirectory(part) ?: return null
            }
        }
        return current
    }

    private fun parentAndName(relativePath: String, createParents: Boolean = false): Pair<DocumentFile, String>? {
        val parts = pathParts(relativePath)
        if (parts.isEmpty()) return null
        val parentPath = parts.dropLast(1).joinToString("/")
        val parent = if (createParents) findOrCreateDirectory(parentPath) else findNode(parentPath)
        return parent?.takeIf { it.isDirectory }?.let { it to parts.last() }
    }

    @JavascriptInterface
    fun getLibraryInfo(): String {
        val selected = root() ?: return ""
        if (!selected.exists() || !selected.isDirectory) return ""
        return JSONObject()
            .put("name", selected.name ?: "Локальная библиотека")
            .put("token", "android-saf")
            .toString()
    }

    @JavascriptInterface
    fun requestLibrary() {
        activity.launchLibraryPicker()
    }

    @JavascriptInterface
    fun list(relativePath: String): String {
        return try {
            val directory = findNode(relativePath) ?: return "[]"
            if (!directory.isDirectory) return "[]"
            val output = JSONArray()
            directory.listFiles().forEach { child ->
                val name = child.name ?: return@forEach
                if (name.isNotBlank()) {
                    output.put(
                        JSONObject()
                            .put("name", name)
                            .put("kind", if (child.isDirectory) "directory" else "file")
                    )
                }
            }
            output.toString()
        } catch (_: Exception) {
            "[]"
        }
    }

    @JavascriptInterface
    fun readText(relativePath: String): String {
        return try {
            val file = findNode(relativePath) ?: return ""
            resolver.openInputStream(file.uri)?.use { input ->
                input.readBytes().toString(StandardCharsets.UTF_8)
            } ?: ""
        } catch (_: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun getMediaUrl(relativePath: String): String {
        return try {
            val file = findNode(relativePath) ?: return ""
            if (!file.isFile) return ""
            val encoded = Base64.encodeToString(
                relativePath.toByteArray(StandardCharsets.UTF_8),
                Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
            )
            "https://appassets.androidplatform.net/jangle-media/$encoded"
        } catch (_: Exception) {
            ""
        }
    }

    @JavascriptInterface
    fun writeText(relativePath: String, content: String): Boolean {
        return writeBytes(relativePath, content.toByteArray(StandardCharsets.UTF_8), "text/plain")
    }

    @JavascriptInterface
    fun writeFileBase64(relativePath: String, base64: String, mimeType: String): Boolean {
        return try {
            val bytes = Base64.decode(base64, Base64.DEFAULT)
            writeBytes(relativePath, bytes, mimeType.ifBlank { "application/octet-stream" })
        } catch (_: Exception) {
            false
        }
    }

    private fun writeBytes(relativePath: String, bytes: ByteArray, mimeType: String): Boolean {
        return try {
            val pair = parentAndName(relativePath, createParents = true) ?: return false
            val (parent, name) = pair
            val existing = parent.findFile(name)
            val file = if (existing?.isFile == true) existing else {
                if (existing != null) return false
                parent.createFile(mimeType, name) ?: return false
            }
            resolver.openOutputStream(file.uri, "wt")?.use { output -> output.write(bytes) } ?: return false
            true
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun createDirectory(relativePath: String): Boolean {
        return try { findOrCreateDirectory(relativePath) != null } catch (_: Exception) { false }
    }

    @JavascriptInterface
    fun rename(relativePath: String, newName: String): Boolean {
        if (newName.isBlank() || newName.contains('/') || newName.contains('\\')) return false
        return try {
            val node = findNode(relativePath) ?: return false
            node.renameTo(newName)
        } catch (_: Exception) {
            false
        }
    }

    /** Serves the selected video's content through an appassets URL with byte-range support. */
    fun openMediaResponse(request: WebResourceRequest): WebResourceResponse {
        return try {
            // Uri.encodedPath is nullable on Android. Guard it before using String APIs.
            val encodedPath = request.url.encodedPath ?: return errorResponse(400, "Bad Request")
            val mediaPrefix = "/jangle-media/"
            if (!encodedPath.startsWith(mediaPrefix)) return errorResponse(404, "Not Found")
            val encoded = encodedPath.substringAfter(mediaPrefix)
            if (encoded.isBlank()) return errorResponse(400, "Bad Request")
            val relativePath = String(Base64.decode(encoded, Base64.URL_SAFE), StandardCharsets.UTF_8)
            val file = findNode(relativePath) ?: return errorResponse(404, "Not Found")
            if (!file.isFile) return errorResponse(404, "Not Found")
            val size = file.length()
            val mime = resolver.getType(file.uri) ?: mimeFromName(file.name) ?: "application/octet-stream"
            val rangeHeader = request.requestHeaders.entries.firstOrNull { it.key.equals("Range", ignoreCase = true) }?.value

            var start = 0L
            var end = if (size > 0L) size - 1L else -1L
            var status = 200
            var reason = "OK"
            if (!rangeHeader.isNullOrBlank() && size > 0L) {
                val match = Regex("bytes=(\\d*)-(\\d*)", RegexOption.IGNORE_CASE).matchEntire(rangeHeader.trim())
                    ?: return errorResponse(416, "Range Not Satisfiable", mapOf("Content-Range" to "bytes */$size"))
                val first = match.groupValues[1]
                val last = match.groupValues[2]
                if (first.isEmpty()) {
                    val suffix = last.toLongOrNull()?.coerceAtMost(size) ?: 0L
                    start = (size - suffix).coerceAtLeast(0L)
                } else {
                    start = first.toLongOrNull() ?: size
                }
                end = if (last.isEmpty() || first.isEmpty()) size - 1L else (last.toLongOrNull() ?: (size - 1L)).coerceAtMost(size - 1L)
                if (start >= size || end < start) {
                    return errorResponse(416, "Range Not Satisfiable", mapOf("Content-Range" to "bytes */$size"))
                }
                status = 206
                reason = "Partial Content"
            }

            val stream = resolver.openInputStream(file.uri) ?: throw FileNotFoundException(relativePath)
            skipFully(stream, start)
            val length = if (size > 0L) end - start + 1L else -1L
            val body = if (length >= 0L) LimitedInputStream(stream, length) else stream
            val headers = linkedMapOf(
                "Accept-Ranges" to "bytes",
                "Cache-Control" to "no-store",
                "Content-Type" to mime,
                "X-Content-Type-Options" to "nosniff"
            )
            if (length >= 0L) headers["Content-Length"] = length.toString()
            if (status == 206) headers["Content-Range"] = "bytes $start-$end/$size"
            WebResourceResponse(mime, null, status, reason, headers, body)
        } catch (_: Exception) {
            errorResponse(404, "Not Found")
        }
    }

    private fun mimeFromName(name: String?): String? {
        val extension = name?.substringAfterLast('.', "")?.lowercase(Locale.ROOT) ?: return null
        if (extension.isBlank()) return null
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)
    }

    private fun skipFully(stream: InputStream, count: Long) {
        var remaining = count
        while (remaining > 0L) {
            val skipped = stream.skip(remaining)
            if (skipped > 0L) {
                remaining -= skipped
            } else {
                if (stream.read() == -1) break
                remaining--
            }
        }
    }

    private fun errorResponse(status: Int, reason: String, extra: Map<String, String> = emptyMap()): WebResourceResponse {
        val headers = linkedMapOf("Content-Type" to "text/plain; charset=utf-8")
        headers.putAll(extra)
        return WebResourceResponse(
            "text/plain",
            "UTF-8",
            status,
            reason,
            headers,
            ByteArrayInputStream(reason.toByteArray(StandardCharsets.UTF_8))
        )
    }

    private class LimitedInputStream(input: InputStream, private var remaining: Long) : FilterInputStream(input) {
        override fun read(): Int {
            if (remaining <= 0L) return -1
            val value = super.read()
            if (value >= 0) remaining--
            return value
        }

        override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
            if (remaining <= 0L) return -1
            val allowed = minOf(length.toLong(), remaining).toInt()
            val count = super.read(buffer, offset, allowed)
            if (count > 0) remaining -= count.toLong()
            return count
        }
    }

    companion object {
        private const val PREFS = "jangle_android_library"
        private const val KEY_TREE_URI = "selected_tree_uri"
    }
}
