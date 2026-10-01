/* =========================================================
   Гласник — речник
   ---------------------------------------------------------
   Търсенето проверява думата, значението, примера и етикетите.
   dictionary.html?word=шиник → отваря директно думата.
   dictionary.html?q=харман   → попълва търсенето.
   ========================================================= */

const wordSearch = document.getElementById("word-search");
const wordRegion = document.getElementById("word-region");
const wordTag = document.getElementById("word-tag");
const wordList = document.getElementById("word-list");
const entryCard = document.getElementById("entry-card");

let selectedWord = null;

// Попълваме падащите менюта
fillSelect(wordRegion, uniqueValues(dictionary, "region"));

const allTags = [];
dictionary.forEach(function (entry) {
  entry.tags.forEach(function (tag) {
    if (!allTags.includes(tag)) allTags.push(tag);
  });
});
allTags.sort(function (a, b) { return a.localeCompare(b, "bg"); });
fillSelect(wordTag, allTags);


function renderWordList() {
  const query = wordSearch.value.trim();

  const filtered = dictionary
    .filter(function (entry) {
      return matchesQuery([entry.word, entry.meaning, entry.example, entry.tags.join(" ")], query) &&
             (wordRegion.value === "" || entry.region === wordRegion.value) &&
             (wordTag.value === "" || entry.tags.includes(wordTag.value));
    })
    .sort(function (a, b) {
      return a.word.localeCompare(b.word, "bg");
    });

  document.getElementById("word-count").textContent =
    "Намерени думи: " + filtered.length + " от " + dictionary.length;

  if (filtered.length === 0) {
    wordList.innerHTML = '<li class="empty-state" style="border: 0;">Няма намерени думи.</li>';
    return;
  }

  wordList.innerHTML = filtered.map(function (entry) {
    const isActive = selectedWord && selectedWord.word === entry.word;
    return '<li><button type="button" data-word="' + escapeHtml(entry.word) + '"' +
           (isActive ? ' class="active" aria-current="true"' : '') + '>' +
             '<span class="word">' + highlight(entry.word, query) + '</span>' +
             '<span class="word-short">' + escapeHtml(entry.region) + ' · ' + highlight(entry.meaning, query) + '</span>' +
           '</button></li>';
  }).join("");

  // Ако няма избрана дума, показваме първата от резултатите
  if (!selectedWord) {
    showEntry(filtered[0]);
  }
}

function showEntry(entry) {
  selectedWord = entry;

  const community = findCommunityByName(entry.place);
  const placeHtml = community
    ? '<a href="communities.html?id=' + community.id + '">' + escapeHtml(entry.place) + '</a>'
    : escapeHtml(entry.place);

  const tags = entry.tags.map(function (tag) {
    return '<li><button type="button" class="tag" data-tag="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</button></li>';
  }).join("");

  entryCard.innerHTML =
    '<h2 class="entry-word">' + escapeHtml(entry.word) + '</h2>' +
    '<p class="entry-pos">' + escapeHtml(entry.partOfSpeech) + '</p>' +
    '<dl class="info-list" style="margin-bottom: 20px;">' +
      '<dt>Регион</dt><dd>' + escapeHtml(entry.region) + '</dd>' +
      '<dt>Записано в</dt><dd>' + placeHtml + '</dd>' +
      '<dt>Значение</dt><dd>' + escapeHtml(entry.meaning) + '</dd>' +
    '</dl>' +
    '<h3>Пример</h3>' +
    '<p class="entry-example">' + escapeHtml(entry.example) + '</p>' +
    '<h3 style="margin-top: 20px;">Етикети</h3>' +
    '<ul class="tag-list">' + tags + '</ul>' +
    '<div class="card-footer">' +
      '<a class="btn btn-outline btn-small" href="map.html?q=' + encodeURIComponent(entry.word) + '">Покажи на картата</a>' +
      '<a class="btn btn-outline btn-small" href="texts.html?q=' + encodeURIComponent(entry.word) + '">Търси в текстовете</a>' +
    '</div>';

  // Отбелязваме активната дума в списъка
  wordList.querySelectorAll("button").forEach(function (button) {
    const isActive = button.dataset.word === entry.word;
    button.classList.toggle("active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function showNoEntry() {
  entryCard.innerHTML = '<p class="muted">Изберете дума от списъка.</p>';
}


/* ---------- Събития ---------- */

function onFilterChange() {
  selectedWord = null;
  renderWordList();
  if (!selectedWord) showNoEntry();
}

wordSearch.addEventListener("input", onFilterChange);
wordRegion.addEventListener("change", onFilterChange);
wordTag.addEventListener("change", onFilterChange);

wordList.addEventListener("click", function (event) {
  const button = event.target.closest("[data-word]");
  if (!button) return;
  const entry = dictionary.find(function (d) { return d.word === button.dataset.word; });
  if (!entry) return;
  showEntry(entry);

  // На телефон превъртаме до картата с детайлите
  if (window.innerWidth < 900) {
    entryCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// Клик върху етикет → филтър по етикета
entryCard.addEventListener("click", function (event) {
  const tagButton = event.target.closest("[data-tag]");
  if (!tagButton) return;
  wordTag.value = tagButton.dataset.tag;
  wordSearch.value = "";
  onFilterChange();
});


/* ---------- Старт ---------- */

const startQuery = getQueryParam("q");
if (startQuery) wordSearch.value = startQuery;

const startWord = getQueryParam("word");
if (startWord) {
  selectedWord = dictionary.find(function (d) { return d.word === startWord; }) || null;
}

renderWordList();
if (selectedWord) {
  showEntry(selectedWord);
} else {
  showNoEntry();
}
