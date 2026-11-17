/* Android SAF bridge adapter for Jangle.
 * Loaded before app.js. It activates only inside the supplied native Android wrapper.
 */
(() => {
  'use strict';
  const bridge = window.JangleAndroidBridge;
  if (!bridge) return;

  const parse = (value, fallback = null) => {
    if (value == null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return fallback; }
  };
  const asBool = value => value === true || value === 1 || value === '1' || value === 'true';
  const encodeBase64 = async blob => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode(...bytes.subarray(i, i + step));
    }
    return btoa(binary);
  };

  let pendingPicker = null;
  window.JangleAndroidBridgeCallback = payload => {
    if (!pendingPicker) return;
    const resolve = pendingPicker;
    pendingPicker = null;
    resolve(parse(payload));
  };

  window.JangleNative = {
    getLibraryInfo: async () => parse(bridge.getLibraryInfo()),
    chooseLibrary: () => new Promise(resolve => {
      if (pendingPicker) {
        resolve(null);
        return;
      }
      pendingPicker = resolve;
      try { bridge.requestLibrary(); }
      catch (error) {
        pendingPicker = null;
        console.error('Android SAF picker failed', error);
        resolve(null);
      }
    }),
    list: async relativePath => parse(bridge.list(String(relativePath || '')), []),
    readText: async relativePath => String(bridge.readText(String(relativePath || '')) ?? ''),
    readFile: async relativePath => {
      const uri = String(bridge.getMediaUrl(String(relativePath || '')) || '');
      if (!uri) throw new Error(`Файл не найден: ${relativePath}`);
      return { uri };
    },
    writeText: async (relativePath, value) => asBool(bridge.writeText(String(relativePath || ''), String(value ?? ''))),
    writeFile: async (relativePath, blob, mimeType) => {
      if (!(blob instanceof Blob)) throw new Error('Ожидался файл или Blob');
      const base64 = await encodeBase64(blob);
      return asBool(bridge.writeFileBase64(String(relativePath || ''), base64, String(mimeType || blob.type || 'application/octet-stream')));
    },
    createDirectory: async relativePath => asBool(bridge.createDirectory(String(relativePath || ''))),
    rename: async (relativePath, newName) => asBool(bridge.rename(String(relativePath || ''), String(newName || '')))
  };

  document.documentElement.dataset.jangleAndroid = 'true';
})();
