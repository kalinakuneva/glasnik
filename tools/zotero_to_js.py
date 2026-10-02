"""Превръща Zotero CSV експорт в js/sources.js за сайта Гласник."""
import csv, json, re, sys
from collections import Counter

src, out = sys.argv[1], sys.argv[2]
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
    return [clean(p) for p in (s or "").split(";") if clean(p)]

abstract_count = Counter(r["Abstract Note"] for r in rows if r["Abstract Note"])
doi_count = Counter(r["DOI"] for r in rows if r["DOI"])

def topic(r, text):
    t = text.lower()
    if re.search(r"бесараб|bessarab|болград|bolhrad|bolgrad|варзопов|табак|chișinău", t):
        return "Бесарабия"
    if re.search(r"банат|banat|седмиград|temisvar|\brill\b|berecz", t):
        return "Банат"
    return "Българи католици"

def places(text):
    t = text.lower()
    p = []
    if re.search(r"болград|bolhrad|bolgrad", t): p.append("Болград")
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
        "tags": tags,
        "topic": topic(r, alltext),
        "places": places(alltext),
        # Издания до 1870 г. са първични извори; останалото е научна литература
        "kind": "Извор" if (year and year <= 1870) else "Изследване",
    }
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
   ========================================================= */

const sources = """
open(out, "w", encoding="utf-8").write(header + json.dumps(sources, ensure_ascii=False, indent=2) + ";\n")
print(len(sources), "записа")
print(Counter(s["topic"] for s in sources), Counter(s["kind"] for s in sources), Counter(s["type"] for s in sources))
print("places:", [(s["title"][:40], s["places"]) for s in sources if s["places"]])
for w in warnings: print("ВНИМАНИЕ:", w)
