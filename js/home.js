/* =========================================================
   Гласник — начална страница
   Иконки в карточките и малката карта-преглед.
   ========================================================= */

// Иконки в четирите основни карточки
document.getElementById("icon-history").innerHTML = icons.history;
document.getElementById("icon-people").innerHTML = icons.people;
document.getElementById("icon-language").innerHTML = icons.language;
document.getElementById("icon-archive").innerHTML = icons.archive;

// Иконки в „Избрани материали“
document.getElementById("ph-letter").insertAdjacentHTML("afterbegin", icons.document);
document.getElementById("ph-oral").insertAdjacentHTML("afterbegin", icons.language);
document.getElementById("ph-map").insertAdjacentHTML("afterbegin", icons.map);
document.getElementById("ph-dict").insertAdjacentHTML("afterbegin", icons.book);

// Малка карта с общностите
// Ако Leaflet не се зареди (няма интернет), страницата продължава да работи.
if (typeof L !== "undefined") {
  const previewMap = L.map("preview-map", {
    scrollWheelZoom: false,
    attributionControl: true
  }).setView([45.4, 24.8], 5);

  addBaseMap(previewMap);

  communities.forEach(function (community) {
    L.circleMarker([community.latitude, community.longitude], {
      radius: 7,
      color: "#FFFFFF",
      weight: 2,
      fillColor: "#2F7D55",
      fillOpacity: 0.95
    })
      .addTo(previewMap)
      .bindPopup(
        '<p class="popup-title">' + escapeHtml(community.name) + '</p>' +
        '<p class="popup-meta">' + escapeHtml(community.region + ", " + community.country) + '</p>' +
        '<a class="btn btn-primary btn-small" href="communities.html?id=' + community.id + '">Виж общност</a>'
      );
  });
} else {
  document.getElementById("preview-map").innerHTML =
    '<p class="muted small" style="padding:16px;">Картата не можа да се зареди. Проверете интернет връзката.</p>';
}
