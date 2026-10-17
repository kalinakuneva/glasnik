const map = L.map("map").setView([45.5, 25], 5);

addBaseMap(map);

const markerLayer = L.layerGroup().addTo(map);

const kindSettings = {
  community:  { color: "#2F7D55", label: "Общност", radius: 9 },
  text:       { color: "#2B6CB0", label: "Текст",   radius: 6 },
  archive:    { color: "#C2691B", label: "Архив",   radius: 6 },
  dictionary: { color: "#7B4BA8", label: "Речник",  radius: 6 }
};

const kindOffset = {
  community:  { lat: 0,      lng: 0 },
  text:       { lat: 0.035,  lng: 0.05 },
  archive:    { lat: -0.035, lng: 0.05 },
  dictionary: { lat: 0,      lng: -0.06 }
};
const usedOffsets = {};

const mapItems = [];

function addMapItem(kind, name, placeName, region, centuries, popupContent, searchText) {
  const community = findCommunityByName(placeName);
  if (!community) return;

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
    searchText: searchText || name,
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

communities.forEach(function (c) {
  addMapItem("community", c.name, c.name, c.region, c.centuries, popupHtml(
    c.name,
    c.region + ", " + c.country + " · " + c.period,
    c.description,
    popupButton("communities.html?id=" + c.id, "Виж общност", true) +
    popupButton("texts.html?q=" + encodeURIComponent(c.name), "Свързани материали", false)
  ));
});

texts.forEach(function (t) {
  addMapItem("text", t.title, t.place, t.region, [centuryOf(t.year)], popupHtml(
    t.title,
    "Текст · " + t.type + " · " + t.place + ", " + t.year,
    t.excerpt,
    popupButton("texts.html?q=" + encodeURIComponent(t.title), "Отвори текста", true)
  ));
});

archiveItems.forEach(function (a) {
  addMapItem("archive", a.title, a.place, a.region, [centuryOf(a.year)], popupHtml(
    a.title,
    "Архив · " + a.type + " · " + a.place + ", " + a.year,
    a.description,
    popupButton("archive.html?id=" + a.id, "Отвори в архива", true)
  ));
});

const dictionaryByPlace = {};
dictionary.forEach(function (d) {
  if (!dictionaryByPlace[d.place]) dictionaryByPlace[d.place] = [];
  dictionaryByPlace[d.place].push(d);
});

Object.keys(dictionaryByPlace).forEach(function (place) {
  const words = dictionaryByPlace[place];
  const sample = words.slice(0, 6).map(function (d) { return d.word; }).join(", ");
  addMapItem("dictionary", "Речник: " + place,
    place, words[0].region, [], popupHtml(
      "Речник на говора: " + place,
      "Речник · " + words.length + " статии",
      "Напр. " + sample + "…",
      popupButton("dictionary.html?place=" + encodeURIComponent(place), "Отвори речника", true)
    ), "Речник: " + place + " " + words.map(function (d) { return d.word + " " + d.meaning; }).join(" "));
});

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

const searchInput = document.getElementById("map-search");
const resultsList = document.getElementById("map-search-results");
let currentResults = [];

function showSearchResults() {
  const query = searchInput.value;
  resultsList.innerHTML = "";
  currentResults = [];

  if (normalize(query) === "") return;

  currentResults = mapItems.filter(function (item) {
    return matchesQuery([item.searchText], query);
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
  if (!markerLayer.hasLayer(item.marker)) {
    markerLayer.addLayer(item.marker);
  }
  map.flyTo(item.latlng, 9, { duration: 1.2 });
  map.once("moveend", function () {
    item.marker.openPopup();
  });
}

searchInput.addEventListener("input", showSearchResults);

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

applyFilters();

const startQuery = getQueryParam("q");
if (startQuery) {
  searchInput.value = startQuery;
  showSearchResults();
  if (currentResults.length > 0) goToItem(currentResults[0]);
}

window.addEventListener("resize", function () {
  map.invalidateSize();
});
