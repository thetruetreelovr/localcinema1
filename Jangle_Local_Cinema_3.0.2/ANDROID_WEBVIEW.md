# Контракт интеграции Android WebView (для будущего APK)

Само веб-приложение не требует сервера, но браузерный File System Access API не следует считать доступным во всех Android WebView. Для APK нужен небольшой нативный адаптер на Android Storage Access Framework (SAF).

## Рекомендуемая схема

1. В Android открыть `ACTION_OPEN_DOCUMENT_TREE` и получить URI дерева каталога.
2. Сохранить URI-разрешения через `takePersistableUriPermission`.
3. До загрузки `js/app.js` предоставить объект-мост `window.JangleNative` через безопасный JavaScript interface или WebMessage bridge. Приложение автоматически проверяет этот объект и использует его вместо браузерного File System Access API.
4. В мосте реализовать операции: выбор корня, перечисление элементов каталога, чтение текстовых файлов, чтение видеопотока, создание/перезапись текстовых файлов и изображений.
5. Для воспроизведения предпочтительно отдавать медиапоток нативному WebView через поддерживаемый `content://` URI либо локальный `WebResourceResponse`; не копировать большие видео в память JS.

## Минимальный контракт, который должен предоставить нативный слой

```javascript
window.JangleNative = {
  // Возвращает информацию о сохранённой библиотеке или null.
  getLibraryInfo: async () => ({ name: "My Library", token: "persisted-tree-token" }),

  // Показывает SAF picker и возвращает root token + display name.
  chooseLibrary: async () => ({ name: "My Library", token: "persisted-tree-token" }),

  // Список непосредственных дочерних элементов пути относительно root.
  list: async (relativePath) => [
    { name: "content", kind: "directory" },
    { name: "settings", kind: "directory" }
  ],

  // Текст файла и бинарный файл. Для видео возвращай { uri: 'content://...' },
  // для небольших файлов допускается вернуть Blob. Не кодируй большие видео в base64.
  readText: async (relativePath) => "...",
  readFile: async (relativePath) => ({ uri: "content://..." }),
  writeText: async (relativePath, text) => true,
  writeFile: async (relativePath, bytes, mimeType) => true,
  createDirectory: async (relativePath) => true,
  rename: async (relativePath, newName) => true
};
```

Это спецификация будущего моста, а не уже подключённый Android-код. Нативный адаптер должен проверять URI-разрешения, обрабатывать отмену выбора каталога и корректно закрывать дескрипторы файлов. Не следует выставлять в JavaScript произвольные методы доступа к файловой системе или выполнять переданные из веб-страницы команды оболочки.
