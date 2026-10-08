/* =========================================================
   Гласник — интерактивна карта (Leaflet)
   ---------------------------------------------------------
   1. Създаваме картата
   2. От данните в data.js правим списък „mapItems“
      (общности, текстове, архив, речник) — всеки с маркер
   3. Филтри: регион, тип материал, период
   4. Търсене по име → flyTo + popup
   ========================================================= */


/* ---------- 1. Картата ---------- */

const map = L.map("map").setView([45.5, 25], 5);

addBaseMap(map);

// Всички видими маркери стоят в тази група — лесно се чистят и пълнят.
const markerLayer = L.layerGroup().addTo(map);

// Цвят и надпис за всеки тип материал
const kindSettings = {
  community:  { color: "#2F7D55", label: "Общност", radius: 9 },
  text:       { color: "#2B6CB0", label: "Текст",   radius: 6 },
  archive:    { color: "#C2691B", label: "Архив",   radius: 6 },
  dictionary: { color: "#7B4BA8", label: "Речник",  radius: 6 }
};

// Малко отместване, за да не се застъпват маркерите на едно място
const kindOffset = {
  community:  { lat: 0,      lng: 0 },
  text:       { lat: 0.035,  lng: 0.05 },
  archive:    { lat: -0.035, lng: 0.05 },
  dictionary: { lat: 0,      lng: -0.06 }
};
const usedOffsets = {}; // брояч „място + тип“ → колко маркера вече има


/* ---------- 2. Подготовка на обектите за картата ---------- */

const mapItems = [];

function addMapItem(kind, name, placeName, region, centuries, popupContent) {
  const community = findCommunityByName(placeName);
  if (!community) return; // ако мястото го няма в communities, пропускаме

  const key = placeName + "-" + kind;
  const index = usedOffsets[key] || 0;
  usedOffsets[key] = index + 1;

  const lat = community.latitude + kindOffset[kind].lat + index * 0.02;
  const lng = community.longitude + kindOffset[kind].lng + index * 0.025;

  const settings = kindSettings[kind];
  const marker = L.circleMarker([lat, lng], {
    radius: settings.radius,
    color: "#FFFFFF",
    weight: 2,
    fillColor: settings.color,
    fillOpacity: 0.95
  }).bindPopup(popupContent);

  mapItems.push({
    kind: kind,
    name: name,
    region: region,
    centuries: centuries,
    latlng: [lat, lng],
    marker: marker
  });
}

function popupHtml(title, meta, text, buttons) {
  return '<p class="popup-title">' + escapeHtml(title) + '</p>' +
         '<p class="popup-meta">' + escapeHtml(meta) + '</p>' +
         (text ? '<p class="popup-text">' + escapeHtml(text) + '</p>' : '') +
         '<div class="popup-actions">' + buttons + '</div>';
}

function popupButton(href, label, primary) {
  return '<a class="btn btn-small ' + (primary ? 'btn-primary' : 'btn-outline') + '" href="' + href + '">' + label + '</a>';
}

// Общности
communities.forEach(function (c) {
  addMapItem("community", c.name, c.name, c.region, c.centuries, popupHtml(
    c.name,
    c.region + ", " + c.country + " · " + c.period,
    c.description,
    popupButton("communities.html?id=" + c.id, "Виж общност", true) +
    popupButton("texts.html?q=" + encodeURIComponent(c.name), "Свързани материали", false)
  ));
});

// Текстове
texts.forEach(function (t) {
  addMapItem("text", t.title, t.place, t.region, [centuryOf(t.year)], popupHtml(
    t.title,
    "Текст · " + t.type + " · " + t.place + ", " + t.year,
    t.excerpt,
    popupButton("texts.html?q=" + encodeURIComponent(t.title), "Отвори текста", true)
  ));
});

// Архив
archiveItems.forEach(function (a) {
  addMapItem("archive", a.title, a.place, a.region, [centuryOf(a.year)], popupHtml(
    a.title,
    "Архив · " + a.type + " · " + a.place + ", " + a.year,
    a.description,
    popupButton("archive.html?id=" + a.id, "Отвори в архива", true)
  ));
});

// Речник (думите нямат период — затова centuries е празен масив
// и те не се скриват от филтъра „Период“)
dictionary.forEach(function (d) {
  addMapItem("dictionary", d.word, d.place, d.region, [], popupHtml(
    d.word,
    "Речник · " + d.partOfSpeech + " · " + d.place,
    d.meaning,
    popupButton("dictionary.html?word=" + encodeURIComponent(d.word), "Отвори в речника", true)
  ));
});


/* ---------- 3. Филтри ---------- */

// Празен списък означава „без ограничение“ — показваме всичко.
function passesFilter(selectedValues, itemValues) {
  if (selectedValues.length === 0) return true;
  if (itemValues.length === 0) return true;
  return itemValues.some(function (value) {
    return selectedValues.includes(value);
  });
}

function applyFilters() {
  const regions = getCheckedValues("region");
  const kinds = getCheckedValues("kind");
  const periods = getCheckedValues("period");

  markerLayer.clearLayers();
  let visibleCount = 0;

  mapItems.forEach(function (item) {
    const show =
      passesFilter(regions, [item.region]) &&
      kinds.includes(item.kind) &&
      passesFilter(periods, item.centuries);

    if (show) {
      markerLayer.addLayer(item.marker);
      visibleCount++;
    }
  });

  document.getElementById("map-count").textContent =
    "Показани обекти: " + visibleCount + " от " + mapItems.length;
}

function clearFilters() {
  document.querySelectorAll(".map-sidebar input[type=checkbox]").forEach(function (box) {
    box.checked = true;
  });
  document.getElementById("map-search").value = "";
  document.getElementById("map-search-results").innerHTML = "";
  applyFilters();
  map.flyTo([45.5, 25], 5);
}

document.getElementById("apply-filters").addEventListener("click", applyFilters);
document.getElementById("clear-filters").addEventListener("click", clearFilters);


/* ---------- 4. Търсене ---------- */

const searchInput = document.getElementById("map-search");
const resultsList = document.getElementById("map-search-results");
let currentResults = [];

function showSearchResults() {
  const query = searchInput.value;
  resultsList.innerHTML = "";
  currentResults = [];

  if (normalize(query) === "") return;

  // Първо общностите, после останалите материали
  currentResults = mapItems.filter(function (item) {
    return matchesQuery([item.name], query);
  }).slice(0, 8);

  if (currentResults.length === 0) {
    resultsList.innerHTML = '<li class="no-result">Няма намерени резултати.</li>';
    return;
  }

  currentResults.forEach(function (item, index) {
    const li = document.createElement("li");
    li.innerHTML =
      '<button type="button" data-index="' + index + '">' +
        '<span class="legend-dot dot-' + item.kind + '"></span>' +
        '<span>' + highlight(item.name, query) + '</span>' +
        '<span class="result-type">' + kindSettings[item.kind].label + '</span>' +
      '</button>';
    resultsList.appendChild(li);
  });
}

function goToItem(item) {
  // Ако маркерът е скрит от филтрите, го показваме
  if (!markerLayer.hasLayer(item.marker)) {
    markerLayer.addLayer(item.marker);
  }
  map.flyTo(item.latlng, 9, { duration: 1.2 });
  map.once("moveend", function () {
    item.marker.openPopup();
  });
}

searchInput.addEventListener("input", showSearchResults);

// Enter избира първия резултат
searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && currentResults.length > 0) {
    event.preventDefault();
    goToItem(currentResults[0]);
  }
});

resultsList.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) return;
  goToItem(currentResults[Number(button.dataset.index)]);
});


/* ---------- Старт ---------- */

applyFilters();

// map.html?q=Болград → търси и отваря мястото
const startQuery = getQueryParam("q");
if (startQuery) {
  searchInput.value = startQuery;
  showSearchResults();
  if (currentResults.length > 0) goToItem(currentResults[0]);
}

// Ако размерът на контейнера се промени (напр. завъртане на телефон)
window.addEventListener("resize", function () {
  map.invalidateSize();
});
