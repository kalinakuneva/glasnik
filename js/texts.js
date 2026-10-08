/* =========================================================
   Гласник — текстове и корпус
   ---------------------------------------------------------
   Търсене в: заглавие, откъс, ключови думи, място.
   texts.html?q=преселение → търсенето се пуска автоматично.
   ========================================================= */

const searchField = document.getElementById("text-search");
const regionSelect = document.getElementById("filter-region");
const genreSelect = document.getElementById("filter-genre");
const periodSelect = document.getElementById("filter-period");
const varietySelect = document.getElementById("filter-variety");
const resultsBox = document.getElementById("text-results");

let activeCategory = "all";

// Попълваме падащите менюта от данните
fillSelect(regionSelect, uniqueValues(texts, "region"));
fillSelect(genreSelect, uniqueValues(texts, "type"));
fillSelect(varietySelect, uniqueValues(texts, "variety"));


function renderTexts() {
  const query = searchField.value.trim();

  const filtered = texts.filter(function (t) {
    return (activeCategory === "all" || t.category === activeCategory) &&
           matchesQuery([t.title, t.excerpt, t.place, t.keywords.join(" "), t.source || ""], query) &&
           (regionSelect.value === "" || t.region === regionSelect.value) &&
           (genreSelect.value === "" || t.type === genreSelect.value) &&
           (periodSelect.value === "" || centuryOf(t.year) === periodSelect.value) &&
           (varietySelect.value === "" || t.variety === varietySelect.value);
  });

  // Брояч
  let countText = "Намерени текстове: " + filtered.length;
  if (query !== "") countText += " за „" + query + "“";
  document.getElementById("text-count").textContent = countText;

  renderOtherResults(query);

  if (filtered.length === 0) {
    resultsBox.innerHTML =
      '<div class="empty-state">Няма текстове, които отговарят на търсенето. Опитайте с друга дума или изчистете филтрите.</div>';
    return;
  }

  resultsBox.innerHTML = filtered.map(function (t) {
    const keywordButtons = t.keywords.map(function (k) {
      return '<li><button type="button" class="tag" data-keyword="' + escapeHtml(k) + '">' + highlight(k, query) + '</button></li>';
    }).join("");

    const community = findCommunityByName(t.place);
    const communityLink = community
      ? '<a class="btn btn-outline btn-small" href="communities.html?id=' + community.id + '">Общност: ' + escapeHtml(community.name) + '</a>'
      : '';

    return '<article class="card text-card">' +
             '<span class="badge">' + escapeHtml(t.type) + '</span>' +
             '<h3 style="margin-top: 10px;">' + highlight(t.title, query) + '</h3>' +
             '<p class="card-meta">' + highlight(t.place, query) + ', ' + escapeHtml(t.region) +
               ' · ' + t.year + ' · ' + escapeHtml(t.variety) + '</p>' +
             '<p class="excerpt">„' + highlight(t.excerpt, query) + '“</p>' +
             (t.source
               ? '<p class="text-source">Източник: ' + escapeHtml(t.source) +
                 (t.sourceUrl ? ' · <a href="' + escapeHtml(t.sourceUrl) + '" target="_blank" rel="noopener">виж страницата ↗</a>' : '') + '</p>'
               : '') +
             '<ul class="tag-list" aria-label="Ключови думи">' + keywordButtons + '</ul>' +
             '<div class="card-footer">' +
               '<a class="btn btn-outline btn-small" href="map.html?q=' + encodeURIComponent(t.title) + '">Покажи на картата</a>' +
               communityLink +
             '</div>' +
           '</article>';
  }).join("");
}


// Показва колко съвпадения има и в другите раздели на платформата
function renderOtherResults(query) {
  const box = document.getElementById("other-results");
  if (query === "") {
    box.hidden = true;
    return;
  }

  const inCommunities = communities.filter(function (c) {
    return matchesQuery([c.name, c.description, c.history, c.culture, c.language], query);
  }).length;
  const inArchive = archiveItems.filter(function (a) {
    return matchesQuery([a.title, a.description, a.place, a.keywords.join(" ")], query);
  }).length;
  const inDictionary = dictionary.filter(function (d) {
    return matchesQuery([d.word, d.meaning, d.example, d.tags.join(" ")], query);
  }).length;

  const q = encodeURIComponent(query);
  const links = [];
  if (inCommunities > 0) links.push('<a href="communities.html?q=' + q + '">общности (' + inCommunities + ')</a>');
  if (inArchive > 0) links.push('<a href="archive.html?q=' + q + '">архив (' + inArchive + ')</a>');
  if (inDictionary > 0) links.push('<a href="dictionary.html?q=' + q + '">речник (' + inDictionary + ')</a>');

  if (typeof sources !== "undefined") {
    const inSources = sources.filter(function (s) {
      return matchesQuery([s.title, s.translatedTitle, s.authors.join(" "), s.abstract, s.tags.join(" ")], query);
    }).length;
    if (inSources > 0) links.push('<a href="bibliography.html?q=' + q + '">библиография (' + inSources + ')</a>');
  }

  if (links.length === 0) {
    box.hidden = true;
    return;
  }
  box.innerHTML = "Резултати и в други раздели: " + links.join(", ");
  box.hidden = false;
}


/* ---------- Събития ---------- */

searchField.addEventListener("input", renderTexts);
[regionSelect, genreSelect, periodSelect, varietySelect].forEach(function (select) {
  select.addEventListener("change", renderTexts);
});

// Табове
document.querySelectorAll(".tab").forEach(function (tab) {
  tab.addEventListener("click", function () {
    document.querySelectorAll(".tab").forEach(function (other) {
      other.classList.remove("active");
      other.setAttribute("aria-pressed", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-pressed", "true");
    activeCategory = tab.dataset.category;
    renderTexts();
  });
});

// Клик върху ключова дума → търсене по нея
resultsBox.addEventListener("click", function (event) {
  const button = event.target.closest("[data-keyword]");
  if (!button) return;
  searchField.value = button.dataset.keyword;
  renderTexts();
  searchField.scrollIntoView({ behavior: "smooth", block: "center" });
});

// Изчистване
document.getElementById("reset-texts").addEventListener("click", function () {
  searchField.value = "";
  regionSelect.value = "";
  genreSelect.value = "";
  periodSelect.value = "";
  varietySelect.value = "";
  document.querySelector('.tab[data-category="all"]').click();
});


/* ---------- Старт: четем ?q= от адреса ---------- */

const params = new URLSearchParams(window.location.search);
const initialQuery = params.get("q");
if (initialQuery) {
  searchField.value = initialQuery;
}
renderTexts();
