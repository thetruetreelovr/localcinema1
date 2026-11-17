# Интеграция Android WebView и Storage Access Framework

В этом архиве нативная интеграция уже реализована в проекте `android/`. Это не только описание контракта: исходники Kotlin, Gradle-конфигурация и копия веб-приложения находятся внутри Android-проекта.

## Как устроен доступ

1. Android вызывает `ACTION_OPEN_DOCUMENT_TREE` — системный SAF-выбор папки.
2. После выбора приложение сохраняет постоянное разрешение через `takePersistableUriPermission`.
3. `js/android-adapter.js` подключается перед `js/app.js` и преобразует Android-мост в объект `window.JangleNative`, который уже использует основное приложение.
4. `AndroidLibraryBridge.kt` ограничивает операции только выбранным деревом: перечисляет элементы, читает `.md`, сохраняет настройки/изображения, создаёт каталоги и переименовывает элементы.
5. Видео не копируется в JavaScript и не кодируется в Base64. WebView получает внутренний URL, а `MainActivity.kt` обслуживает его через `ContentResolver`, в том числе запросы HTTP byte-range для перемотки.

## Имена методов JavaScript-моста

`window.JangleAndroidBridge` предоставляет `getLibraryInfo`, `requestLibrary`, `list`, `readText`, `getMediaUrl`, `writeText`, `writeFileBase64`, `createDirectory` и `rename`. Результат выбора папки возвращается callback-функции `window.JangleAndroidBridgeCallback`. Веб-адаптер находится в `js/android-adapter.js`.

## Использование

Откройте папку `android/` в Android Studio и соберите APK. Не удаляйте `android/app/src/main/assets/www/js/android-adapter.js`: он связывает существующий интерфейс с Android SAF.

Сторонний Web-to-APK-конвертер должен предоставлять эквивалентный нативный мост и запускать JS-интерфейс с именем `JangleAndroidBridge`. Если конструктор умеет только показывать URL/HTML внутри стандартного WebView, у него нет доступа к SAF-выбору каталога. В таком случае используйте включённый Android Studio-проект.

## Ограничения Android

Android сам ограничивает отдельные места, которые можно выбрать через SAF. На Android 11+ нельзя выбрать корень внутреннего общего хранилища, папку `Download/`, а также `Android/data/` и `Android/obb/`. Пользователь выбирает доступную папку-библиотеку, а приложение получает доступ к её содержимому и подпапкам.
