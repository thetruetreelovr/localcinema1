/* Jangle / Local Cinema 3.0.1 — vanilla HTML, CSS and JavaScript. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const APP_VERSION = '3.0.1';
  const BUILD = 'build_2026.2.3';
  const CODE_NAME = 'Jangle';
  const DB_NAME = 'jangle-local-cinema';
  const DB_STORE = 'handles';
  const DEFAULT_SETTINGS = Object.freeze({
    history_enabled: true,
    search_enabled: true,
    child_mode: false,
    editor_mode: false
  });
  const VIDEO_EXTENSIONS = new Set(['mp4','m4v','webm','ogv','ogg','mov','qt','avi','mpg','mpeg','mpe','m1v','m2v','mp2','mpv','mkv','3gp','3g2','ts','mts','m2t','m2ts','wmv','asf','flv','f4v','vob','mxf','rm','rmvb','divx','xvid']);

  const state = {
    rootHandle: null,
    nativeRootToken: null,
    libraryMode: null, // fs | native | import
    rootName: '',
    importedFiles: new Map(),
    categories: [],
    settings: { ...DEFAULT_SETTINGS },
    history: {},
    route: 'welcome',
    stack: [],
    selectedProduct: null,
    selectedSeason: 0,
    sessionUnlocked: new Set(),
    ageRevealed: new Set(),
    productAgeConfirmed: new Set(),
    urlCache: new Map(),
    thumbCache: new Map(),
    thumbJobs: new Set(),
    modal: null,
    player: null,
    toastTimer: null,
    lastHistoryWrite: 0,
    drag: null,
    searchTerm: '',
    scanToken: 0
  };

  const svg = {
    back: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6M9 12h11"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.1 1.8-1.8 3.1-2.1-.5a8 8 0 0 1-1.7 1l-.4 2.1h-3.6l-.4-2.1a8 8 0 0 1-1.7-1l-2.1.5L5 16.9l1.1-1.8a8 8 0 0 1 0-2l-1.1-1.8 1.8-3.1 2.1.5a8 8 0 0 1 1.7-1L11 5.6h3.6l.4 2.1a8 8 0 0 1 1.7 1l2.1-.5 1.8 3.1-1.1 1.8a8 8 0 0 1-.1 1.9Z" transform="translate(-1 -1) scale(.96)"/></svg>',
    history: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5h3v14H8zM15 5h3v14h-3z" fill="currentColor" stroke="none"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M5 5v14M19 6l-10 6 10 6z"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M19 5v14M5 6l10 6-10 6z"/></svg>',
    rewind: '<svg viewBox="0 0 24 24"><path d="M11 6 3 12l8 6zM21 6l-8 6 8 6z"/></svg>',
    forward: '<svg viewBox="0 0 24 24"><path d="m3 6 8 6-8 6zM13 6l8 6-8 6z"/></svg>',
    sliders: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
    format: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 12h10M7 15h5"/></svg>',
    screen: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/></svg>',
    rotate: '<svg viewBox="0 0 24 24"><path d="M4 8a8 8 0 0 1 13.7-2.3L20 8M20 4v4h-4M20 16a8 8 0 0 1-13.7 2.3L4 16m0 4v-4h4"/></svg>',
    pencil: '<svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    lock: '<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
    film: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>'
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }
  function pathKey(path) { return Array.isArray(path) ? path.join('/') : String(path || ''); }
  function clonePath(path) { return [...path]; }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const value = Math.floor(seconds);
    const h = Math.floor(value / 3600), m = Math.floor((value % 3600) / 60), s = value % 60;
    return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
  }
  function formatDate(value) {
    try { return new Intl.DateTimeFormat('ru-RU', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)); }
    catch { return ''; }
  }
  function deviceName() {
    const ua = navigator.userAgent || '';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Android/i.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS / iPadOS';
    if (/Mac OS/i.test(ua)) return 'macOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Не определено';
  }
  function iconButton(name, label, action, extra = '') {
    return `<button class="icon-btn ${extra}" type="button" data-action="${esc(action)}" aria-label="${esc(label)}" title="${esc(label)}">${svg[name] || ''}<span class="button-label">${esc(label)}</span></button>`;
  }
  function editButton(action, path, label = 'Редактировать') {
    return `<button class="edit-icon" type="button" data-action="${esc(action)}" data-path="${esc(pathKey(path))}" title="${esc(label)}" aria-label="${esc(label)}">${svg.pencil}</button>`;
  }
  function toast(message) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.append(el); }
    el.textContent = message;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el?.remove(), 2800);
  }

  // IndexedDB is used only to remember a browser directory handle, never media files.
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB недоступен'));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Не удалось открыть локальное хранилище'));
    });
  }
  async function dbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
      request.onsuccess = () => { db.close(); resolve(request.result); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  }
  async function dbSet(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).put(value, key);
      request.onsuccess = () => { db.close(); resolve(); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  }
  async function dbDelete(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(DB_STORE, 'readwrite').objectStore(DB_STORE).delete(key);
      request.onsuccess = () => { db.close(); resolve(); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  }

  function parseMeta(source = '') {
    const result = {};
    const lines = String(source).replace(/^\uFEFF/, '').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*['"]?([a-zA-Z0-9_-]+)['"]?\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      let value = match[2].trim();
      if (!value || value === 'empty' || value === 'null') { result[match[1]] = ''; continue; }
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        if (value.startsWith('"')) {
          try { value = JSON.parse(value); } catch { value = value.slice(1,-1).replace(/\\"/g,'"').replace(/\\n/g,'\n'); }
        } else value = value.slice(1,-1).replace(/\\'/g,"'").replace(/\\n/g,'\n');
      }
      result[match[1]] = value;
    }
    return result;
  }
  function serializeMeta(data) {
    return Object.entries(data).map(([key, value]) => {
      if (value === undefined || value === null || value === '') return `'${key}' = empty`;
      if (typeof value === 'number' && Number.isFinite(value)) return `'${key}' = ${value}`;
      if (typeof value === 'boolean') return `'${key}' = ${value ? 'yes' : 'no'}`;
      return `'${key}' = ${JSON.stringify(String(value))}`;
    }).join('\n') + '\n';
  }
  function affirmative(value) { return ['yes','true','1','on','да'].includes(String(value ?? '').trim().toLowerCase()); }
  function hasAgeRestriction(value) {
    const v = String(value ?? '').trim().toLowerCase();
    return !!v && v !== 'no' && v !== 'false' && v !== '0' && v !== 'empty';
  }
  function ageLabel(value) {
    const match = String(value ?? '').match(/\d{1,2}/);
    return match ? `${match[0]}+` : '18+';
  }
  function sortEntries(items) {
    return [...items].sort((a,b) => {
      const ao = Number(a.order), bo = Number(b.order);
      const av = Number.isFinite(ao) && ao > 0, bv = Number.isFinite(bo) && bo > 0;
      if (av && bv) return ao - bo || a.name.localeCompare(b.name, 'ru', { numeric:true, sensitivity:'base' });
      if (av) return -1;
      if (bv) return 1;
      return a.name.localeCompare(b.name, 'ru', { numeric:true, sensitivity:'base' });
    });
  }

  // A tiny path adapter keeps folder handling identical for the writable picker and import fallback.
  async function getDir(path, create = false) {
    if (state.libraryMode !== 'fs' || !state.rootHandle) throw new Error('Библиотека доступна только для чтения');
    let current = state.rootHandle;
    for (const segment of path) current = await current.getDirectoryHandle(segment, { create });
    return current;
  }
  async function listPath(path) {
    const clean = path.filter(Boolean);
    if (state.libraryMode === 'native') {
      const items=await window.JangleNative.list(clean.join('/'));
      return (items||[]).map(item=>({name:item.name,kind:item.kind,path:[...clean,item.name],nativeUri:item.uri||null}));
    }
    if (state.libraryMode === 'fs') {
      const dir = await getDir(clean, false);
      const output = [];
      for await (const [name, handle] of dir.entries()) output.push({ name, kind: handle.kind, handle, path:[...clean,name] });
      return output;
    }
    const prefix = clean.length ? clean.join('/') + '/' : '';
    const output = new Map();
    for (const [key, file] of state.importedFiles) {
      if (!key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      if (!rest) continue;
      const slash = rest.indexOf('/');
      if (slash === -1) output.set(rest, { name:rest, kind:'file', file, path:[...clean,rest] });
      else {
        const name = rest.slice(0,slash);
        if (!output.has(name)) output.set(name, { name, kind:'directory', path:[...clean,name] });
      }
    }
    return [...output.values()];
  }
  async function readFile(path) {
    const key = pathKey(path);
    if (state.libraryMode === 'native') {
      const result=await window.JangleNative.readFile(key);
      if (result instanceof Blob) return result;
      if (result?.blob instanceof Blob) return result.blob;
      return result;
    }
    if (state.libraryMode === 'import') {
      const file = state.importedFiles.get(key);
      if (!file) throw new Error(`Файл не найден: ${key}`);
      return file;
    }
    let parent = state.rootHandle;
    for (const segment of path.slice(0,-1)) parent = await parent.getDirectoryHandle(segment);
    const handle = await parent.getFileHandle(path.at(-1));
    return handle.getFile();
  }
  async function readText(path) {
    try {
      if (state.libraryMode==='native') return await window.JangleNative.readText(pathKey(path));
      return await (await readFile(path)).text();
    } catch { return ''; }
  }
  async function writeBlob(path, blob) {
    if (state.libraryMode==='native') { const ok=await window.JangleNative.writeFile(pathKey(path),blob,blob.type||'application/octet-stream'); if(ok===false) throw new Error('Нативный адаптер не смог сохранить файл'); return; }
    if (state.libraryMode !== 'fs') throw new Error('Этот режим браузера разрешает просмотр, но не запись в выбранную папку. Откройте библиотеку через «Выбрать папку» в Chrome или Edge.');
    const parent = await getDir(path.slice(0,-1), true);
    const handle = await parent.getFileHandle(path.at(-1), { create:true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
  async function writeText(path, value) {
    if (state.libraryMode==='native') { const ok=await window.JangleNative.writeText(pathKey(path),value); if(ok===false) throw new Error('Нативный адаптер не смог сохранить текстовый файл'); return; }
    await writeBlob(path, new Blob([value], { type:'text/plain;charset=utf-8' }));
  }
  async function readMeta(path) { return parseMeta(await readText(path)); }
  async function writeMeta(path, value) { await writeText(path, serializeMeta(value)); }
  async function ensureDirectory(path) {
    if (state.libraryMode==='native') { await window.JangleNative.createDirectory(pathKey(path)); return; }
    if (state.libraryMode !== 'fs') return;
    await getDir(path, true);
  }
  async function objectUrl(path) {
    const key = pathKey(path);
    if (state.urlCache.has(key)) return state.urlCache.get(key);
    if (state.libraryMode==='native') {
      const result=await readFile(path);
      const url=typeof result==='string' ? result : (result?.uri || (result instanceof Blob ? URL.createObjectURL(result) : null));
      if (!url) throw new Error('Нативный адаптер не вернул URI или Blob файла');
      state.urlCache.set(key,url); return url;
    }
    const file = await readFile(path);
    const url = URL.createObjectURL(file);
    state.urlCache.set(key, url);
    return url;
  }

  function localSettingsKey() { return `jangle-settings:${encodeURIComponent(state.rootName || 'default')}`; }
  async function loadSettings() {
    const stored = await readMeta(['settings','user_settings.md']);
    const local = safeJson(localStorage.getItem(localSettingsKey()) || '{}', {});
    state.settings = {
      history_enabled: stored.history !== undefined ? affirmative(stored.history) : (local.history_enabled ?? DEFAULT_SETTINGS.history_enabled),
      search_enabled: stored.search !== undefined ? affirmative(stored.search) : (local.search_enabled ?? DEFAULT_SETTINGS.search_enabled),
      child_mode: stored.child_mode !== undefined ? affirmative(stored.child_mode) : (local.child_mode ?? DEFAULT_SETTINGS.child_mode),
      editor_mode: stored.editor_mode !== undefined ? affirmative(stored.editor_mode) : (local.editor_mode ?? DEFAULT_SETTINGS.editor_mode)
    };
    const diskHistory = safeJson(stored.history_json || '{}', {});
    const localHistory = safeJson(local.history_json || '{}', {});
    state.history = { ...diskHistory };
    for (const [key,value] of Object.entries(localHistory)) if (!state.history[key] || (value.updated||0) > (state.history[key].updated||0)) state.history[key]=value;
  }
  function safeJson(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
  async function saveSettings() {
    try { localStorage.setItem(localSettingsKey(), JSON.stringify({ ...state.settings, history_json: JSON.stringify(state.history) })); } catch (error) { console.warn('Local backup of settings unavailable',error); }
    const previous = (state.libraryMode === 'fs' || state.libraryMode === 'native') ? await readMeta(['settings','user_settings.md']) : {};
    const serialized = { ...previous,
      history: state.settings.history_enabled ? 'yes' : 'no',
      search: state.settings.search_enabled ? 'yes' : 'no',
      child_mode: state.settings.child_mode ? 'yes' : 'no',
      editor_mode: state.settings.editor_mode ? 'yes' : 'no',
      history_json: JSON.stringify(state.history)
    };
    if (state.libraryMode === 'fs' || state.libraryMode === 'native') {
      try {
        await ensureDirectory(['settings']);
        await writeMeta(['settings','user_settings.md'], serialized);
      } catch (error) { console.warn(error); toast(`Не удалось записать настройки: ${error.message}`); }
    }
  }

  async function scanLibrary() {
    const token = ++state.scanToken;
    const content = await listPath(['content']).catch(() => []);
    const categoryDirs = content.filter(item => item.kind === 'directory' && !item.name.startsWith('.'));
    const categories = [];
    for (const dir of categoryDirs) {
      if (token !== state.scanToken) return;
      const path = dir.path;
      const info = await readMeta([...path,'category_info.md']);
      const productsRaw = await listPath(path).catch(() => []);
      const productDirs = productsRaw.filter(item => item.kind === 'directory' && !item.name.startsWith('.'));
      const products = [];
      for (const productDir of productDirs) {
        const productPath = productDir.path;
        const meta = await readMeta([...productPath,'product_info.md']);
        const childEntries = await listPath(productPath).catch(() => []);
        const seasonDirs = childEntries.filter(item => item.kind === 'directory' && !item.name.startsWith('.'));
        const seasons = [];
        for (const seasonDir of seasonDirs) {
          const seasonPath = seasonDir.path;
          const seasonInfo = await readMeta([...seasonPath,'season_info.md']);
          const files = (await listPath(seasonPath).catch(() => []))
            .filter(item => item.kind === 'file' && isVideoFile(item.name))
            .sort((a,b) => a.name.localeCompare(b.name,'ru',{numeric:true,sensitivity:'base'}));
          seasons.push({ name:seasonInfo.name || seasonDir.name, folderName:seasonDir.name, path:seasonPath, info:seasonInfo, order:seasonInfo.order, episodes:files.map(file => ({ name:file.name, path:file.path, key:pathKey(file.path) })) });
        }
        if (!seasonDirs.length) {
          const directVideos = childEntries.filter(item => item.kind === 'file' && isVideoFile(item.name)).sort((a,b) => a.name.localeCompare(b.name,'ru',{numeric:true,sensitivity:'base'}));
          if (directVideos.length) seasons.push({ name:'Все серии', folderName:'', path:productPath, info:{}, order:1, virtual:true, episodes:directVideos.map(file => ({ name:file.name, path:file.path, key:pathKey(file.path) })) });
        }
        products.push({
          name:meta.name || productDir.name,
          folderName:productDir.name,
          path:productPath,
          info:meta,
          order:meta.order,
          posterPath:[...productPath,'poster.png'],
          headerPath:[...productPath,'header.png'],
          seasons:sortEntries(seasons)
        });
      }
      const category = {
        name:info.name || dir.name,
        folderName:dir.name,
        path,
        info,
        order:info.order,
        description:info.description || '',
        password:info.password || '',
        ageRestriction:info.age_restriction || '',
        products:sortEntries(products)
      };
      categories.push(category);
    }
    if (token !== state.scanToken) return;
    state.categories = sortEntries(categories);
    await primeImages();
  }
  function isVideoFile(name) {
    const ext = String(name).split('.').pop().toLowerCase();
    return VIDEO_EXTENSIONS.has(ext);
  }
  async function primeImages() {
    const jobs = [];
    for (const category of state.categories) for (const product of category.products) {
      jobs.push(objectUrl(product.posterPath).catch(() => null));
      jobs.push(objectUrl(product.headerPath).catch(() => null));
    }
    await Promise.all(jobs);
  }

  function canShowCategory(category) {
    if (!state.settings.child_mode) return true;
    return !category.password && !hasAgeRestriction(category.ageRestriction);
  }
  function isCategoryUnlocked(category) { return !category.password || state.sessionUnlocked.has(pathKey(category.path)); }
  function isCategoryAgeShown(category) { return !hasAgeRestriction(category.ageRestriction) || state.ageRevealed.has(pathKey(category.path)); }
  function posterMarkup(product, category, index = 0) {
    const path = pathKey(product.path);
    const posterUrl = state.urlCache.get(pathKey(product.posterPath));
    const ageBlocked = hasAgeRestriction(product.info.product_age_restriction);
    const initial = esc((product.name || '?').trim().charAt(0).toUpperCase());
    return `<div class="poster-card ${state.settings.editor_mode ? 'is-editing':''}" data-action="open-product" data-path="${esc(path)}" data-category-path="${esc(pathKey(category.path))}" ${state.settings.editor_mode ? 'draggable="true" data-drag-type="product"':''}>
      <span class="poster-image">${posterUrl ? `<img src="${esc(posterUrl)}" alt="${esc(product.name)}" loading="lazy">` : `<span class="poster-fallback"><span class="fallback-initial">${initial}</span><span class="fallback-title">${esc(product.name)}</span></span>`}
      ${ageBlocked ? '<span class="age-symbol" title="Возрастное ограничение">⊘</span>' : ''}
      ${state.settings.editor_mode ? `<span class="poster-drag-handle drag-handle" title="Перетащите, чтобы изменить порядок">${svg.menu}</span><span class="edit-tools" style="position:absolute;top:8px;right:8px;z-index:2"><button class="edit-icon" data-action="edit-poster" data-path="${esc(path)}" title="Заменить постер">${svg.image}</button></span>`:''}
      </span>
      <span class="poster-title">${esc(product.name)}</span>
      ${state.settings.editor_mode ? `<span style="display:flex;gap:5px;margin:6px 2px 0">${editButton('edit-product',product.path,'Изменить название и описание')}<span class="editor-label">редактор</span></span>`:''}
    </div>`;
  }
  function renderTopbar() {
    const editor = state.settings.editor_mode ? '<span class="editor-label">РЕДАКТОР</span>' : '';
    return `<header class="topbar">
      <button class="brand" type="button" data-action="home"><span class="brand-symbol">J</span><span><span class="brand-name">JANGLE</span><span class="brand-caption">LOCAL CINEMA</span></span></button>
      <div class="top-actions">${editor}${state.settings.history_enabled ? iconButton('history','История','history') : ''}${state.settings.search_enabled ? iconButton('search','Поиск','search') : ''}${iconButton('settings','Настройки','settings')}</div>
    </header>`;
  }
  function categoryRail(category) {
    const products=category.products.filter(product => !state.settings.child_mode || !hasAgeRestriction(product.info.product_age_restriction));
    const content = products.length
      ? `<div class="rail-viewport"><div class="rail">${products.map((product,index) => posterMarkup(product,category,index)).join('')}</div></div>`
      : '<div class="empty-state">В этой категории пока нет доступных произведений.</div>';
    if (category.password && !isCategoryUnlocked(category)) {
      return `<div class="lock-panel">${svg.lock}<h3>Категория защищена паролем</h3><p>Содержимое категории скрыто. Введите заданный пароль</p>
        <form class="lock-form" data-action="unlock-category" data-path="${esc(pathKey(category.path))}"><input type="password" name="password" placeholder="Пароль категории" autocomplete="current-password" required><button class="primary-btn" type="submit">Открыть</button></form></div>`;
    }
    if (hasAgeRestriction(category.ageRestriction) && !isCategoryAgeShown(category)) {
      return `<div class="blurred-wrap"><div class="blurred-rail">${content}</div><div class="lock-panel" style="position:absolute;inset:0;background:rgba(17,22,18,.72)"><div class="age-chip">${esc(ageLabel(category.ageRestriction))}</div><h3 style="margin-top:12px">Возрастное ограничение</h3><p>В этой категории может находиться контент, не предназначенный для несовершеннолетних.</p><button class="primary-btn" data-action="reveal-category" data-path="${esc(pathKey(category.path))}">Показать содержимое</button></div></div>`;
    }
    return content;
  }
  function renderHome() {
    const visible = state.categories.filter(canShowCategory);
    if (!visible.length) return `${renderTopbar()}<main class="page"><div class="empty-state"><strong>Библиотека пуста</strong>Добавьте папки категорий внутрь каталога content.</div></main>`;
    return `${renderTopbar()}<main class="page">
      <div class="page-head"><div><p class="eyebrow">ВАША КОЛЛЕКЦИЯ</p><h1>Библиотека</h1><p class="page-subtitle">Все ваши фильмы, сериалы и видео — в одном месте.</p></div><div style="color:var(--subtle);font-size:11px;white-space:nowrap">${visible.length} ${plural(visible.length,['категория','категории','категорий'])}</div></div>
      ${visible.map(category => `<section class="category-section" data-category-path="${esc(pathKey(category.path))}" ${state.settings.editor_mode ? 'draggable="true" data-drag-type="category"':''}>
        <div class="category-head"><div class="category-heading"><div class="category-title-line"><h2>${esc(category.name)}</h2>${state.settings.editor_mode ? editButton('edit-category',category.path,'Изменить категорию') : ''}${state.settings.editor_mode ? `<span class="drag-handle" title="Перетащите, чтобы изменить порядок">${svg.menu}</span>` : ''}</div><p class="category-description">${esc(category.description)}</p></div>
        <div class="rail-actions">${state.settings.editor_mode ? editButton('edit-category',category.path,'Изменить категорию') : ''}<button class="icon-btn" data-action="scroll-rail" data-path="${esc(pathKey(category.path))}" data-direction="left" aria-label="Прокрутить влево">‹</button><button class="icon-btn" data-action="scroll-rail" data-path="${esc(pathKey(category.path))}" data-direction="right" aria-label="Прокрутить вправо">›</button></div></div>
        ${categoryRail(category)}
      </section>`).join('')}
      <div class="footer">Directbone Interactive · 2026</div>
    </main>`;
  }
  function plural(number, forms) {
    const n = Math.abs(number) % 100, n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  }
  function findCategory(path) { return state.categories.find(item => pathKey(item.path) === pathKey(path)); }
  function findProduct(path) {
    for (const category of state.categories) for (const product of category.products) if (pathKey(product.path) === pathKey(path)) return { category, product };
    return null;
  }
  function episodeProgress(episode) {
    const item = state.history[episode.key];
    if (!item || !item.duration) return 0;
    return Math.max(0, Math.min(100, item.time / item.duration * 100));
  }
  function renderProduct() {
    const found = findProduct(state.selectedProduct);
    if (!found) return `${renderTopbar()}<main class="page"><div class="empty-state">Произведение не найдено. Возможно, библиотека была изменена.</div></main>`;
    const { category, product } = found;
    if (state.settings.child_mode && (!canShowCategory(category) || hasAgeRestriction(product.info.product_age_restriction))) return `${renderTopbar()}<main class="page"><div class="empty-state"><strong>Контент скрыт</strong>Это произведение недоступно в детском режиме.</div></main>`;
    const seasonIndex = Math.min(state.selectedSeason, Math.max(0,product.seasons.length-1));
    const season = product.seasons[seasonIndex];
    const header = state.urlCache.get(pathKey(product.headerPath));
    const seasonTabs = product.seasons.map((item,index) => `<span class="season-entry"><button type="button" class="season-tab ${index===seasonIndex?'active':''}" data-action="select-season" data-index="${index}">${esc(item.name)}</button>${state.settings.editor_mode && !item.virtual ? editButton('edit-season',item.path,'Изменить сезон') : ''}</span>`).join('');
    const episodeRows = season?.episodes?.length ? season.episodes.map((episode,index) => {
      const saved = state.history[episode.key];
      const progress = episodeProgress(episode);
      const thumb = state.thumbCache.get(episode.key);
      return `<div class="episode-row" data-action="play-episode" data-index="${index}" data-season-index="${seasonIndex}" data-episode-key="${esc(encodeURIComponent(episode.key))}">
        ${thumb ? `<img class="episode-thumb" data-thumb-key="${esc(encodeURIComponent(episode.key))}" src="${esc(thumb)}" alt="Превью серии" loading="lazy">` : `<div class="thumb-placeholder" data-thumb-key="${esc(encodeURIComponent(episode.key))}">${svg.film}</div>`}
        <div class="episode-meta"><div class="episode-title">${esc(displayEpisodeName(episode.name))}</div><div class="episode-subtitle">${saved?.time ? `Продолжить с ${formatTime(saved.time)}` : (saved?.duration ? 'Просмотрено ранее' : 'Не просмотрено')}</div><div class="progress-track"><div class="progress-fill" style="width:${progress.toFixed(2)}%"></div></div></div>
        <span class="duration">${saved?.duration ? formatTime(saved.duration) : '—:—'}</span>
      </div>`;
    }).join('') : '<div class="empty-state"><strong>В этом сезоне пока нет серий</strong>Поддерживаются видеофайлы внутри папки сезона.</div>';
    return `${renderTopbar()}<main class="page" style="padding-top:0">
      <section class="product-hero"><div class="product-hero-image" style="${header ? `background-image:url('${esc(header)}')` : ''}"></div><div class="product-hero-content"><div class="eyebrow">${esc(category.name)}</div><h1>${esc(product.name)}</h1><p class="product-description">${esc(product.info.description || '')}</p><div class="publisher">${product.info.publisher ? `Опубликовано: <strong>${esc(product.info.publisher)}</strong>` : ''}</div>
      ${state.settings.editor_mode ? `<div class="edit-tools" style="margin-top:13px">${editButton('edit-product',product.path,'Изменить произведение')}<button class="edit-icon" data-action="edit-header" data-path="${esc(pathKey(product.path))}" title="Заменить header">${svg.image}</button><span class="editor-label">редактирование произведения</span></div>` : ''}
      </div></section>
      <button class="secondary-btn back-btn back-library-btn" data-action="back">${svg.back} Назад к библиотеке</button>
      <div class="season-bar">${product.seasons.length ? `<button class="icon-btn" data-action="scroll-seasons" data-direction="left" aria-label="Предыдущие сезоны">‹</button><div class="season-tabs" id="season-tabs">${seasonTabs}</div><button class="icon-btn" data-action="scroll-seasons" data-direction="right" aria-label="Следующие сезоны">›</button>` : '<span class="page-subtitle">Сезоны не найдены</span>'}</div>
      ${season?.info?.description ? `<p class="season-description">${esc(season.info.description)}</p>` : ''}
      <div class="episode-list">${episodeRows}</div>
      <div class="footer">${esc(product.name)} · Jangle ${APP_VERSION}</div>
    </main>`;
  }
  function displayEpisodeName(filename) {
    return filename.replace(/\.[^.]+$/, '').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function allEpisodes() {
    const output = [];
    for (const category of state.categories) for (const product of category.products) for (const season of product.seasons) {
      for (const episode of season.episodes) output.push({ ...episode, category, product, season });
    }
    return output;
  }
  function findEpisode(key) { return allEpisodes().find(episode => episode.key === key); }
  function renderHistory() {
    const rows = Object.entries(state.history).filter(([,item]) => item && item.path).filter(([key]) => { const ep=findEpisode(key); return ep && canShowCategory(ep.category) && (!ep.category.password || isCategoryUnlocked(ep.category)) && (!hasAgeRestriction(ep.category.ageRestriction) || isCategoryAgeShown(ep.category)) && (!state.settings.child_mode || !hasAgeRestriction(ep.product.info.product_age_restriction)); }).sort((a,b) => (b[1].updated||0) - (a[1].updated||0));
    const html = rows.map(([key,item]) => {
      const episode = findEpisode(key);
      if (!episode) return '';
      const percent = episode.duration ? Math.min(100,Math.round((item.time||0)/episode.duration*100)) : 0;
      return `<div class="history-row" data-action="play-history" data-path="${esc(key)}"><div class="history-icon">${svg.film}</div><div class="history-detail"><strong>${esc(episode.product.name)} — ${esc(displayEpisodeName(episode.name))}</strong><span>${esc(episode.season.name)} · ${formatTime(item.time||0)} из ${formatTime(item.duration||0)} · ${formatDate(item.updated||Date.now())}</span><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div></div><span class="history-percent">${percent}%</span></div>`;
    }).join('');
    return `${renderTopbar()}<main class="page"><button class="back-btn" data-action="back">${svg.back} Назад</button><div class="page-head"><div><p class="eyebrow">ВАШ ПРОСМОТР</p><h1>История</h1><p class="page-subtitle">Продолжайте просмотр с того места, где остановились.</p></div></div>${html ? `<div class="history-list">${html}</div>` : '<div class="empty-state"><strong>История пока пуста</strong>Здесь появятся просмотренные и начатые серии.</div>'}</main>`;
  }
  function renderSearch() {
    const term = state.searchTerm.trim().toLowerCase();
    const results = [];
    if (term) {
      for (const category of state.categories.filter(canShowCategory)) {
        if ((category.password && !isCategoryUnlocked(category)) || (hasAgeRestriction(category.ageRestriction) && !isCategoryAgeShown(category))) continue;
        if (category.name.toLowerCase().includes(term) || category.description.toLowerCase().includes(term)) results.push({ type:'Категория', name:category.name, category, target:'category' });
        for (const product of category.products) {
          if (state.settings.child_mode && hasAgeRestriction(product.info.product_age_restriction)) continue;
          if (product.name.toLowerCase().includes(term) || String(product.info.description||'').toLowerCase().includes(term)) results.push({ type:'Произведение', name:product.name, category, product, target:'product' });
          for (const season of product.seasons) for (const episode of season.episodes) if (episode.name.toLowerCase().includes(term) || displayEpisodeName(episode.name).toLowerCase().includes(term)) results.push({ type:'Серия', name:displayEpisodeName(episode.name), category, product, season, episode, target:'episode' });
        }
      }
    }
    const cards = results.map(result => {
      const product = result.product;
      const poster = product && state.urlCache.get(pathKey(product.posterPath));
      const target = result.target === 'category' ? pathKey(result.category.path) : result.target === 'product' ? pathKey(product.path) : result.episode.key;
      const action = result.target === 'category' ? 'open-category-search' : result.target === 'product' ? 'open-product-search' : 'play-search-result';
      return `<button class="result-card" data-action="${action}" data-path="${esc(target)}">${poster ? `<img class="episode-thumb" style="aspect-ratio:2/3;max-height:210px" src="${esc(poster)}" alt="">` : `<div class="thumb-placeholder" style="aspect-ratio:2/3">${svg.film}</div>`}<div class="result-type">${result.type}</div><div class="result-name">${esc(result.name)}</div>${product ? `<div class="setting-hint" style="margin-top:5px">${esc(product.name)}</div>`:''}</button>`;
    }).join('');
    return `${renderTopbar()}<main class="page"><button class="back-btn" data-action="back">${svg.back} Назад</button><div class="page-head"><div><p class="eyebrow">ПОИСК ПО БИБЛИОТЕКЕ</p><h1>Найти</h1><p class="page-subtitle">По названию произведения или файла серии.</p></div></div><div class="search-box"><input id="search-input" type="search" placeholder="Введите название…" value="${esc(state.searchTerm)}" autocomplete="off"><button class="primary-btn" data-action="clear-search">Очистить</button></div>${cards ? `<div class="search-results">${cards}</div>` : (term ? '<div class="empty-state">Ничего не найдено.</div>' : '<div class="empty-state">Начните вводить название, чтобы найти произведение или серию.</div>')}</main>`;
  }
  function renderSettings() {
    const setting = (key,title,desc) => `<div class="setting-row"><div><div class="setting-label">${title}</div><div class="setting-hint">${desc}</div></div><button class="switch ${state.settings[key]?'on':''}" role="switch" aria-checked="${!!state.settings[key]}" data-action="toggle-setting" data-setting="${key}" aria-label="${title}"></button></div>`;
    const writable = state.libraryMode === 'fs' || state.libraryMode === 'native';
    return `${renderTopbar()}<main class="page"><button class="back-btn" data-action="back">${svg.back} Назад</button><div class="page-head"><div><p class="eyebrow">ПАРАМЕТРЫ ПРИЛОЖЕНИЯ</p><h1>Настройки</h1><p class="page-subtitle">Управляйте просмотром, доступом и самой библиотекой.</p></div></div>
      <div class="settings-grid"><section class="panel"><h2>Настройки</h2>
        ${setting('history_enabled','История просмотра','Сохраняет прогресс каждого видео и показывает быстрый доступ к истории.')}
        ${setting('search_enabled','Поиск','Показывает кнопку поиска по названиям произведений и серий.')}
        ${setting('child_mode','Детский режим','Скрывает категории с паролем и возрастными ограничениями, а также произведения 18+ / 21+.')}
        ${setting('editor_mode','Режим редактора','Показывает элементы графического редактирования. Доступен только на компьютере с мышью.')}
        <div class="settings-actions"><button class="secondary-btn" data-action="change-library">Сменить директорию</button><button class="danger-btn" data-action="reset-history">Сбросить историю</button><button class="danger-btn" data-action="factory-reset">Сброс до заводских настроек</button></div>
        <div class="notice">${writable ? 'Изменения настроек сохраняются в settings/user_settings.md выбранной библиотеки.' : 'Сейчас библиотека открыта в режиме импорта. Изменения будут сохранены только в браузере, а редактор файлов недоступен.'}</div>
      </section><section class="panel"><h2>Система</h2><div class="system-list">
        <div class="system-item"><span>Платформа устройства</span><span>${esc(navigator.platform || deviceName())}</span></div>
        <div class="system-item"><span>ОС</span><span>${esc(deviceName())}</span></div>
        <div class="system-item"><span>Версия</span><span>${APP_VERSION}</span></div>
        <div class="system-item"><span>Кодовое имя</span><span>“${CODE_NAME}”</span></div>
        <div class="system-item"><span>Номер билда</span><span>${BUILD}</span></div>
        <div class="system-item"><span>Библиотека</span><span>${esc(state.rootName || 'Не выбрана')}</span></div>
        <div class="system-item"><span>Режим доступа</span><span>${writable ? 'Чтение и запись' : 'Импорт · только чтение'}</span></div>
        <div class="system-item"><span>Видео в библиотеке</span><span>${allEpisodes().length}</span></div>
      </div><div class="notice">Directbone Interactive 2026, Жуков Александр.</div></section></div></main>`;
  }

  function renderWelcome() {
    return `<main class="welcome"><section class="welcome-card"><div class="brand-mark">J</div><p class="eyebrow">DIRECTBONE INTERACTIVE · 2026</p><h1>Ваш локальный кинотеатр</h1><p>Выберите папку, в которой находится библиотека. Jangle просканирует её структуру и соберёт ваши фильмы и сериалы в удобный каталог.</p><div class="welcome-actions"><button class="primary-btn" data-action="choose-library">Выбрать папку библиотеки</button><button class="secondary-btn" data-action="import-library">Открыть папку в режиме импорта</button></div><p class="welcome-footnote">Для полноценного редактирования файлов используйте Chrome или Edge на компьютере и предоставьте доступ к папке для чтения и записи.</p></section></main>`;
  }

  function renderModal() {
    if (!state.modal) return '';
    const modal = state.modal;
    if (modal.type === 'confirm-age') return `<div class="modal-backdrop"><section class="modal"><div class="eyebrow">ВОЗРАСТНОЕ ОГРАНИЧЕНИЕ</div><h2>Возможно, контент не подходит по возрасту</h2><p>У произведения установлено ограничение ${esc(ageLabel(modal.age))}. Вы хотите продолжить?</p><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">Отмена</button><button class="primary-btn" data-action="confirm-age">ОК, продолжить</button></div></section></div>`;
    if (modal.type === 'edit') {
      const title = modal.kind === 'category' ? 'Редактирование категории' : modal.kind === 'product' ? 'Редактирование произведения' : 'Редактирование сезона';
      return `<div class="modal-backdrop"><section class="modal"><h2>${title}</h2><p>Изменения будут записаны в соответствующий файл метаданных библиотеки.</p><form class="modal-form" data-action="save-edit">
        <label>Название<input name="name" maxlength="180" required value="${esc(modal.values.name||'')}"></label>
        <label>Описание<textarea name="description" maxlength="1600">${esc(modal.values.description||'')}</textarea></label>
        ${modal.kind === 'product' ? `<label>Издатель / студия<input name="publisher" maxlength="180" value="${esc(modal.values.publisher||'')}"></label>`:''}
        ${modal.kind === 'season' ? `<label>Порядок (число)<input name="order" type="number" min="1" step="1" value="${esc(modal.values.order||'')}"></label>`:''}
        <div class="modal-actions"><button class="secondary-btn" type="button" data-action="close-modal">Отмена</button><button class="primary-btn" type="submit">Применить</button></div>
      </form></section></div>`;
    }
    if (modal.type === 'message') return `<div class="modal-backdrop"><section class="modal"><h2>${esc(modal.title||'Подтверждение')}</h2><p>${esc(modal.message||'')}</p><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">Отмена</button><button class="danger-btn" data-action="${esc(modal.confirmAction)}">Продолжить</button></div></section></div>`;
    return '';
  }

  function renderPlayer() {
    const player = state.player;
    if (!player) return '';
    const episode = player.items[player.index];
    const thumb = state.thumbCache.get(episode.key) || '';
    return `<main class="player-page paused" id="player-page"><div class="player-stage ${player.ambient?'ambient':''}" id="player-stage"><div class="player-backdrop" id="player-backdrop" style="${thumb ? `background-image:url('${esc(thumb)}')` : ''}"></div><div class="player-video-wrap" id="player-video-wrap" style="transform:rotate(${player.rotation}deg)"><video id="main-video" class="player-video fit-${player.fit}" playsinline preload="metadata" ${thumb ? `poster="${esc(thumb)}"`:''}></video></div>
        <div class="player-center"><button class="player-center-btn" data-action="player-rewind" aria-label="Назад на 20 секунд">${svg.rewind}</button><button class="player-center-btn main" data-action="player-toggle" aria-label="Воспроизвести или приостановить">${svg.play}</button><button class="player-center-btn" data-action="player-forward" aria-label="Вперёд на 20 секунд">${svg.forward}</button></div>
        <div class="player-top"><button class="icon-btn" data-action="player-back" aria-label="Назад">${svg.back}</button><div class="player-title">${esc(player.product.name)} · ${esc(displayEpisodeName(episode.name))}</div></div>
        <div class="player-controls" id="player-controls"><div class="seek-row"><span class="time-label" id="current-time">0:00</span><input class="timeline" id="player-timeline" type="range" min="0" max="1000" value="0" step="1" aria-label="Позиция видео"><span class="time-label" id="total-time">0:00</span></div>
          <div class="player-buttons"><div class="player-button-group"><button class="player-action" data-action="player-prev" ${player.index===0?'disabled':''} title="Предыдущее видео">${svg.left}<span>Предыдущее</span></button><button class="player-action" data-action="player-next" ${player.index===player.items.length-1?'disabled':''} title="Следующее видео">${svg.right}<span>Следующее</span></button></div>
          <div class="player-button-group"><button class="player-action" data-action="player-rewind">${svg.rewind}<span>−20 сек.</span></button><button class="player-action play-main" data-action="player-toggle">${svg.play}<span>Пауза</span></button><button class="player-action" data-action="player-forward">${svg.forward}<span>+20 сек.</span></button></div>
          <div class="player-button-group"><button class="player-action" data-action="player-settings">${svg.sliders}<span>Поворот</span></button><button class="player-action" data-action="player-ambient">${svg.screen}<span>Подсветка</span></button><button class="player-action" data-action="player-format">${svg.format}<span>Формат</span></button><button class="player-action" data-action="player-fullscreen">${svg.screen}<span>Экран</span></button></div></div></div>
        ${player.settingsOpen ? playerSettingsMarkup() : ''}${player.formatOpen ? playerFormatMarkup() : ''}
      </div></main>`;
  }

  function render() {
    const root = $('#app');
    if (!root) return;
    if (state.route === 'welcome') root.innerHTML = renderWelcome();
    else if (state.route === 'home') root.innerHTML = renderHome();
    else if (state.route === 'product') root.innerHTML = renderProduct();
    else if (state.route === 'settings') root.innerHTML = renderSettings();
    else if (state.route === 'history') root.innerHTML = renderHistory();
    else if (state.route === 'search') root.innerHTML = renderSearch();
    else if (state.route === 'player') root.innerHTML = renderPlayer();
    root.insertAdjacentHTML('beforeend', renderModal());
    if (state.route === 'product') fillEpisodeThumbnails();
    if (state.route === 'player') initPlayerVideo();
    if (state.route === 'search') {
      const input = $('#search-input');
      if (input && state.searchTerm) { input.focus(); input.setSelectionRange(input.value.length,input.value.length); }
    }
  }
  function navigate(route, params = {}) {
    if (state.route === 'player') stopPlayer(false);
    state.stack.push({ route:state.route, selectedProduct:state.selectedProduct, selectedSeason:state.selectedSeason, searchTerm:state.searchTerm });
    Object.assign(state, params);
    state.route = route;
    render();
  }
  function goBack() {
    if (state.modal) { state.modal = null; render(); return; }
    if (state.route === 'player') { stopPlayer(true); return; }
    const previous = state.stack.pop();
    if (!previous) { state.route = 'home'; state.selectedProduct = null; }
    else Object.assign(state, previous);
    render();
  }

  async function chooseLibrary() {
    if (window.JangleNative?.chooseLibrary) {
      try {
        const selected=await window.JangleNative.chooseLibrary();
        if (!selected) return;
        state.libraryMode='native'; state.nativeRootToken=selected.token||null; state.rootName=selected.name||'Локальная библиотека';
        await ensureDirectory(['settings']); await ensureDirectory(['content']);
        try { localStorage.setItem('jangle-native-library',JSON.stringify(selected)); } catch {}
        await loadSettings(); await scanLibrary();
        state.route='home'; state.stack=[]; state.sessionUnlocked.clear(); state.ageRevealed.clear(); state.productAgeConfirmed.clear();
        render(); toast(`Библиотека «${state.rootName}» подключена`); return;
      } catch(error) { toast(`Не удалось открыть библиотеку: ${error.message}`); return; }
    }
    if (!('showDirectoryPicker' in window)) {
      $('#directory-fallback')?.click();
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode:'readwrite', id:'jangle-library' });
      const permission = await handle.requestPermission({ mode:'readwrite' });
      if (permission !== 'granted') { toast('Не предоставлено разрешение на чтение и запись.'); return; }
      state.rootHandle = handle;
      state.libraryMode = 'fs';
      state.rootName = handle.name;
      await ensureDirectory(['settings']);
      await ensureDirectory(['content']);
      await dbSet('library-root', handle).catch(error => console.warn('Не удалось сохранить доступ к папке',error));
      await loadSettings();
      await scanLibrary();
      state.route = 'home'; state.stack = []; state.sessionUnlocked.clear(); state.ageRevealed.clear(); state.productAgeConfirmed.clear();
      render();
      toast(`Библиотека «${state.rootName}» подключена`);
    } catch (error) {
      if (error?.name !== 'AbortError') toast(`Не удалось открыть папку: ${error.message}`);
    }
  }
  function importLibrary() { $('#directory-fallback')?.click(); }
  async function handleImportedFiles(fileList) {
    if (!fileList?.length) return;
    state.importedFiles.clear();
    const first = fileList[0].webkitRelativePath?.split('/')[0] || 'Импортированная библиотека';
    state.rootName = first;
    for (const file of fileList) {
      const parts = (file.webkitRelativePath || file.name).split('/').filter(Boolean);
      const relative = parts.length > 1 ? parts.slice(1) : parts;
      state.importedFiles.set(relative.join('/'), file);
    }
    state.libraryMode = 'import'; state.rootHandle = null; state.sessionUnlocked.clear(); state.ageRevealed.clear(); state.productAgeConfirmed.clear();
    await loadSettings();
    await scanLibrary();
    state.route = 'home'; state.stack = [];
    render();
    toast('Библиотека открыта в режиме импорта (только чтение)');
  }
  async function restoreLibrary() {
    try {
      if (window.JangleNative?.getLibraryInfo) {
        const nativeInfo=await window.JangleNative.getLibraryInfo();
        if (nativeInfo) { state.libraryMode='native'; state.nativeRootToken=nativeInfo.token||null; state.rootName=nativeInfo.name||'Локальная библиотека'; await loadSettings(); await scanLibrary(); state.route='home'; render(); return; }
      }
      const handle = await dbGet('library-root');
      if (!handle) { render(); return; }
      state.rootHandle = handle;
      state.rootName = handle.name;
      if (handle.queryPermission) {
        const permission = await handle.queryPermission({ mode:'readwrite' });
        if (permission === 'granted') {
          state.libraryMode = 'fs';
          await loadSettings(); await scanLibrary();
          state.route = 'home'; render(); return;
        }
      }
      state.route = 'welcome'; render();
      toast('Для доступа к сохранённой библиотеке выберите папку ещё раз.');
    } catch (error) { console.warn(error); render(); }
  }

  function openProduct(path) {
    const found = findProduct(path);
    if (!found) return;
    if (state.settings.child_mode && (!canShowCategory(found.category) || hasAgeRestriction(found.product.info.product_age_restriction))) return;
    if ((found.category.password && !isCategoryUnlocked(found.category)) || (hasAgeRestriction(found.category.ageRestriction) && !isCategoryAgeShown(found.category))) { toast('Сначала откройте категорию.'); return; }
    if (hasAgeRestriction(found.product.info.product_age_restriction) && !state.productAgeConfirmed.has(pathKey(found.product.path))) {
      state.modal = { type:'confirm-age', age:found.product.info.product_age_restriction, productPath:pathKey(found.product.path) };
      render(); return;
    }
    state.selectedProduct = pathKey(found.product.path); state.selectedSeason = 0;
    navigate('product', { selectedProduct:state.selectedProduct, selectedSeason:0 });
  }
  function openProductConfirmed() {
    const pendingEpisodeKey=state.modal?.pendingEpisodeKey;
    const path = state.modal?.productPath;
    state.modal = null;
    if (pendingEpisodeKey) { const episode=findEpisode(pendingEpisodeKey); if (episode?.product) state.productAgeConfirmed.add(pathKey(episode.product.path)); if (episode) startEpisode(episode,[episode]); return; }
    if (!path) return;
    state.productAgeConfirmed.add(path);
    state.selectedProduct = path; state.selectedSeason = 0;
    navigate('product', { selectedProduct:path, selectedSeason:0 });
  }
  function openCategorySearch(path) {
    const category = findCategory(path);
    if (!category) return;
    const el = document.querySelector(`[data-category-path="${CSS.escape(pathKey(category.path))}"]`);
    state.route = 'home'; render();
    requestAnimationFrame(() => {
      const section = document.querySelector(`[data-category-path="${CSS.escape(pathKey(category.path))}"]`);
      section?.scrollIntoView({ behavior:'smooth', block:'center' });
    });
  }

  async function fillEpisodeThumbnails() {
    const productFound = findProduct(state.selectedProduct);
    const season = productFound?.product.seasons[state.selectedSeason];
    if (!season) return;
    // Decode thumbnails one by one to avoid opening dozens of large video files at once.
    for (const episode of season.episodes) {
      if (state.thumbCache.has(episode.key) || state.thumbJobs.has(episode.key)) continue;
      state.thumbJobs.add(episode.key);
      await generateThumbnail(episode).finally(() => state.thumbJobs.delete(episode.key));
    }
  }
  function generateThumbnail(episode) {
    return new Promise(async resolve => {
      let url;
      try { url = await objectUrl(episode.path); } catch { resolve(null); return; }
      const video = document.createElement('video');
      video.muted = true; video.preload = 'metadata'; video.playsInline = true; video.src = url;
      let complete = false;
      const finish = value => {
        if (complete) return; complete = true;
        video.removeAttribute('src'); video.load(); resolve(value);
      };
      const timer = setTimeout(() => finish(null), 9000);
      video.addEventListener('error', () => { clearTimeout(timer); finish(null); }, { once:true });
      video.addEventListener('loadedmetadata', () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const seekTo = duration > 3 ? Math.min(15,Math.max(1,duration*.12)) : 0;
        if (seekTo <= 0.1) { capture(); return; }
        try { video.currentTime = seekTo; } catch { capture(); }
      }, { once:true });
      video.addEventListener('seeked', capture, { once:true });
      function capture() {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = Math.max(180,Math.round(480 * (video.videoHeight || 270) / (video.videoWidth || 854)));
          const context = canvas.getContext('2d');
          context.drawImage(video,0,0,canvas.width,canvas.height);
          const image = canvas.toDataURL('image/jpeg',.72);
          state.thumbCache.set(episode.key,image);
          const encoded = encodeURIComponent(episode.key);
          document.querySelectorAll(`[data-thumb-key="${CSS.escape(encoded)}"]`).forEach(node => {
            if (node.tagName === 'IMG') node.src = image;
            else { const img = document.createElement('img'); img.className='episode-thumb'; img.dataset.thumbKey=encoded; img.src=image; img.alt='Превью серии'; node.replaceWith(img); }
          });
          const row = document.querySelector(`[data-episode-key="${CSS.escape(encoded)}"]`);
          const durationNode = row?.querySelector('.duration');
          if (durationNode && video.duration) durationNode.textContent = formatTime(video.duration);
          finish(image);
        } catch (error) { console.debug('Thumbnail could not be captured',error); finish(null); }
      }
      video.load();
    });
  }

  async function startEpisode(episode, playlist) {
    if (!episode) return;
    const category=episode.category || findProduct(episode.product?.path || state.selectedProduct)?.category;
    const product=episode.product || findProduct(state.selectedProduct)?.product;
    if (state.settings.child_mode && ((category && !canShowCategory(category)) || (product && hasAgeRestriction(product.info.product_age_restriction)))) { toast('Это видео скрыто в детском режиме.'); return; }
    if (category && ((category.password && !isCategoryUnlocked(category)) || (hasAgeRestriction(category.ageRestriction) && !isCategoryAgeShown(category)))) { toast('Сначала откройте категорию.'); return; }
    if (product && hasAgeRestriction(product.info.product_age_restriction) && !state.productAgeConfirmed.has(pathKey(product.path))) { state.modal={type:'confirm-age',age:product.info.product_age_restriction,pendingEpisodeKey:episode.key}; render(); return; }
    const items = playlist || [episode];
    let index = items.findIndex(item => item.key === episode.key);
    if (index < 0) index = 0;
    if (state.route !== 'player') state.stack.push({ route:state.route, selectedProduct:state.selectedProduct, selectedSeason:state.selectedSeason, searchTerm:state.searchTerm });
    state.player = { items, index, product:product || { name:'Видео' }, fit:'stretch', rotation:0, ambient:false, settingsOpen:false, formatOpen:false, lastSaved:0, paused:true, loadToken:1 };
    const playerRef=state.player;
    const loadToken=playerRef.loadToken;
    state.route = 'player';
    render();
    try {
      const url = await objectUrl(episode.path);
      if (state.player!==playerRef || playerRef.loadToken!==loadToken || state.route!=='player') return;
      const video = $('#main-video');
      if (!video) return;
      video.src = url;
      video.load();
      const playResult = video.play();
      if (playResult?.catch) playResult.catch(() => showPlayerControls(true));
      showPlayerControls(true);
      scheduleAutoHide();
    } catch (error) {
      showPlayerError(`Не удалось открыть файл. ${error.message}`);
    }
  }
  async function initPlayerVideo() {
    const video = $('#main-video');
    if (!video || !state.player || video.dataset.bound === 'yes') return;
    video.dataset.bound = 'yes';
    video.addEventListener('loadedmetadata', () => {
      if ($('#main-video')!==video) return;
      $('#total-time').textContent = formatTime(video.duration);
      const episode = state.player?.items[state.player.index];
      const saved = episode && state.history[episode.key];
      if (saved?.time && saved.time < video.duration - 5) video.currentTime = saved.time;
      updateTimeline();
      applyFit();
    });
    video.addEventListener('timeupdate', () => { if ($('#main-video')!==video) return; updateTimeline(); saveCurrentProgress(false); if(state.player?.ambient) updateBackdropFrame(video); });
    video.addEventListener('play', () => { if ($('#main-video')!==video) return; setPlayerPaused(false); scheduleAutoHide(); });
    video.addEventListener('pause', () => { if ($('#main-video')!==video || state.player?.switching) return; setPlayerPaused(true); saveCurrentProgress(true); });
    video.addEventListener('ended', () => { if ($('#main-video')!==video) return; saveCurrentProgress(true); if (state.player.index < state.player.items.length - 1) changeEpisode(1); else setPlayerPaused(true); });
    video.addEventListener('error', () => { if ($('#main-video')!==video) return; showPlayerError('Формат или кодек этого видео не поддерживается встроенным браузерным плеером. Попробуйте MP4 (H.264/AAC) или WebM.'); });
  }
  function showPlayerError(message) {
    const stage = $('#player-stage');
    if (!stage) return;
    let error = $('.player-error',stage);
    if (!error) { error = document.createElement('div'); error.className='player-error'; stage.append(error); }
    error.innerHTML = `<strong>Не удалось воспроизвести видео</strong><p>${esc(message)}</p><button class="secondary-btn" data-action="player-back">Вернуться к списку</button>`;
    setPlayerPaused(true);
  }
  function setPlayerPaused(paused) {
    if (!state.player) return;
    state.player.paused = paused;
    const page = $('#player-page');
    page?.classList.toggle('paused',paused);
    const button = $('.play-main');
    if (button) button.innerHTML = `${paused?svg.play:svg.pause}<span>${paused?'Играть':'Пауза'}</span>`;
    const center = $('.player-center .main');
    if (center) center.innerHTML = paused ? svg.play : svg.pause;
    if (paused) showPlayerControls(true); else scheduleAutoHide();
  }
  function togglePlayback() {
    const video = $('#main-video'); if (!video) return;
    if (video.paused) { video.play().catch(() => showPlayerControls(true)); }
    else video.pause();
    showPlayerControls(true);
  }
  function seekBy(seconds) {
    const video = $('#main-video'); if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0,Math.min(video.duration,video.currentTime+seconds));
    showPlayerControls(true);
  }
  function updateTimeline() {
    const video = $('#main-video'); if (!video) return;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const percent = duration ? (video.currentTime / duration * 100) : 0;
    const timeline = $('#player-timeline');
    if (timeline) { timeline.value = String(Math.round(percent*10)); timeline.style.setProperty('--played',`${percent}%`); }
    const current = $('#current-time'); if (current) current.textContent = formatTime(video.currentTime);
    const total = $('#total-time'); if (total && duration) total.textContent = formatTime(duration);
  }
  let lastBackdropFrame = 0;
  function updateBackdropFrame(video) {
    const now=Date.now(); if(now-lastBackdropFrame<3500 || !video.videoWidth) return; lastBackdropFrame=now;
    try { const canvas=document.createElement('canvas'); canvas.width=320; canvas.height=Math.round(320*video.videoHeight/video.videoWidth); canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height); const backdrop=$('#player-backdrop'); if(backdrop) backdrop.style.backgroundImage=`url("${canvas.toDataURL('image/jpeg',.55)}")`; } catch {}
  }
  function applyFit() {
    const video = $('#main-video'); if (!video || !state.player) return;
    video.classList.remove('fit-stretch','fit-crop','fit-original');
    video.classList.add(`fit-${state.player.fit}`);
    const wrap=$('#player-video-wrap');
    if(wrap){ wrap.style.width=state.player.fit==='original'?'auto':'100vw'; wrap.style.height=state.player.fit==='original'?'auto':'100%'; }
    if (state.player.fit === 'original' && video.videoWidth && video.videoHeight) {
      video.style.width = `${video.videoWidth}px`;
      video.style.height = `${video.videoHeight}px`;
    } else { video.style.width=''; video.style.height=''; }
    $('#player-video-wrap')?.style.setProperty('transform',`rotate(${state.player.rotation}deg)`);
    $('#player-stage')?.classList.toggle('ambient',state.player.ambient);
    $('#player-page')?.classList.toggle('original-mode',state.player.fit==='original');
  }
  function changeEpisode(direction) {
    if (!state.player) return;
    const index = state.player.index + direction;
    if (index < 0 || index >= state.player.items.length) return;
    saveCurrentProgress(true);
    state.player.index = index;
    state.player.switching = true;
    const playerRef=state.player;
    const loadToken=++playerRef.loadToken;
    const episode = playerRef.items[index];
    const old = $('#main-video');
    if (!old) { render(); return; }
    old.pause(); old.removeAttribute('src'); old.load(); old.dataset.bound='';
    render();
    objectUrl(episode.path).then(url => {
      if(state.player!==playerRef || playerRef.loadToken!==loadToken || state.route!=='player') return;
      const video = $('#main-video'); if (!video) return;
      video.src = url; video.load();
      playerRef.switching = false;
      video.play().catch(() => showPlayerControls(true));
      showPlayerControls(true); scheduleAutoHide();
    }).catch(error => { if(state.player===playerRef && playerRef.loadToken===loadToken) { playerRef.switching=false; showPlayerError(error.message); } });
  }
  function saveCurrentProgress(force) {
    if (!state.settings.history_enabled || !state.player) return;
    const video = $('#main-video'); if (!video || !Number.isFinite(video.duration) || !video.duration) return;
    const now = Date.now();
    if (!force && now - state.lastHistoryWrite < 7000) return;
    state.lastHistoryWrite = now;
    const episode = state.player.items[state.player.index];
    state.history[episode.key] = {
      path:episode.key,
      time:video.currentTime,
      duration:video.duration,
      updated:now,
      episode:displayEpisodeName(episode.name),
      product:state.player.items[state.player.index].product?.name || findProduct(state.selectedProduct)?.product.name || ''
    };
    saveSettings();
  }
  function stopPlayer(returnToPage) {
    saveCurrentProgress(true);
    const video = $('#main-video');
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    clearTimeout(state.player?.hideTimer);
    state.player = null;
    if (returnToPage) {
      const previous = state.stack.pop();
      if (previous) Object.assign(state,previous);
      else state.route='home';
    }
    render();
  }
  function showPlayerControls(show) {
    const page = $('#player-page'); if (!page) return;
    page.classList.toggle('controls-hidden',!show);
    if (show) scheduleAutoHide();
  }
  function scheduleAutoHide() {
    if (!state.player) return;
    clearTimeout(state.player.hideTimer);
    const video = $('#main-video');
    if (state.player.settingsOpen || state.player.formatOpen || video?.paused) { $('#player-page')?.classList.remove('controls-hidden'); return; }
    state.player.hideTimer = setTimeout(() => $('#player-page')?.classList.add('controls-hidden'),3500);
  }
  function togglePlayerSettings() {
    if (!state.player) return;
    state.player.settingsOpen=!state.player.settingsOpen;
    if(state.player.settingsOpen){state.player.formatOpen=false;$('.player-format-menu')?.remove();}
    const existing=$('.player-settings');
    if (state.player.settingsOpen && !existing) $('#player-stage')?.insertAdjacentHTML('beforeend',playerSettingsMarkup());
    else existing?.remove();
    showPlayerControls(true);
  }
  function playerSettingsMarkup() {
    const player=state.player;
    if (!player) return '';
    return `<section class="player-settings"><h3>Поворот видео</h3><div class="player-setting"><span>Ориентация</span><div class="setting-options"><button class="option-btn" data-action="player-rotate" data-value="-90">−90°</button><button class="option-btn" data-action="player-rotate" data-value="90">+90°</button><button class="option-btn" data-action="player-rotate" data-value="reset">Сброс</button></div></div></section>`;
  }
  function togglePlayerFormat() {
    if (!state.player) return;
    state.player.formatOpen=!state.player.formatOpen;
    if(state.player.formatOpen){state.player.settingsOpen=false;$('.player-settings')?.remove();}
    const existing=$('.player-format-menu');
    if (state.player.formatOpen && !existing) $('#player-stage')?.insertAdjacentHTML('beforeend',playerFormatMarkup());
    else existing?.remove();
    showPlayerControls(true);
  }
  function playerFormatMarkup() {
    const player=state.player;
    if (!player) return '';
    return `<section class="player-format-menu"><h3>Формат отображения</h3><div class="format-options">${[['stretch','Растягивание','Заполняет экран без сохранения пропорций'],['crop','Экранирование','Заполняет экран с обрезкой краёв'],['original','Оригинал','Исходный размер кадра без увеличения']].map(([value,label,hint]) => `<button class="format-option ${player.fit===value?'active':''}" data-action="player-fit" data-value="${value}"><strong>${label}</strong><span>${hint}</span></button>`).join('')}</div></section>`;
  }

  function openEdit(kind, path) {
    if (state.libraryMode !== 'fs' && state.libraryMode !== 'native') { toast('Для редактора откройте библиотеку с доступом к записи.'); return; }
    let values = {};
    if (kind === 'category') {
      const item = findCategory(path); values = { name:item?.name||'', description:item?.description||'' };
    } else if (kind === 'product') {
      const item = findProduct(path)?.product; values = { name:item?.name||'', description:item?.info.description||'', publisher:item?.info.publisher||'' };
    } else {
      const found = findProduct(state.selectedProduct);
      const item = found?.product.seasons.find(season => pathKey(season.path) === pathKey(path));
      values = { name:item?.name||'', description:item?.info.description||'', order:item?.order||'' };
    }
    state.modal = { type:'edit',kind,path:pathKey(path),values };
    render();
  }
  async function saveEdit(form) {
    if (state.libraryMode !== 'fs' && state.libraryMode !== 'native') throw new Error('Нет доступа на запись');
    const values = Object.fromEntries(new FormData(form).entries());
    const modal = state.modal;
    if (!modal) return;
    let metaPath, meta;
    if (modal.kind === 'category') { metaPath = [...modal.path.split('/'),'category_info.md']; meta = await readMeta(metaPath); meta.name=values.name.trim(); meta.description=values.description.trim(); }
    else if (modal.kind === 'product') { metaPath = [...modal.path.split('/'),'product_info.md']; meta = await readMeta(metaPath); meta.name=values.name.trim(); meta.description=values.description.trim(); meta.publisher=values.publisher.trim(); }
    else { metaPath = [...modal.path.split('/'),'season_info.md']; meta = await readMeta(metaPath); meta.name=values.name.trim(); meta.description=values.description.trim(); if (values.order) meta.order=Number(values.order); else delete meta.order; }
    await writeMeta(metaPath,meta);
    const requestedName=String(values.name||'').trim();
    if (requestedName && requestedName!==modal.path.split('/').at(-1)) {
      try {
        const moved=await moveDirectoryIfSupported(modal.path,requestedName);
        if (moved) {
          const oldPrefix=modal.path; const newPath=[...modal.path.split('/').slice(0,-1),requestedName].join('/');
          if (modal.kind==='product' && state.selectedProduct===oldPrefix) state.selectedProduct=newPath;
          if (modal.kind==='category' && state.selectedProduct?.startsWith(oldPrefix+'/')) state.selectedProduct=newPath+state.selectedProduct.slice(oldPrefix.length);
        }
      } catch(error) { console.debug('Folder rename is not supported in this browser; metadata name is used instead.',error); }
    }
    state.modal = null;
    await scanLibrary(); render(); toast('Изменения сохранены');
  }

  async function moveDirectoryIfSupported(pathString, newName) {
    if (!newName || newName.includes('/') || newName.includes('\\')) return false;
    if (state.libraryMode==='native') return typeof window.JangleNative.rename==='function' ? !!(await window.JangleNative.rename(pathString,newName)) : false;
    if (state.libraryMode!=='fs') return false;
    const path=pathString.split('/');
    const parent=await getDir(path.slice(0,-1));
    const handle=await parent.getDirectoryHandle(path.at(-1));
    if (typeof handle.move!=='function') return false;
    await handle.move(newName);
    return true;
  }

  async function replaceImage(file, path, filename) {
    if (!file || !file.type.startsWith('image/')) throw new Error('Выберите файл изображения');
    const dataUrl = await new Promise((resolve,reject) => {
      const image = new Image(); const url = URL.createObjectURL(file);
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas'); canvas.width=image.naturalWidth; canvas.height=image.naturalHeight;
          canvas.getContext('2d').drawImage(image,0,0);
          canvas.toBlob(blob => { URL.revokeObjectURL(url); blob ? resolve(blob) : reject(new Error('Не удалось обработать изображение')); },'image/png');
        } catch (error) { URL.revokeObjectURL(url); reject(error); }
      };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть изображение')); };
      image.src=url;
    });
    await writeBlob([...path.split('/'),filename],dataUrl);
    const cacheKey = pathKey([...path.split('/'),filename]);
    const old = state.urlCache.get(cacheKey); if (old) URL.revokeObjectURL(old);
    state.urlCache.delete(cacheKey);
    await objectUrl([...path.split('/'),filename]);
    render(); toast(`${filename} обновлён`);
  }
  async function saveOrder(type, parentPath, orderedPaths) {
    if (state.libraryMode !== 'fs') return;
    for (let index=0; index<orderedPaths.length; index++) {
      const path = orderedPaths[index].split('/');
      const metaName = type === 'category' ? 'category_info.md' : 'product_info.md';
      const meta = await readMeta([...path,metaName]);
      meta.order=index+1;
      await writeMeta([...path,metaName],meta);
    }
    await scanLibrary(); render();
  }
  async function reorder(type, sourcePath, targetPath) {
    if (!sourcePath || !targetPath || sourcePath===targetPath) return;
    if (type==='category') {
      const items = [...state.categories]; const from=items.findIndex(x=>pathKey(x.path)===sourcePath), to=items.findIndex(x=>pathKey(x.path)===targetPath);
      if (from<0||to<0) return; const [item]=items.splice(from,1); items.splice(to,0,item); await saveOrder('category','',items.map(x=>pathKey(x.path)));
    } else if (type==='product') {
      const source=findProduct(sourcePath), target=findProduct(targetPath); if (!source||!target||pathKey(source.category.path)!==pathKey(target.category.path)) return;
      const items=[...source.category.products]; const from=items.findIndex(x=>pathKey(x.path)===sourcePath), to=items.findIndex(x=>pathKey(x.path)===targetPath);
      const [item]=items.splice(from,1); items.splice(to,0,item); await saveOrder('product',pathKey(source.category.path),items.map(x=>pathKey(x.path)));
    }
  }

  async function resetHistory() {
    state.history={}; await saveSettings(); state.modal=null; render(); toast('История просмотра очищена');
  }
  async function factoryReset() {
    state.history={}; state.settings={...DEFAULT_SETTINGS};
    localStorage.removeItem(localSettingsKey());
    await saveSettings(); state.modal=null; render(); toast('Настройки сброшены');
  }

  // Single delegated event layer keeps the app easy to extend without external dependencies.
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    try {
      if (action==='choose-library') await chooseLibrary();
      else if (action==='import-library') importLibrary();
      else if (action==='home') { state.route='home'; state.stack=[]; render(); }
      else if (action==='back') goBack();
      else if (action==='settings') navigate('settings');
      else if (action==='history') navigate('history');
      else if (action==='search') { state.searchTerm=''; navigate('search'); }
      else if (action==='change-library') { state.rootHandle=null; state.nativeRootToken=null; state.importedFiles.clear(); localStorage.removeItem('jangle-native-library'); await dbDelete('library-root').catch(()=>{}); state.route='welcome'; state.stack=[]; render(); }
      else if (action==='open-product') { event.stopPropagation(); openProduct(button.dataset.path); }
      else if (action==='open-product-search') openProduct(button.dataset.path);
      else if (action==='open-category-search') openCategorySearch(button.dataset.path);
      else if (action==='play-search-result') { const episode=findEpisode(button.dataset.path); if (episode) startEpisode(episode,[episode]); }
      else if (action==='reveal-category') { state.ageRevealed.add(button.dataset.path); render(); }
      else if (action==='select-season') { state.selectedSeason=Number(button.dataset.index)||0; render(); }
      else if (action==='edit-category') openEdit('category',button.dataset.path);
      else if (action==='edit-product') openEdit('product',button.dataset.path);
      else if (action==='edit-season') openEdit('season',button.dataset.path);
      else if (action==='edit-poster' || action==='edit-header') {
        if (state.libraryMode!=='fs' && state.libraryMode!=='native') { toast('Редактор изображений требует доступ к записи.'); return; }
        const picker=$('#image-picker'); picker.dataset.path=button.dataset.path; picker.dataset.filename=action==='edit-poster'?'poster.png':'header.png'; picker.click();
      }
      else if (action==='play-episode') {
        const found=findProduct(state.selectedProduct); const season=found?.product.seasons[state.selectedSeason]; const episode=season?.episodes[Number(button.dataset.index)];
        if (episode) startEpisode({ ...episode, product:found.product, category:found.category, season },season.episodes.map(item=>({...item,product:found.product,category:found.category,season})));
      }
      else if (action==='play-history') { const episode=findEpisode(button.dataset.path); if (episode) startEpisode(episode,[episode]); }
      else if (action==='scroll-rail') {
        const section=document.querySelector(`[data-category-path="${CSS.escape(button.dataset.path)}"]`); const rail=$('.rail',section); if(rail) rail.scrollBy({left:button.dataset.direction==='left'?-500:500,behavior:'smooth'});
      }
      else if (action==='scroll-seasons') { const tabs=$('#season-tabs'); tabs?.scrollBy({left:button.dataset.direction==='left'?-360:360,behavior:'smooth'}); }
      else if (action==='toggle-setting') {
        const key=button.dataset.setting;
        if (key==='editor_mode' && !state.settings.editor_mode && state.libraryMode!=='fs' && state.libraryMode!=='native') { toast('Для редактора требуется библиотека с доступом к записи.'); return; }
        if (key==='editor_mode' && !state.settings.editor_mode && (matchMedia('(pointer:coarse)').matches || innerWidth<720)) { toast('Режим редактора доступен только на компьютере.'); return; }
        state.settings[key]=!state.settings[key]; await saveSettings(); render();
      }
      else if (action==='reset-history') { state.modal={type:'message',title:'Сбросить историю?',message:'История и сохранённые позиции просмотра всех видео будут удалены.',confirmAction:'confirm-reset-history'}; render(); }
      else if (action==='factory-reset') { state.modal={type:'message',title:'Сброс до заводских настроек?',message:'Будут сброшены история и все параметры приложения. Содержимое вашей библиотеки не изменится.',confirmAction:'confirm-factory-reset'}; render(); }
      else if (action==='confirm-reset-history') await resetHistory();
      else if (action==='confirm-factory-reset') await factoryReset();
      else if (action==='close-modal') { state.modal=null; render(); }
      else if (action==='confirm-age') openProductConfirmed();
      else if (action==='clear-search') { state.searchTerm=''; render(); }
      else if (action==='player-back') stopPlayer(true);
      else if (action==='player-toggle') togglePlayback();
      else if (action==='player-rewind') seekBy(-20);
      else if (action==='player-forward') seekBy(20);
      else if (action==='player-prev') changeEpisode(-1);
      else if (action==='player-next') changeEpisode(1);
      else if (action==='player-settings') togglePlayerSettings();
      else if (action==='player-format') togglePlayerFormat();
      else if (action==='player-fit') { state.player.fit=button.dataset.value; applyFit(); $$('.player-format-menu [data-action="player-fit"]').forEach(el=>el.classList.toggle('active',el.dataset.value===state.player.fit)); showPlayerControls(true); }
      else if (action==='player-rotate') { if(button.dataset.value==='reset') state.player.rotation=0; else state.player.rotation=(state.player.rotation+Number(button.dataset.value)+360)%360; applyFit(); showPlayerControls(true); }
      else if (action==='player-ambient') { state.player.ambient=!state.player.ambient; applyFit(); const ambientButton=$('.player-settings [data-action="player-ambient"]'); if(ambientButton){ambientButton.classList.toggle('active',state.player.ambient);ambientButton.textContent=state.player.ambient?'Включена':'Выключена';} showPlayerControls(true); }
      else if (action==='player-fullscreen') {
        const target=$('#player-page');
        if (!document.fullscreenElement) await target?.requestFullscreen?.(); else await document.exitFullscreen?.();
        showPlayerControls(true);
      }
    } catch (error) { console.error(error); toast(error.message || 'Произошла ошибка'); }
  });

  document.addEventListener('submit', async event => {
    const form=event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const action=form.dataset.action;
    if (!action) return;
    event.preventDefault();
    try {
      if (action==='unlock-category') {
        const category=findCategory(form.dataset.path); const password=new FormData(form).get('password');
        if (category && String(password)===String(category.password)) { state.sessionUnlocked.add(pathKey(category.path)); render(); toast('Категория разблокирована'); }
        else toast('Неверный пароль');
      } else if (action==='save-edit') await saveEdit(form);
    } catch (error) { toast(error.message); }
  });

  document.addEventListener('input', event => {
    if (event.target.id==='search-input') {
      const position=event.target.selectionStart;
      state.searchTerm=event.target.value;
      const root=$('#app');
      const pageScroll=window.scrollY;
      const temp=document.createElement('div'); temp.innerHTML=renderSearch();
      const content=temp.innerHTML; root.innerHTML=content;
      const input=$('#search-input'); if(input){input.focus();input.setSelectionRange(position,position);}
      window.scrollTo(0,pageScroll);
    }
    if (event.target.id==='player-timeline') {
      const video=$('#main-video'); if(video?.duration) video.currentTime=video.duration*(Number(event.target.value)/1000);
      showPlayerControls(true);
    }
  });
  document.addEventListener('change', async event => {
    if (event.target.id==='directory-fallback') {
      try { await handleImportedFiles(event.target.files); } catch(error) { toast(error.message); }
      event.target.value='';
    }
    if (event.target.id==='image-picker') {
      const file=event.target.files?.[0];
      try { if(file) await replaceImage(file,event.target.dataset.path,event.target.dataset.filename); }
      catch(error) { toast(error.message); }
      event.target.value='';
    }
  });

  document.addEventListener('keydown', event => {
    if (state.route==='player') {
      const tag=event.target?.tagName?.toLowerCase();
      if (tag==='input' || tag==='textarea' || tag==='button' || tag==='a' || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code==='Space') { event.preventDefault(); togglePlayback(); showPlayerControls(true); }
      else if (event.code==='ArrowLeft') { event.preventDefault(); seekBy(-20); }
      else if (event.code==='ArrowRight') { event.preventDefault(); seekBy(20); }
      else if (event.code==='Escape') { event.preventDefault(); stopPlayer(true); }
    } else if (event.key==='Escape' && state.modal) { state.modal=null; render(); }
  });
  document.addEventListener('pointermove', event => {
    if (state.route!=='player') return;
    showPlayerControls(true);
  }, { passive:true });
  document.addEventListener('touchstart', () => { if(state.route==='player') showPlayerControls(true); }, { passive:true });

  document.addEventListener('dragstart', event => {
    const item=event.target.closest('[data-drag-type]');
    if (!item || !state.settings.editor_mode) return;
    state.drag={type:item.dataset.dragType,path:item.dataset.dragType==='category'?item.dataset.categoryPath:item.dataset.path};
    item.classList.add('dragging');
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',state.drag.path);
  });
  document.addEventListener('dragover', event => {
    if (!state.drag) return;
    const item=state.drag.type==='category' ? event.target.closest('section[data-drag-type="category"]') : event.target.closest('.poster-card[data-drag-type="product"]');
    if (item) { event.preventDefault(); $$('.drop-target').forEach(el=>el.classList.remove('drop-target')); item.classList.add('drop-target'); }
  });
  document.addEventListener('drop', async event => {
    if (!state.drag) return;
    event.preventDefault();
    const item=state.drag.type==='category' ? event.target.closest('section[data-drag-type="category"]') : event.target.closest('.poster-card[data-drag-type="product"]');
    const target=state.drag.type==='category' ? item?.dataset.categoryPath : item?.dataset.path;
    const source=state.drag.path, type=state.drag.type;
    state.drag=null; $$('.dragging,.drop-target').forEach(el=>el.classList.remove('dragging','drop-target'));
    if (target) { try { await reorder(type,source,target); } catch(error) { toast(error.message); } }
  });
  document.addEventListener('dragend', () => { state.drag=null; $$('.dragging,.drop-target').forEach(el=>el.classList.remove('dragging','drop-target')); });

  window.addEventListener('beforeunload', () => {
    if (state.route==='player') saveCurrentProgress(true);
    for (const url of state.urlCache.values()) URL.revokeObjectURL(url);
  });
  window.addEventListener('resize', () => { if(state.route==='player') applyFit(); });
  if ('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }

  render();
  restoreLibrary();
})();
