"""Превръща Zotero CSV експорт в js/sources.js за сайта Гласник."""
import csv, json, os, re, sys
from collections import Counter

src, out = sys.argv[1], sys.argv[2]

# Допълнителни линкове (tools/extra_links.json), които ги няма в Zotero
links_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extra_links.json")
extra_links = json.load(open(links_file, encoding="utf-8")) if os.path.exists(links_file) else {}
rows = list(csv.DictReader(open(src, encoding="utf-8-sig")))

TYPE = {"book": "Книга", "journalArticle": "Статия", "bookSection": "Глава от книга", "thesis": "Дисертация"}

def clean(s):
    s = (s or "").strip()
    s = re.sub(r"(\w)- (\w)", r"\1\2", s)          # „бълга- рите“ → „българите“
    s = s.replace("филологиче ски факул тет", "филологически факултет")
    s = s.replace("Андрей- чин", "Андрейчин")
    s = re.sub(r"\s+", " ", s)
    return s.rstrip(",").strip()

def people(s):
    result = []
    for p in (s or "").split(";"):
        name = clean(p)
        if re.search(r"\s\w$", name):   # „Милев, Никола И“ → „Милев, Никола И.“
            name += "."
        if name:
            result.append(name)
    return result

abstract_count = Counter(r["Abstract Note"] for r in rows if r["Abstract Note"])
doi_count = Counter(r["DOI"] for r in rows if r["DOI"])

def topic(r, text):
    t = text.lower()
    if re.search(r"бесараб|bessarab|болград|bolhrad|bolgrad|варзопов|табак|chișinău|украй|україн|болгарськ|болгарск|бессараб|заря|зоря|терновка|кубей|кирнички|переселен", t):
        return "Бесарабия"
    if re.search(r"банат|banat|седмиград|temisvar|\brill\b|berecz", t):
        return "Банат"
    return "Българи католици"

def places(text):
    t = text.lower()
    p = []
    if re.search(r"болград|bolhrad|bolgrad", t): p.append("Болград")
    if re.search(r"терновка|тернівка", t): p.append("Терновка")
    if re.search(r"temisvar", t): p.append("Тимишоара")
    return p

sources = []
warnings = []
for r in rows:
    title = clean(r["Title"])
    extra = clean(r["Extra"])
    translated = ""
    m = re.match(r"Translated title:\s*(.*)", extra)
    if m:
        translated = m.group(1).split(". In:")[0].strip()
    abstract = clean(r["Abstract Note"])
    doi, url = r["DOI"].strip(), r["Url"].strip()
    # Ако резюмето/DOI е копирано от друг запис — не го показваме
    if abstract and abstract_count[r["Abstract Note"]] > 1 and r["Item Type"] != "journalArticle" or (
        abstract and abstract_count[r["Abstract Note"]] > 1 and doi and "for23" in doi and "Чуждоезиково" not in r["Publication Title"]):
        warnings.append(f'{r["Key"]} „{title[:60]}“: резюмето и DOI са копирани от друг запис')
        abstract, doi, url = "", "", ""
    # Ако DOI-то не работи, го скриваме и показваме линка от extra_links.json
    if r["Key"] in extra_links.get("_hideDoi", []) or any(link.get("replacesDoi") for link in extra_links.get(r["Key"], [])):
        doi = ""
    tags = [clean(t) for t in (r["Manual Tags"] or "").split(";") if clean(t)]
    alltext = " ".join([title, r["Publication Title"], r["Place"], r["Publisher"], extra, " ".join(tags), r["Author"]])
    year = int(r["Publication Year"]) if r["Publication Year"].isdigit() else None
    item = {
        "id": r["Key"],
        "type": TYPE.get(r["Item Type"], r["Item Type"]),
        "year": year,
        "authors": people(r["Author"]),
        "editors": people(r["Editor"]),
        "translators": people(r["Translator"]),
        "title": title,
        "translatedTitle": translated,
        "container": clean(r["Publication Title"]),
        "volume": r["Volume"].strip(),
        "issue": r["Issue"].strip(),
        "pages": r["Pages"].replace(" ", "").replace("-", "–"),
        "publisher": clean(r["Publisher"]),
        "place": clean(r["Place"]),
        "isbn": r["ISBN"].strip() if r["Item Type"] == "book" else "",
        "doi": doi.replace("https://doi.org/", ""),
        "url": url,
        "abstract": abstract,
        "links": [{k: v for k, v in link.items() if k != "replacesDoi"} for link in extra_links.get(r["Key"], [])],
        "tags": tags,
        "topic": topic(r, alltext),
        "places": places(alltext),
        # Издания до 1870 г. са първични извори; останалото е научна литература
        "kind": "Извор" if (year and year <= 1870) else "Изследване",
    }
    sources.append(item)

# Ръчни записи, които още ги няма в Zotero (tools/extra_sources.json)
extra_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extra_sources.json")
if os.path.exists(extra_file):
    known = {s["title"] for s in sources}
    for item in json.load(open(extra_file, encoding="utf-8")).get("items", []):
        if item["title"] not in known:
            sources.append(item)

sources.sort(key=lambda s: (s["year"] or 0))

header = """/* =========================================================
   Гласник — библиография (генерирано от Zotero, група „Glasnik“)
   ---------------------------------------------------------
   Този файл е създаден автоматично от CSV експорт на Zotero.
   За промени: редактирайте записа в Zotero, експортирайте отново
   и заменете файла. Може и да го редактирате на ръка.

   topic  — „Банат“, „Бесарабия“ или „Българи католици“
   kind   — „Извор“ (издания до 1870 г.) или „Изследване“
   places — общности от data.js, с които записът е свързан
   links  — допълнителни линкове от tools/extra_links.json
            (full: true = пълен текст в свободен достъп)
   ========================================================= */

const sources = """
open(out, "w", encoding="utf-8").write(header + json.dumps(sources, ensure_ascii=False, indent=2) + ";\n")
print(len(sources), "записа")
print(Counter(s["topic"] for s in sources), Counter(s["kind"] for s in sources), Counter(s["type"] for s in sources))
print("places:", [(s["title"][:40], s["places"]) for s in sources if s["places"]])
for w in warnings: print("ВНИМАНИЕ:", w)
