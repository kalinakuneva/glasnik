/* =========================================================
   Гласник — архив
   ---------------------------------------------------------
   Филтрите работят веднага при отметка.
   Ако в една група няма отметки → не се филтрира по нея.
   archive.html?id=3 → отваря директно запис 3.
   archive.html?q=Винга → попълва търсенето.
   ========================================================= */

const archiveSearch = document.getElementById("archive-search");
const archiveGrid = document.getElementById("archive-grid");
const modal = document.getElementById("archive-modal");


/* ---------- Списък ---------- */

function renderArchive() {
  const query = archiveSearch.value.trim();
  const types = getCheckedValues("archive-type");
  const periods = getCheckedValues("archive-period");
  const regions = getCheckedValues("archive-region");

  const filtered = archiveItems.filter(function (item) {
    return matchesQuery([item.title, item.description, item.place, item.keywords.join(" ")], query) &&
           (types.length === 0 || types.includes(item.type)) &&
           (periods.length === 0 || periods.includes(centuryOf(item.year))) &&
           (regions.length === 0 || regions.includes(item.region));
  });

  document.getElementById("archive-count").textContent =
    "Показани записи: " + filtered.length + " от " + archiveItems.length;

  if (filtered.length === 0) {
    archiveGrid.innerHTML =
      '<div class="empty-state" style="grid-column: 1 / -1;">Няма архивни материали, които отговарят на филтрите.</div>';
    return;
  }

  archiveGrid.innerHTML = filtered.map(function (item) {
    return '<article class="card card-clickable archive-card">' +
             placeholderHtml(item.type, "Изображение-заместител: " + item.type) +
             '<span class="badge">' + escapeHtml(item.type) + '</span>' +
             '<h3 style="margin-top: 10px;">' +
               '<button type="button" class="stretched-button" data-id="' + item.id + '" aria-haspopup="dialog">' +
                 highlight(item.title, query) +
               '</button>' +
             '</h3>' +
             '<p class="card-meta" style="margin-bottom: 6px;">' + highlight(item.place, query) + ' · ' + escapeHtml(item.year) + ' · ' + escapeHtml(item.region) + '</p>' +
             '<p>' + highlight(item.description, query) + '</p>' +
           '</article>';
  }).join("");
}


/* ---------- Модален прозорец ---------- */

let currentItem = null;

function openArchiveItem(id) {
  const item = archiveItems.find(function (a) { return a.id === Number(id); });
  if (!item) return;
  currentItem = item;

  document.getElementById("modal-type").textContent = item.type;
  document.getElementById("modal-title").textContent = item.title;

  const community = findCommunityByName(item.place);
  const placeHtml = community
    ? '<a href="communities.html?id=' + community.id + '">' + escapeHtml(item.place) + '</a>, ' + escapeHtml(item.region)
    : escapeHtml(item.place + ", " + item.region);

  document.getElementById("modal-info").innerHTML =
    '<dt>Заглавие</dt><dd>' + escapeHtml(item.title) + '</dd>' +
    '<dt>Дата</dt><dd>' + escapeHtml(item.year) + ' (' + centuryOf(item.year) + ' в.)</dd>' +
    '<dt>Място</dt><dd>' + placeHtml + '</dd>' +
    '<dt>Език</dt><dd>' + escapeHtml(item.language) + '</dd>' +
    '<dt>Тип документ</dt><dd>' + escapeHtml(item.type) + '</dd>' +
    '<dt>Сигнатура</dt><dd>' + escapeHtml(item.signature) + '</dd>';

  document.getElementById("modal-description").textContent = item.description;

  document.getElementById("modal-keywords").innerHTML = item.keywords.map(function (k) {
    return '<li><a class="tag" href="texts.html?q=' + encodeURIComponent(k) + '">' + escapeHtml(k) + '</a></li>';
  }).join("");

  // Транскрипцията е скрита при всяко ново отваряне
  const transcription = document.getElementById("modal-transcription");
  transcription.hidden = true;
  transcription.textContent = item.transcription;
  document.getElementById("btn-transcription").setAttribute("aria-expanded", "false");

  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    modal.setAttribute("open", ""); // за много стари браузъри
  }
}

function closeModal() {
  if (typeof modal.close === "function") {
    modal.close();
  } else {
    modal.removeAttribute("open");
  }
}


/* ---------- Събития ---------- */

archiveSearch.addEventListener("input", renderArchive);

document.querySelectorAll(".filters-panel input[type=checkbox]").forEach(function (box) {
  box.addEventListener("change", renderArchive);
});

document.getElementById("reset-archive").addEventListener("click", function () {
  archiveSearch.value = "";
  document.querySelectorAll(".filters-panel input[type=checkbox]").forEach(function (box) {
    box.checked = false;
  });
  renderArchive();
});

archiveGrid.addEventListener("click", function (event) {
  const card = event.target.closest("[data-id]");
  if (card) openArchiveItem(card.dataset.id);
});

document.getElementById("modal-close").addEventListener("click", closeModal);

// Клик върху тъмния фон затваря прозореца
modal.addEventListener("click", function (event) {
  if (event.target === modal) closeModal();
});

document.getElementById("btn-preview").addEventListener("click", function () {
  alert("Преглед на дигиталното копие: " + currentItem.title + "\n\nВ демонстрационната версия няма прикачено изображение.");
});

document.getElementById("btn-transcription").addEventListener("click", function () {
  const box = document.getElementById("modal-transcription");
  box.hidden = !box.hidden;
  this.setAttribute("aria-expanded", String(!box.hidden));
});

document.getElementById("btn-pdf").addEventListener("click", function () {
  alert("Демонстрационен файл.");
});


/* ---------- Старт ---------- */

const startQuery = getQueryParam("q");
if (startQuery) archiveSearch.value = startQuery;

renderArchive();

const startId = getQueryParam("id");
if (startId) openArchiveItem(startId);
