"""
Превръща TEI речник (XML) в js/dictionary-data.js за сайта Гласник.

Употреба:
    python3 tools/tei_dictionary_to_js.py data/ternovka.xml js/dictionary-data.js "Терновка"

Третият аргумент е общността (от js/data.js), към която принадлежи речникът.
Скриптът чете само TEI и не променя XML файла.
"""
import json
import re
import sys
import unicodedata

from lxml import etree

NS = {"t": "http://www.tei-c.org/ns/1.0"}
XML_ID = "{http://www.w3.org/XML/1998/namespace}id"

# Граматичните съкращения → по-общи етикети за филтъра „Част на речта“
POS_GROUPS = [
    (r"^(м|ж|ср)\.?$", "съществително"),
    (r"^(несв|св|гл)\.?", "глагол"),
    (r"^прил", "прилагателно"),
    (r"^нар", "наречие"),
    (r"^част", "частица"),
    (r"^(сз|conj|съюз)", "съюз"),
    (r"^(израз|съч)", "израз"),
    (r"^обръщ", "обръщение"),
]


# Временни поправки на заглавни думи, докато се коригира XML
# (xml:id → правилна заглавна дума). Изтрийте реда, щом XML е поправен.
HEADWORD_FIXES = {
    "бо": "бо",          # в XML <orth> е „блъштѝ“ (копирано от предишната статия)
    "бички": "бички",    # в XML <orth> е „бичѐ“ (от статията „биче“)
}


def text(el):
    """Целият текст на елемента, с нормализирани интервали."""
    if el is None:
        return ""
    s = "".join(el.itertext())
    return re.sub(r"\s+", " ", s).strip()


def first(el, path):
    found = el.xpath(path, namespaces=NS)
    return found[0] if found else None


def plain(s):
    """Без ударения и комбиниращи знаци — за търсене и id."""
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if not unicodedata.combining(c))


def gram_labels(entry):
    labels = []
    for g in entry.xpath("./t:gramGrp/* | ./t:form[1]/t:gramGrp/*", namespaces=NS):
        value = text(g)
        if value:
            labels.append(value)
    return labels


def pos_group(labels):
    for label in labels:
        for pattern, group in POS_GROUPS:
            if re.search(pattern, label.strip()):
                return group
    return ""


def parse_senses(container):
    senses = []
    for s in container.xpath("./t:sense", namespaces=NS):
        defs = [text(d) for d in s.xpath("./t:def", namespaces=NS)]
        if not defs and not s.xpath("./*", namespaces=NS):
            defs = [text(s)]  # <sense>текст</sense> без <def>
        senses.append({
            "n": s.get("n", ""),
            "label": " ".join(text(l) for l in s.xpath("./t:lbl | ./t:usg", namespaces=NS)),
            "def": "; ".join(d for d in defs if d),
            "examples": [text(q) for q in s.xpath("./t:cit/t:quote", namespaces=NS)],
            "xr": [{"target": r.get("target", "").lstrip("#"), "label": text(r)}
                   for r in s.xpath("./t:xr/t:ref", namespaces=NS)],
        })
    return senses


def parse_entry(entry, place, region):
    lemma = first(entry, "./t:form[@type='lemma'] | ./t:form[1]")
    orth = text(first(lemma, "./t:orth")) if lemma is not None else ""
    stress = text(first(lemma, "./t:stress")) if lemma is not None else ""
    pron = text(first(lemma, "./t:pron")) if lemma is not None else ""
    variants = [text(o) for o in entry.xpath(
        "./t:form[@type='variant']/t:orth | ./t:form[@type='lemma']/t:form[@type='variant']/t:orth",
        namespaces=NS)]

    labels = gram_labels(entry)

    # Значения: директно или в омоними (<hom>)
    homs = entry.xpath("./t:hom", namespaces=NS)
    if homs:
        senses = []
        for i, h in enumerate(homs, 1):
            for s in parse_senses(h):
                s["hom"] = i
                senses.append(s)
            for r in h.xpath("./t:xr/t:ref", namespaces=NS):
                senses[-1]["xr"].append({"target": r.get("target", "").lstrip("#"), "label": text(r)})
    else:
        senses = parse_senses(entry)

    # Изрази и подстатии (<entry> вътре в <entry>)
    phrases = []
    for sub in entry.xpath("./t:entry", namespaces=NS):
        forms = [text(f) for f in sub.xpath("./t:form", namespaces=NS)]
        forms = [re.sub(r"\s+", " ", f) for f in forms if f]
        sub_senses = parse_senses(sub)
        phrases.append({
            "forms": forms,
            "def": "; ".join(s["def"] for s in sub_senses if s["def"]),
            "examples": [e for s in sub_senses for e in s["examples"]],
        })

    xr = [{"target": r.get("target", "").lstrip("#"), "label": text(r)}
          for r in entry.xpath("./t:xr/t:ref", namespaces=NS)]
    etym = text(first(entry, "./t:etym"))

    entry_id = entry.get(XML_ID, "")
    headword = stress or orth
    if entry_id in HEADWORD_FIXES and plain(headword) != HEADWORD_FIXES[entry_id]:
        print("  поправка:", entry_id, ":", headword, "→", HEADWORD_FIXES[entry_id])
        headword = HEADWORD_FIXES[entry_id]
    meaning = "; ".join(s["def"] for s in senses if s["def"]) or \
              "; ".join(p["def"] for p in phrases if p["def"])
    examples = [e for s in senses for e in s["examples"]] + [e for p in phrases for e in p["examples"]]

    group = pos_group(labels)
    return {
        "id": entry_id,
        "word": headword,
        "plain": plain(headword).lower(),
        "pron": pron,
        "variants": variants,
        "partOfSpeech": " ".join(labels),
        "posGroup": group,
        "region": region,
        "place": place,
        "meaning": meaning,
        "example": examples[0] if examples else "",
        "senses": senses,
        "phrases": phrases,
        "xr": xr,
        "etym": etym,
        "tags": [t for t in [group, place] if t],
    }


def main(src, out, place, region="Северно Причерноморие"):
    tree = etree.parse(src)
    header = {
        "title": text(first(tree.getroot(), "//t:titleStmt/t:title")),
        "author": text(first(tree.getroot(), "//t:titleStmt/t:author")),
        "editor": text(first(tree.getroot(), "//t:titleStmt/t:editor")),
        "source": text(first(tree.getroot(), "//t:sourceDesc/t:bibl")),
        "licence": first(tree.getroot(), "//t:licence").get("target", "") if first(tree.getroot(), "//t:licence") is not None else "",
    }
    entries = [parse_entry(e, place, region)
               for e in tree.xpath("/t:TEI/t:text/t:body/t:entry", namespaces=NS)]

    ids = {e["id"] for e in entries}
    for e in entries:
        for ref in e["xr"] + [r for s in e["senses"] for r in s["xr"]]:
            if ref["target"] not in ids and re.sub(r"\d+$", "", ref["target"]) in ids:
                ref["target"] = re.sub(r"\d+$", "", ref["target"])  # #бу1 → бу
            ref["exists"] = ref["target"] in ids
            if not ref["exists"]:
                print("  препратка към липсваща статия:", e["id"], "→", ref["target"])

    js = (
        "/* =========================================================\n"
        "   Гласник — речник (генерирано автоматично от TEI XML)\n"
        "   Източник: " + src + "\n"
        "   Не редактирайте на ръка: променете XML и пуснете отново\n"
        "   python3 tools/tei_dictionary_to_js.py\n"
        "   ========================================================= */\n\n"
        "const dictionaryInfo = " + json.dumps(header, ensure_ascii=False, indent=2) + ";\n\n"
        "const dictionary = " + json.dumps(entries, ensure_ascii=False, indent=1) + ";\n"
    )
    open(out, "w", encoding="utf-8").write(js)
    print(len(entries), "речникови статии →", out)


if __name__ == "__main__":
    main(*sys.argv[1:])
