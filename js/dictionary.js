/* =========================================================
   Гласник — речник
   ---------------------------------------------------------
   Данните идват от js/dictionary-data.js, който се генерира
   от TEI XML с tools/tei_dictionary_to_js.py.

   Търсенето не зависи от ударенията: „абедня“ намира „абѐдня“.
   dictionary.html?word=абедня → отваря директно статията
                                (по id, дума или дума без ударения).
   dictionary.html?q=овца       → попълва търсенето.
   dictionary.html?place=Терновка → само думите от едно място.
   ========================================================= */

const wordSearch = document.getElementById("word-search");
const wordPlace = document.getElementById("word-place");
const wordPos = document.getElementById("word-pos");
const wordList = document.getElementById("word-list");
const entryCard = document.getElementById("entry-card");

let selectedEntry = null;

// Сортиране по азбучен ред без ударенията
dictionary.sort(function (a, b) {
  return normalize(a.word).localeCompare(normalize(b.word), "bg") || a.id.localeCompare(b.id, "bg");
});

fillSelect(wordPlace, uniqueValues(dictionary, "place"));
fillSelect(wordPos, uniqueValues(dictionary.filter(function (d) { return d.posGroup; }), "posGroup"));

// Източник под заглавието
const sourceLine = document.getElementById("dictionary-source");
if (sourceLine && typeof dictionaryInfo !== "undefined") {
  sourceLine.innerHTML = sourceHtml();
}

function sourceHtml() {
  let html = "Източник: " + escapeHtml(dictionaryInfo.source || dictionaryInfo.title);
  if (dictionaryInfo.editor) html += ". TEI кодиране: " + escapeHtml(dictionaryInfo.editor);
  if (dictionaryInfo.licence) {
    html += '. Лиценз: <a href="' + escapeHtml(dictionaryInfo.licence) + '" target="_blank" rel="noopener">CC BY-SA 4.0</a>';
  }
  return html + ".";
}

// Всички полета, в които търсим
function searchFields(entry) {
  return [
    entry.word,
    entry.variants.join(" "),
    entry.meaning,
    entry.senses.map(function (s) { return s.examples.join(" "); }).join(" "),
    entry.phrases.map(function (p) { return p.forms.join(" ") + " " + p.def + " " + p.examples.join(" "); }).join(" ")
  ];
}

function findEntry(key) {
  if (!key) return null;
  const k = normalize(key);
  return dictionary.find(function (d) { return d.id === key; }) ||
         dictionary.find(function (d) { return normalize(d.word) === k; }) ||
         dictionary.find(function (d) { return normalize(d.id) === k; }) ||
         null;
}

function entryLink(entry) {
  return "dictionary.html?word=" + encodeURIComponent(entry.id);
}


/* ---------- Списък ---------- */

function renderWordList() {
  const query = wordSearch.value.trim();

  const filtered = dictionary.filter(function (entry) {
    return matchesQuery(searchFields(entry), query) &&
           (wordPlace.value === "" || entry.place === wordPlace.value) &&
           (wordPos.value === "" || entry.posGroup === wordPos.value);
  });

  document.getElementById("word-count").textContent =
    "Намерени статии: " + filtered.length + " от " + dictionary.length;

  if (filtered.length === 0) {
    wordList.innerHTML = '<li class="empty-state" style="border: 0;">Няма намерени думи.</li>';
    return filtered;
  }

  wordList.innerHTML = filtered.map(function (entry) {
    const isActive = selectedEntry && selectedEntry.id === entry.id;
    return '<li><button type="button" data-id="' + escapeHtml(entry.id) + '"' +
           (isActive ? ' class="active" aria-current="true"' : '') + '>' +
             '<span class="word">' + highlight(entry.word, query) + '</span>' +
             (entry.partOfSpeech ? ' <span class="word-pos">' + escapeHtml(entry.partOfSpeech) + '</span>' : '') +
             '<span class="word-short">' + highlight(entry.meaning, query) + '</span>' +
           '</button></li>';
  }).join("");

  return filtered;
}


/* ---------- Речникова статия ---------- */

function refHtml(ref) {
  const target = ref.exists ? findEntry(ref.target) : null;
  const label = escapeHtml(ref.label || ref.target);
  return target
    ? '<a class="dict-xr" href="' + entryLink(target) + '" data-id="' + escapeHtml(target.id) + '">' + label + '</a>'
    : '<span class="dict-xr dict-xr-missing" title="Статията още не е въведена">' + label + '</span>';
}

function examplesHtml(examples, query) {
  if (!examples.length) return "";
  return '<ul class="dict-examples">' + examples.map(function (e) {
    return '<li>' + highlight(e, query) + '</li>';
  }).join("") + '</ul>';
}

function sensesHtml(entry, query) {
  if (!entry.senses.length) return "";

  // Омоними (<hom>) — всеки със собствена номерация: I 1. 2.  II …
  const groups = [];
  entry.senses.forEach(function (s) {
    const key = s.hom || 0;
    if (!groups.length || groups[groups.length - 1].hom !== key) groups.push({ hom: key, senses: [] });
    groups[groups.length - 1].senses.push(s);
  });

  return groups.map(function (g) {
    const html = senseListHtml(g.senses, query);
    return g.hom
      ? '<section class="dict-hom-block"><span class="dict-hom">' + toRoman(g.hom) + '</span>' + html + '</section>'
      : html;
  }).join("");
}

function senseListHtml(senses, query) {
  const numbered = senses.length > 1;
  return '<ol class="dict-senses' + (numbered ? '' : ' single') + '">' +
    senses.map(function (s, i) {
      return '<li' + (numbered ? ' value="' + (parseInt(s.n, 10) || i + 1) + '"' : '') + '>' +
        (s.label ? '<span class="dict-label">' + escapeHtml(s.label) + '</span> ' : '') +
        '<span class="dict-def">' + highlight(s.def, query) + '</span>' +
        examplesHtml(s.examples, query) +
        (s.xr.length ? '<p class="dict-see">Вж. ' + s.xr.map(refHtml).join(", ") + '</p>' : '') +
      '</li>';
    }).join("") +
  '</ol>';
}

function toRoman(n) {
  return ["", "I", "II", "III", "IV", "V"][n] || String(n);
}

function phrasesHtml(entry, query) {
  if (!entry.phrases.length) return "";
  return '<h3>Изрази</h3><dl class="dict-phrases">' +
    entry.phrases.map(function (p) {
      return '<dt>' + p.forms.map(function (f) { return highlight(f, query); }).join(", ") + '</dt>' +
             '<dd>' + highlight(p.def, query) + examplesHtml(p.examples, query) + '</dd>';
    }).join("") +
  '</dl>';
}

function showEntry(entry) {
  selectedEntry = entry;
  const query = wordSearch.value.trim();

  const community = findCommunityByName(entry.place);
  const placeHtml = community
    ? '<a href="communities.html?id=' + community.id + '">' + escapeHtml(entry.place) + '</a>'
    : escapeHtml(entry.place);

  entryCard.innerHTML =
    '<h2 class="entry-word">' + escapeHtml(entry.word) + '</h2>' +
    '<p class="entry-pos">' +
      escapeHtml(entry.partOfSpeech) +
      (entry.pron ? ' <span class="dict-pron">[' + escapeHtml(entry.pron) + ']</span>' : '') +
    '</p>' +
    (entry.variants.length
      ? '<p class="dict-variants">Варианти: ' + entry.variants.map(escapeHtml).join(", ") + '</p>'
      : '') +
    sensesHtml(entry, query) +
    phrasesHtml(entry, query) +
    (entry.xr.length ? '<p class="dict-see">Вж. ' + entry.xr.map(refHtml).join(", ") + '</p>' : '') +
    (entry.etym ? '<p class="dict-etym"><strong>Произход:</strong> ' + escapeHtml(entry.etym) + '</p>' : '') +
    '<dl class="info-list dict-meta">' +
      '<dt>Записано в</dt><dd>' + placeHtml + ' · ' + escapeHtml(entry.region) + '</dd>' +
      '<dt>Източник</dt><dd>' + escapeHtml(dictionaryInfo.author || "") + ', ' + escapeHtml(dictionaryInfo.title || "") + '</dd>' +
      '<dt>TEI id</dt><dd><code>' + escapeHtml(entry.id) + '</code></dd>' +
    '</dl>' +
    '<div class="card-footer">' +
      '<a class="btn btn-outline btn-small" href="map.html?q=' + encodeURIComponent(entry.place) + '">Покажи на картата</a>' +
      '<a class="btn btn-outline btn-small" href="texts.html?q=' + encodeURIComponent(normalize(entry.word)) + '">Търси в текстовете</a>' +
    '</div>';

  // Отбелязваме активната дума в списъка
  wordList.querySelectorAll("button[data-id]").forEach(function (button) {
    const isActive = button.dataset.id === entry.id;
    button.classList.toggle("active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  // Адресът в браузъра сочи към статията (може да се копира и сподели)
  if (window.history && history.replaceState) {
    history.replaceState(null, "", entryLink(entry));
  }
}

function showNoEntry() {
  entryCard.innerHTML = '<p class="muted">Изберете дума от списъка.</p>';
}


/* ---------- Събития ---------- */

function onFilterChange() {
  const filtered = renderWordList();
  if (filtered.length && (!selectedEntry || !filtered.includes(selectedEntry))) {
    showEntry(filtered[0]);
  } else if (!filtered.length) {
    selectedEntry = null;
    showNoEntry();
  } else {
    showEntry(selectedEntry);
  }
}

wordSearch.addEventListener("input", onFilterChange);
wordPlace.addEventListener("change", onFilterChange);
wordPos.addEventListener("change", onFilterChange);

wordList.addEventListener("click", function (event) {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  const entry = findEntry(button.dataset.id);
  if (!entry) return;
  showEntry(entry);

  // На телефон превъртаме до статията
  if (window.innerWidth < 900) {
    entryCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

// Препратка „Вж.“ към друга статия
entryCard.addEventListener("click", function (event) {
  const link = event.target.closest("a.dict-xr[data-id]");
  if (!link) return;
  event.preventDefault();
  const entry = findEntry(link.dataset.id);
  if (!entry) return;
  wordSearch.value = "";
  wordPlace.value = "";
  wordPos.value = "";
  selectedEntry = entry;
  onFilterChange();
  scrollListToActive();
});

// Превърта само списъка (не цялата страница) до избраната дума
function scrollListToActive() {
  const active = wordList.querySelector("button.active");
  if (active) wordList.scrollTop = active.parentElement.offsetTop - wordList.clientHeight / 3;
}


/* ---------- Старт ---------- */

const startQuery = getQueryParam("q");
if (startQuery) wordSearch.value = startQuery;
const startPlace = getQueryParam("place");
if (startPlace) wordPlace.value = startPlace;

selectedEntry = findEntry(getQueryParam("word"));
onFilterChange();
scrollListToActive();
