/* =========================================================
   Гласник — библиография
   ---------------------------------------------------------
   Данните са в js/sources.js (генерирани от Zotero).
   bibliography.html?q=Брага        → попълва търсенето
   bibliography.html?topic=Банат    → отмята темата
   ========================================================= */

const bibSearch = document.getElementById("bib-search");
const bibSort = document.getElementById("bib-sort");
const bibList = document.getElementById("bib-list");


/* ---------- Обобщение най-горе ---------- */

(function renderStats() {
  const years = sources.map(function (s) { return s.year; }).filter(Boolean);
  const primary = sources.filter(function (s) { return s.kind === "Извор"; }).length;
  const authors = new Set();
  sources.forEach(function (s) { s.authors.forEach(function (a) { authors.add(a); }); });

  const stats = [
    [sources.length, "записа"],
    [primary, "исторически извора"],
    [authors.size, "автори"],
    [Math.min.apply(null, years) + "–" + Math.max.apply(null, years), "години на издаване"]
  ];
  document.getElementById("bib-stats").innerHTML = stats.map(function (item) {
    return '<li><strong>' + item[0] + '</strong> ' + item[1] + '</li>';
  }).join("");
})();


/* ---------- Списък ---------- */

function sortSources(list) {
  const mode = bibSort.value;
  return list.slice().sort(function (a, b) {
    if (mode === "author") {
      const nameA = a.authors[0] || a.editors[0] || a.title;
      const nameB = b.authors[0] || b.editors[0] || b.title;
      return nameA.localeCompare(nameB, "bg");
    }
    const diff = (a.year || 0) - (b.year || 0);
    return mode === "year-desc" ? -diff : diff;
  });
}

function sourceHtml(s, query) {
  const who = s.authors.length
    ? s.authors.join("; ")
    : (s.editors.length ? s.editors.join("; ") + " (съст.)" : "");

  // Сборник/списание, том, брой, страници
  let where = "";
  if (s.container) {
    where = s.container;
    if (s.volume) where += ", т. " + s.volume;
    if (s.issue) where += ", бр. " + s.issue;
  }
  if (s.pages) where += (where ? ", " : "") + "с. " + s.pages;
  const imprint = [s.place, s.publisher].filter(Boolean).join(": ");

  const links = [];
  if (s.doi) links.push('<a class="btn btn-outline btn-small" href="https://doi.org/' + escapeHtml(s.doi) + '" target="_blank" rel="noopener">DOI</a>');
  if (s.url) links.push('<a class="btn btn-outline btn-small" href="' + escapeHtml(s.url) + '" target="_blank" rel="noopener">Отвори онлайн</a>');
  s.places.forEach(function (placeName) {
    const community = findCommunityByName(placeName);
    if (community) {
      links.push('<a class="btn btn-outline btn-small" href="communities.html?id=' + community.id + '">Общност: ' + escapeHtml(placeName) + '</a>');
    }
  });

  const tags = s.tags.map(function (tag) {
    return '<li><button type="button" class="tag" data-tag="' + escapeHtml(tag) + '">' + highlight(tag, query) + '</button></li>';
  }).join("");

  return '<li class="card bib-item" id="src-' + s.id + '">' +
    '<div class="bib-badges">' +
      '<span class="badge">' + escapeHtml(s.type) + '</span>' +
      '<span class="badge' + (s.kind === "Извор" ? ' badge-primary-source' : ' badge-neutral') + '">' + escapeHtml(s.kind) + '</span>' +
      '<span class="badge badge-neutral">' + escapeHtml(s.topic) + '</span>' +
      '<span class="bib-year">' + (s.year || "б.г.") + '</span>' +
    '</div>' +
    (who ? '<p class="bib-authors">' + highlight(who, query) + '</p>' : '') +
    '<h3 class="bib-title">' + highlight(s.title, query) + '</h3>' +
    (s.translatedTitle ? '<p class="bib-translated">' + highlight(s.translatedTitle, query) + '</p>' : '') +
    (where ? '<p class="bib-meta">' + highlight(where, query) + '</p>' : '') +
    (imprint ? '<p class="bib-meta">' + highlight(imprint, query) + '</p>' : '') +
    (s.abstract
      ? '<details class="bib-abstract"><summary>Резюме</summary><p>' + highlight(s.abstract, query) + '</p></details>'
      : '') +
    (tags ? '<ul class="tag-list" aria-label="Ключови думи" style="margin-top: 12px;">' + tags + '</ul>' : '') +
    '<div class="card-footer">' +
      '<button type="button" class="btn btn-primary btn-small" data-cite="' + s.id + '">Копирай цитат</button>' +
      links.join("") +
    '</div>' +
  '</li>';
}

function renderBibliography() {
  const query = bibSearch.value.trim();
  const topics = getCheckedValues("bib-topic");
  const kinds = getCheckedValues("bib-kind");
  const types = getCheckedValues("bib-type");

  const filtered = sources.filter(function (s) {
    return matchesQuery([
      s.title, s.translatedTitle, s.authors.join(" "), s.editors.join(" "),
      s.container, s.publisher, s.place, s.abstract, s.tags.join(" "), s.year
    ], query) &&
      (topics.length === 0 || topics.includes(s.topic)) &&
      (kinds.length === 0 || kinds.includes(s.kind)) &&
      (types.length === 0 || types.includes(s.type));
  });

  document.getElementById("bib-count").textContent =
    "Показани записи: " + filtered.length + " от " + sources.length;

  if (filtered.length === 0) {
    bibList.innerHTML = '<li class="empty-state">Няма записи, които отговарят на търсенето.</li>';
    return;
  }
  bibList.innerHTML = sortSources(filtered).map(function (s) {
    return sourceHtml(s, query);
  }).join("");
}


/* ---------- Копиране на цитат ---------- */

function copyText(text, button) {
  const done = function () {
    const original = button.textContent;
    button.textContent = "Копирано ✓";
    setTimeout(function () { button.textContent = original; }, 1500);
  };

  // Резервен вариант, ако сайтът е отворен директно от файл
  // или браузърът не разреши достъп до клипборда
  const fallback = function () {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    done();
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else {
    fallback();
  }
}


/* ---------- Събития ---------- */

bibSearch.addEventListener("input", renderBibliography);
bibSort.addEventListener("change", renderBibliography);
document.querySelectorAll(".filters-panel input[type=checkbox]").forEach(function (box) {
  box.addEventListener("change", renderBibliography);
});

document.getElementById("reset-bib").addEventListener("click", function () {
  bibSearch.value = "";
  document.querySelectorAll(".filters-panel input[type=checkbox]").forEach(function (box) {
    box.checked = false;
  });
  renderBibliography();
});

bibList.addEventListener("click", function (event) {
  const citeButton = event.target.closest("[data-cite]");
  if (citeButton) {
    const source = sources.find(function (s) { return s.id === citeButton.dataset.cite; });
    copyText(formatCitation(source), citeButton);
    return;
  }
  const tagButton = event.target.closest("[data-tag]");
  if (tagButton) {
    bibSearch.value = tagButton.dataset.tag;
    renderBibliography();
    bibSearch.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});


/* ---------- Старт ---------- */

const startQuery = getQueryParam("q");
if (startQuery) bibSearch.value = startQuery;

const startTopic = getQueryParam("topic");
if (startTopic) {
  const box = document.querySelector('input[name="bib-topic"][value="' + startTopic + '"]');
  if (box) box.checked = true;
}

renderBibliography();

// bibliography.html?id=KLUCH → превърта до записа
const startId = getQueryParam("id");
if (startId) {
  const target = document.getElementById("src-" + startId);
  if (target) {
    target.classList.add("bib-item-target");
    target.scrollIntoView({ block: "center" });
  }
}
