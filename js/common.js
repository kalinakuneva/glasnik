function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u0305\u0307-\u036f]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .trim();
}

function matchesQuery(fields, query) {
  const q = normalize(query);
  if (q === "") return true;
  return fields.some(function (field) {
    return normalize(field).includes(q);
  });
}

function highlight(text, query) {
  const original = String(text || "");
  const q = normalize(query).normalize("NFD");
  if (q === "") return escapeHtml(original);

  const decomposed = original.normalize("NFD");
  let plain = "";
  const map = [];
  for (let i = 0; i < decomposed.length; i++) {
    if (/[\u0300-\u0305\u0307-\u036f]/.test(decomposed[i])) continue;
    plain += decomposed[i].toLowerCase();
    map.push(i);
  }

  let result = "";
  let last = 0;
  let from = 0;
  let found;
  while (q && (found = plain.indexOf(q, from)) !== -1) {
    if (plain[found + q.length] === "\u0306") { from = found + 1; continue; }
    const start = map[found];
    const endIndex = found + q.length;
    const end = endIndex < map.length ? map[endIndex] : decomposed.length;
    result += escapeHtml(decomposed.slice(last, start)) +
              "<mark>" + escapeHtml(decomposed.slice(start, end)) + "</mark>";
    last = end;
    from = endIndex;
  }
  result += escapeHtml(decomposed.slice(last));
  return result.normalize("NFC");
}

function centuryOf(year) {
  const number = Math.ceil(parseInt(year, 10) / 100);
  const roman = { 16: "XVI", 17: "XVII", 18: "XVIII", 19: "XIX", 20: "XX", 21: "XXI" };
  return roman[number] || "";
}

function getCheckedValues(name) {
  const boxes = document.querySelectorAll('input[name="' + name + '"]:checked');
  return Array.from(boxes).map(function (box) {
    return box.value;
  });
}

function findCommunityByName(name) {
  return communities.find(function (c) {
    return c.name === name;
  });
}

function countTextsFor(placeName) {
  return texts.filter(function (t) { return t.place === placeName; }).length;
}

function countArchiveFor(placeName) {
  return archiveItems.filter(function (a) { return a.place === placeName; }).length;
}

function fillSelect(selectElement, values) {
  values.forEach(function (value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
}

function uniqueValues(list, key) {
  const values = list.map(function (item) { return item[key]; });
  return Array.from(new Set(values)).sort(function (a, b) {
    return String(a).localeCompare(String(b), "bg");
  });
}

function shortName(fullName) {
  const parts = fullName.split(",");
  if (parts.length < 2) return fullName;
  const initials = parts[1].trim().split(/\s+/).map(function (word) {
    return word.charAt(0) + ".";
  }).join(" ");
  return parts[0].trim() + ", " + initials;
}

function formatCitation(source) {
  const isCyrillic = /[а-яА-Я]/.test(source.title);
  let who = source.authors.map(shortName).join(", ");
  if (!who && source.editors.length) {
    who = source.editors.map(shortName).join(", ") + (isCyrillic ? " (съст.)" : " (eds.)");
  }

  let text = (who ? who + " " : "") + "(" + (source.year || "б.г.") + "). " + source.title + ".";

  if (source.container) {
    text += (isCyrillic ? " В: " : " In: ") + source.container;
    if (source.volume) text += ", " + source.volume;
    if (source.issue) text += "(" + source.issue + ")";
    text += ".";
  }
  if (source.pages) text += (isCyrillic ? " С. " : " Pp. ") + source.pages + ".";
  if (source.place || source.publisher) {
    text += " " + [source.place, source.publisher].filter(Boolean).join(": ") + ".";
  }
  if (source.doi) text += " DOI: " + source.doi;
  return text.trim();
}

function addBaseMap(map) {
  const esri = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 18,
      attribution: 'Карта &copy; <a href="https://www.esri.com/">Esri</a>, данни &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  );
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  let errors = 0;
  esri.on("tileerror", function () {
    errors++;
    if (errors === 3 && map.hasLayer(esri)) {
      map.removeLayer(esri);
      osm.addTo(map);
    }
  });
  esri.addTo(map);
}

const icons = {
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l8-8"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14.5c3 0 6 2 6 5.5"/></svg>',
  language: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/></svg>'
};

function placeholderHtml(type, label) {
  const iconByType = {
    "Снимка": icons.photo,
    "Карта": icons.map,
    "Книга": icons.book
  };
  const icon = iconByType[type] || icons.document;
  return '<div class="image-placeholder" role="img" aria-label="' + escapeHtml(label) + '">' +
           '<span class="placeholder-label">' + icon + '<span>' + escapeHtml(type) + '</span></span>' +
         '</div>';
}

const navItems = [
  { page: "home",        href: "index.html",       label: "Начало" },
  { page: "communities", href: "communities.html", label: "Общности" },
  { page: "map",         href: "map.html",         label: "Карта" },
  { page: "texts",       href: "texts.html",       label: "Текстове" },
  { page: "dictionary",  href: "dictionary.html",  label: "Речник" },
  { page: "archive",     href: "archive.html",     label: "Архив" },
  { page: "bibliography", href: "bibliography.html", label: "Библиография" },
  { page: "about",       href: "about.html",       label: "За проекта" }
];

function renderHeader() {
  const placeholder = document.getElementById("site-header");
  if (!placeholder) return;

  const currentPage = document.body.dataset.page;

  const links = navItems.map(function (item) {
    const isActive = item.page === currentPage;
    return '<li><a href="' + item.href + '"' +
           (isActive ? ' class="active" aria-current="page"' : '') + '>' +
           item.label + '</a></li>';
  }).join("");

  placeholder.outerHTML =
    '<header class="site-header">' +
      '<div class="container header-inner">' +
        '<a class="brand" href="index.html" aria-label="Гласник — начало">' +
          '<img class="brand-logo" src="assets/images/logo.png" width="60" height="60" alt="Лого на конференцията „Бесарабски и банатски българи в исторически и съвременен контекст“ (2026)">' +
          '<span class="brand-text">' +
            '<span class="brand-name">Гласник</span>' +
            '<span class="brand-tagline">Дигитална платформа за банатските и бесарабските българи</span>' +
          '</span>' +
        '</a>' +
        '<nav class="main-nav" id="main-nav" aria-label="Основна навигация"><ul>' + links + '</ul></nav>' +
        '<div class="header-tools">' +
          '<button type="button" class="icon-btn" id="search-toggle" aria-label="Търсене" aria-expanded="false" aria-controls="header-search">' + icons.search + '</button>' +
          '<span class="lang" title="Български език">BG</span>' +
          '<button type="button" class="icon-btn menu-toggle" id="menu-toggle" aria-label="Отвори менюто" aria-expanded="false" aria-controls="main-nav">' + icons.menu + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="header-search" id="header-search" hidden>' +
        '<div class="container">' +
          '<form class="search-form" action="texts.html" method="get" role="search">' +
            '<label class="visually-hidden" for="header-q">Търсене в платформата</label>' +
            '<input class="input" type="search" id="header-q" name="q" placeholder="Търсене в текстове, общности, речник и архив…">' +
            '<button class="btn btn-primary" type="submit">Търси</button>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</header>';
}

function renderFooter() {
  const placeholder = document.getElementById("site-footer");
  if (!placeholder) return;

  placeholder.outerHTML =
    '<footer class="site-footer">' +
      '<div class="container">' +
        '<div class="footer-inner">' +
          '<div class="footer-brand">' +
            '<span class="brand-name">Гласник</span>' +
            '<span class="muted small">Дигитална платформа за банатските и бесарабските българи</span>' +
          '</div>' +
          '<ul class="footer-links">' +
            '<li><a href="about.html">За проекта</a></li>' +
            '<li><a href="about.html#methodology">Методология</a></li>' +
            '<li><a href="about.html#contacts">Контакти</a></li>' +
          '</ul>' +
        '</div>' +
        '<div class="footer-bottom">Демонстрационен прототип за научно представяне.</div>' +
      '</div>' +
    '</footer>';
}

function setupHeaderButtons() {
  const menuButton = document.getElementById("menu-toggle");
  const nav = document.getElementById("main-nav");
  const searchButton = document.getElementById("search-toggle");
  const searchPanel = document.getElementById("header-search");

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Затвори менюто" : "Отвори менюто");
      menuButton.innerHTML = isOpen ? icons.close : icons.menu;
    });
  }

  if (searchButton && searchPanel) {
    searchButton.addEventListener("click", function () {
      const willOpen = searchPanel.hidden;
      searchPanel.hidden = !willOpen;
      searchButton.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        document.getElementById("header-q").focus();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (nav && nav.classList.contains("open")) menuButton.click();
    if (searchPanel && !searchPanel.hidden) searchButton.click();
  });
}

renderHeader();
renderFooter();
setupHeaderButtons();
