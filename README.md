# Гласник - прототип

Дигитална платформа за банатските и бесарабските българи.
Чист HTML, CSS и JavaScript - без сървър, база данни и инсталация на пакети.

## Стартиране

1. Отворете папката `glasnik` във VS Code (File → Open Folder…).
2. Инсталирайте разширението **Live Server** (Extensions → търсете „Live Server“ от Ritwick Dey).
3. Десен бутон върху `index.html`.
4. Изберете **Open with Live Server** — сайтът се отваря в браузъра.

Нужна е интернет връзка за картата (Leaflet и OpenStreetMap се зареждат от интернет).
Без интернет всичко останало работи, само картите остават празни.

## Структура

```
index.html          Начална страница
map.html            Интерактивна карта
communities.html    Общности (детайли: communities.html?id=1)
texts.html          Текстове и корпус (търсене: texts.html?q=преселение)
archive.html        Архив (запис: archive.html?id=1)
dictionary.html     Речник (дума: dictionary.html?word=шиник)
bibliography.html   Библиография от Zotero (запис: bibliography.html?id=КЛЮЧ)
about.html          За проекта

css/style.css       Целият дизайн; цветовете са в :root най-горе
js/data.js          Данни за общности, текстове, архив и речник
js/sources.js       Библиографията (генерирана от Zotero)
js/bibliography.js  Търсене, филтри и цитиране в библиографията
js/common.js        Header, footer, мобилно меню, помощни функции
js/home.js          Малката карта на началната страница
js/map.js           Картата, филтрите и търсенето по нея
js/communities.js   Списък и детайлен изглед на общностите
js/texts.js         Търсене и филтри в текстовете
js/archive.js       Филтри и модален прозорец в архива
js/dictionary.js    Търсене в речника
assets/images/      Място за бъдещи изображения
tools/              Скрипт за превръщане на Zotero CSV в js/sources.js
```

## Как да редактирате

- **Нова общност, текст, архивен запис или дума** — отворете `js/data.js`, копирайте
  съществуващ обект, сменете стойностите. Полето `place` на текстовете, архива и речника
  трябва да съвпада с `name` на някоя общност — така материалът се появява на картата
  и в страницата на общността.
- **Цветове и шрифтове** — променливите в началото на `css/style.css`.
- **Меню и footer** — в `js/common.js` (масивът `navItems` и функциите `renderHeader` / `renderFooter`).

Всички данни са примерни и служат само за демонстрация. Координатите са приблизителни.

## Обновяване на библиографията от Zotero

1. В Zotero (zotero.org → група Glasnik) маркирайте всички записи → Export → CSV.
2. С инсталиран Python изпълнете в папката на проекта:
   `python3 tools/zotero_to_js.py export-data.csv js/sources.js`
3. Качете новия `js/sources.js` в GitHub.

Линковете към пълни текстове, които ги няма в Zotero, се пазят в `tools/extra_links.json`
и се добавят автоматично при всяко генериране на `js/sources.js`.

## Речник (TEI XML)

Речникът се пази като TEI XML в `data/` (засега `data/ternovka.xml`, З. Барболова, TEI: А. Бояджиев, CC BY-SA 4.0).
Сайтът не чете XML директно, а генериран файл `js/dictionary-data.js`:

```bash
python3 tools/tei_dictionary_to_js.py data/ternovka.xml js/dictionary-data.js "Терновка"
```

(нужен е `pip install lxml`). Скриптът извежда предупреждения за препратки към още невъведени статии.

`xslt/glasnik-dictionary.xsl` е XSLT 1.0 за eXist-db/xsltproc, който дава чист HTML с класовете на сайта
(параметри `standalone`, `css`, `entry`).
