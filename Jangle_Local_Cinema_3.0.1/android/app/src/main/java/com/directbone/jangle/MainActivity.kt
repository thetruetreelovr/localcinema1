package com.directbone.jangle

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ValueCallback
import android.widget.FrameLayout
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private lateinit var chromeClient: WebChromeClient
    private var pendingFileChooser: ValueCallback<Array<Uri>>? = null

    private val bridge by lazy { AndroidLibraryBridge(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(16, 19, 17)
        window.navigationBarColor = Color.rgb(16, 19, 17)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(Color.rgb(16, 19, 17))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            settings.mediaPlaybackRequiresUserGesture = true
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            addJavascriptInterface(bridge, "JangleAndroidBridge")
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                    val req = request ?: return null
                    val path = req.url.encodedPath ?: ""
                    if (path.startsWith("/jangle-media/")) {
                        return bridge.openMediaResponse(req)
                    }
                    return assetLoader.shouldInterceptRequest(req.url)
                }

                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val uri = request?.url ?: return false
                    return uri.host != "appassets.androidplatform.net"
                }
            }
            chromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView,
                    filePathCallback: ValueCallback<Array<Uri>>,
                    fileChooserParams: WebChromeClient.FileChooserParams
                ): Boolean {
                    pendingFileChooser?.onReceiveValue(null)
                    pendingFileChooser = filePathCallback
                    return try {
                        this@MainActivity.startActivityForResult(fileChooserParams.createIntent(), REQUEST_FILES)
                        true
                    } catch (_: Exception) {
                        pendingFileChooser = null
                        filePathCallback.onReceiveValue(null)
                        false
                    }
                }

                override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                    if (customView != null) {
                        callback.onCustomViewHidden()
                        return
                    }
                    customView = view
                    customViewCallback = callback
                    (this@MainActivity.window.decorView as FrameLayout).addView(
                        view,
                        FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    )
                    this@MainActivity.webView.visibility = View.GONE
                    this@MainActivity.window.decorView.systemUiVisibility = (
                        View.SYSTEM_UI_FLAG_FULLSCREEN or
                            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        )
                }

                override fun onHideCustomView() {
                    val shown = customView ?: return
                    (this@MainActivity.window.decorView as FrameLayout).removeView(shown)
                    customView = null
                    customViewCallback?.onCustomViewHidden()
                    customViewCallback = null
                    this@MainActivity.webView.visibility = View.VISIBLE
                    this@MainActivity.window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                }
            }
            webChromeClient = chromeClient
        }

        setContentView(webView)
        webView.loadUrl(APP_URL)
    }

    fun launchLibraryPicker() {
        runOnUiThread {
            try {
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                    addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
                    addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
                }
                startActivityForResult(intent, REQUEST_LIBRARY)
            } catch (error: Exception) {
                notifyLibrarySelection(null)
            }
        }
    }

    @Deprecated("Android SAF result callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_FILES) {
            val callback = pendingFileChooser
            pendingFileChooser = null
            callback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            return
        }
        if (requestCode != REQUEST_LIBRARY) return
        if (resultCode != RESULT_OK || data?.data == null) {
            notifyLibrarySelection(null)
            return
        }
        val treeUri = data.data!!
        val grantFlags = data.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        try {
            contentResolver.takePersistableUriPermission(
                treeUri,
                if (grantFlags != 0) grantFlags else (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            )
            bridge.saveSelectedTree(treeUri)
            notifyLibrarySelection(bridge.getLibraryInfo())
        } catch (error: Exception) {
            notifyLibrarySelection(null)
        }
    }

    private fun notifyLibrarySelection(infoJson: String?) {
        val payload = infoJson?.let { org.json.JSONObject.quote(it) } ?: "null"
        webView.post {
            webView.evaluateJavascript(
                "window.JangleAndroidBridgeCallback && window.JangleAndroidBridgeCallback($payload);",
                null
            )
        }
    }

    override fun onBackPressed() {
        if (customView != null) {
            webChromeClientHideCustomView()
            return
        }
        webView.evaluateJavascript(
            "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));",
            null
        )
        // Keep the app open; in the player Escape closes the player, and the in-page
        // navigation buttons handle the rest of the application routes.
    }

    private fun webChromeClientHideCustomView() {
        if (::chromeClient.isInitialized) chromeClient.onHideCustomView()
    }

    override fun onDestroy() {
        pendingFileChooser?.onReceiveValue(null)
        pendingFileChooser = null
        if (::webView.isInitialized) {
            webView.removeJavascriptInterface("JangleAndroidBridge")
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.destroy()
        }
        super.onDestroy()
    }

    companion object {
        private const val REQUEST_LIBRARY = 7214
        private const val REQUEST_FILES = 7215
        private const val APP_URL = "https://appassets.androidplatform.net/assets/www/index.html"
    }
}
