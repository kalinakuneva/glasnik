/* =========================================================
   Гласник — общности
   ---------------------------------------------------------
   communities.html        → списък с всички общности
   communities.html?id=6   → детайлен изглед за общност с id 6
   ========================================================= */

const listView = document.getElementById("list-view");
const detailView = document.getElementById("detail-view");


/* ---------- Списък ---------- */

function renderCommunityList() {
  const query = document.getElementById("community-search").value;
  const region = document.getElementById("community-region").value;
  const country = document.getElementById("community-country").value;

  const filtered = communities.filter(function (c) {
    return matchesQuery([c.name, c.description, c.country, c.region, c.history, c.culture, c.language], query) &&
           (region === "" || c.region === region) &&
           (country === "" || c.country === country);
  });

  document.getElementById("community-count").textContent =
    "Показани общности: " + filtered.length + " от " + communities.length;

  const grid = document.getElementById("community-grid");

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">Няма общности, които отговарят на търсенето.</div>';
    return;
  }

  grid.innerHTML = filtered.map(function (c) {
    return '<article class="card community-card">' +
             '<span class="badge">' + escapeHtml(c.period) + '</span>' +
             (c.sources && c.sources.length
               ? ' <span class="badge badge-open">С източници</span>'
               : ' <span class="badge badge-neutral">Демо описание</span>') +
             '<h3 style="margin-top: 10px;">' + highlight(c.name, query) + '</h3>' +
             '<p class="card-meta" style="margin-bottom: 8px;">' + escapeHtml(c.region + ", " + c.country) + '</p>' +
             '<p>' + escapeHtml(c.description) + '</p>' +
             '<div class="card-footer">' +
               '<span class="stats">' +
                 '<span><strong>' + countTextsFor(c.name) + '</strong> текста</span>' +
                 '<span><strong>' + countArchiveFor(c.name) + '</strong> архивни</span>' +
               '</span>' +
               '<a class="btn btn-primary btn-small" href="communities.html?id=' + c.id + '">Разгледай</a>' +
             '</div>' +
           '</article>';
  }).join("");
}


/* ---------- Детайлен изглед ---------- */

function relatedListHtml(items, emptyText) {
  if (items.length === 0) {
    return '<p class="muted small">' + emptyText + '</p>';
  }
  return '<ul class="related-list">' + items.join("") + '</ul>';
}

// Литература от библиографията (js/sources.js): първо трудовете
// за самото място, после — за региона като цяло.
function literatureHtml(community) {
  if (typeof sources === "undefined") return "";

  const aboutPlace = sources.filter(function (s) {
    return s.places.includes(community.name);
  });
  const aboutRegion = sources.filter(function (s) {
    return s.topic === community.region && !s.places.includes(community.name);
  });
  if (aboutPlace.length === 0 && aboutRegion.length === 0) return "";

  function item(s) {
    return '<li><a href="bibliography.html?id=' + s.id + '">' + escapeHtml(s.title) + '</a>' +
           '<span class="muted small">' + escapeHtml(s.authors.map(shortName).join(", ") || s.type) +
           ' · ' + (s.year || "б.г.") + '</span></li>';
  }

  let html = '<div class="detail-section"><h2>Литература</h2>';
  if (aboutPlace.length) {
    html += '<h3>За ' + escapeHtml(community.name) + '</h3><ul class="related-list">' + aboutPlace.map(item).join("") + '</ul>';
  }
  if (aboutRegion.length) {
    html += '<h3 style="margin-top: 16px;">За ' + escapeHtml(community.region) + '</h3>' +
            '<ul class="related-list">' + aboutRegion.slice(0, 4).map(item).join("") + '</ul>' +
            '<p class="small"><a href="bibliography.html?topic=' + encodeURIComponent(community.region) + '">' +
            'Всички ' + aboutRegion.length + ' записа за ' + escapeHtml(community.region) + ' →</a></p>';
  }
  return html + '</div>';
}

// Секция се показва само ако има текст
function detailSection(title, text) {
  if (!text) return "";
  return '<div class="detail-section"><h2>' + title + '</h2><p>' + escapeHtml(text) + '</p></div>';
}

// Източници на описанието; ако няма — бележка, че е демонстрационно
function sourcesHtml(community) {
  if (!community.sources || community.sources.length === 0) {
    return '<p class="note">Описанието на тази общност е демонстрационно и предстои да бъде проверено по източници.</p>';
  }
  const items = community.sources.map(function (src) {
    const link = src.url ? ' <a href="' + escapeHtml(src.url) + '" target="_blank" rel="noopener">↗</a>' : '';
    return '<li>' + escapeHtml(src.text) + link + '</li>';
  }).join("");
  return '<div class="detail-section"><h2>Източници</h2><ul class="source-list">' + items + '</ul></div>';
}

function renderCommunityDetail(community) {
  document.title = "Гласник — " + community.name;

  const relatedTexts = texts
    .filter(function (t) { return t.place === community.name; })
    .map(function (t) {
      return '<li><a href="texts.html?q=' + encodeURIComponent(t.title) + '">' + escapeHtml(t.title) + '</a>' +
             '<span class="muted small">' + escapeHtml(t.type + " · " + t.year) + '</span></li>';
    });

  const relatedArchive = archiveItems
    .filter(function (a) { return a.place === community.name; })
    .map(function (a) {
      return '<li><a href="archive.html?id=' + a.id + '">' + escapeHtml(a.title) + '</a>' +
             '<span class="muted small">' + escapeHtml(a.type + " · " + a.year + " · " + a.signature) + '</span></li>';
    });

  const relatedWords = dictionary
    .filter(function (d) { return d.place === community.name; })
    .map(function (d) {
      return '<li><a href="dictionary.html?word=' + encodeURIComponent(d.word) + '">' + escapeHtml(d.word) + '</a>' +
             '<span class="muted small">' + escapeHtml(d.meaning) + '</span></li>';
    });

  detailView.innerHTML =
    '<section class="page-header">' +
      '<div class="container">' +
        '<p class="breadcrumb"><a href="communities.html">← Всички общности</a></p>' +
        '<h1>' + escapeHtml(community.name) + '</h1>' +
        '<p>' + escapeHtml(community.region + ", " + community.country + " · " + community.period) + '</p>' +
      '</div>' +
    '</section>' +

    '<section class="section">' +
      '<div class="container detail-layout">' +
        '<div>' +
          '<p style="font-size: 1.1rem;">' + escapeHtml(community.description) + '</p>' +

          detailSection("История", community.history) +
          detailSection("Култура", community.culture) +
          detailSection("Език", community.language) +
          sourcesHtml(community) +

          literatureHtml(community) +

          '<div class="detail-section">' +
            '<h2>Свързани материали</h2>' +
            '<div class="grid grid-3">' +
              '<div><h3>Текстове</h3>' + relatedListHtml(relatedTexts, "Няма текстове за това място.") + '</div>' +
              '<div><h3>Архив</h3>' + relatedListHtml(relatedArchive, "Няма архивни материали.") + '</div>' +
              '<div><h3>Речник</h3>' + relatedListHtml(relatedWords, "Няма речникови единици.") + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<aside class="card">' +
          '<div id="mini-map" class="mini-map" role="region" aria-label="Местоположение на ' + escapeHtml(community.name) + '"></div>' +
          '<dl class="info-list">' +
            '<dt>Регион</dt><dd>' + escapeHtml(community.region) + '</dd>' +
            '<dt>Държава</dt><dd>' + escapeHtml(community.country) + '</dd>' +
            '<dt>Период</dt><dd>' + escapeHtml(community.period) + '</dd>' +
            '<dt>Текстове</dt><dd>' + relatedTexts.length + '</dd>' +
            '<dt>Архив</dt><dd>' + relatedArchive.length + '</dd>' +
            '<dt>Координати</dt><dd>' + community.latitude.toFixed(3) + ', ' + community.longitude.toFixed(3) + '</dd>' +
          '</dl>' +
          '<div class="card-footer">' +
            '<a class="btn btn-primary btn-small" href="map.html?q=' + encodeURIComponent(community.name) + '">Покажи на картата</a>' +
            '<a class="btn btn-outline btn-small" href="texts.html?q=' + encodeURIComponent(community.name) + '">Търси в текстовете</a>' +
          '</div>' +
        '</aside>' +
      '</div>' +
    '</section>';

  // Малка карта с местоположението
  if (typeof L !== "undefined") {
    const miniMap = L.map("mini-map", { scrollWheelZoom: false })
      .setView([community.latitude, community.longitude], 8);
    addBaseMap(miniMap);
    L.circleMarker([community.latitude, community.longitude], {
      radius: 9, color: "#FFFFFF", weight: 2, fillColor: "#2F7D55", fillOpacity: 0.95
    }).addTo(miniMap);
  }
}

function renderNotFound() {
  detailView.innerHTML =
    '<section class="section"><div class="container">' +
      '<div class="empty-state">' +
        '<h2>Общността не е намерена</h2>' +
        '<p>Няма общност с такъв идентификатор.</p>' +
        '<a class="btn btn-primary" href="communities.html">Към всички общности</a>' +
      '</div>' +
    '</div></section>';
}


/* ---------- Старт ---------- */

const communityId = getQueryParam("id");

if (communityId) {
  // Детайлен изглед
  const community = communities.find(function (c) {
    return c.id === Number(communityId);
  });
  listView.hidden = true;
  detailView.hidden = false;
  if (community) {
    renderCommunityDetail(community);
  } else {
    renderNotFound();
  }
} else {
  // Списък
  fillSelect(document.getElementById("community-region"), uniqueValues(communities, "region"));
  fillSelect(document.getElementById("community-country"), uniqueValues(communities, "country"));

  // communities.html?q=Болград → попълва търсенето
  const startQuery = getQueryParam("q");
  if (startQuery) document.getElementById("community-search").value = startQuery;

  document.getElementById("community-search").addEventListener("input", renderCommunityList);
  document.getElementById("community-region").addEventListener("change", renderCommunityList);
  document.getElementById("community-country").addEventListener("change", renderCommunityList);

  renderCommunityList();
}
