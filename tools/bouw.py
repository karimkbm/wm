"""Maakt menu.json (horloge) en data/keuken.json (gastenscherm) uit een export van de keuken-app.

Gebruik:
  python3 tools/bouw.py --plan pad/naar/plan.json --recepten pad/naar/recepten_map --namen "naam1,naam2"

--namen: namen die nooit openbaar mogen; ze worden uit alle teksten gehaald.
Er komt alleen in wat veilig openbaar kan: gerechten, ingrediënten, bereiding, voedingswaarden en recepttitels.
"""
import argparse, datetime, glob, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def laad(pad):
    d = json.load(open(pad, encoding="utf-8"))
    return d.get("data", d) if isinstance(d, dict) else d


def schoon(tekst, namen_re):
    if not isinstance(tekst, str):
        return tekst
    t = re.sub(r",?\s*\(?\s*voor\s+(?:" + namen_re + r")\s*\)?", " (kindvariant)", tekst, flags=re.I) if namen_re else tekst
    if namen_re:
        t = re.sub(r"\b(?:" + namen_re + r")\b", "", t, flags=re.I)
    return re.sub(r"\s{2,}", " ", t).strip()


def zonder_haakjes(t):
    return re.sub(r"\s*\([^)]*\)", "", t or "").strip()


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--plan", required=True)
    a.add_argument("--recepten", required=True)
    a.add_argument("--namen", default="")
    o = a.parse_args()
    namen = [re.escape(n.strip()) for n in o.namen.split(",") if n.strip()]
    namen_re = "|".join(namen)

    plan = laad(o.plan)
    nu = datetime.datetime.now()
    stempel = nu.strftime("%Y-%m-%d %H:%M")

    # Horloge: alleen datum, gerecht en type.
    menu = {"bijgewerkt": stempel, "dagen": {}}
    for d in plan.get("dagen", []):
        menu["dagen"][d["datum"]] = {"gerecht": schoon(zonder_haakjes(d.get("titel", "")), namen_re), "type": d.get("type", "")}

    # Gastenscherm: vanaf maandag van deze week.
    vandaag = nu.date()
    maandag = (vandaag - datetime.timedelta(days=vandaag.weekday())).isoformat()
    week = []
    for d in plan.get("dagen", []):
        if d.get("datum", "") < maandag:
            continue
        week.append({
            "datum": d["datum"],
            "titel": schoon(d.get("titel", ""), namen_re),
            "type": d.get("type", ""),
            "tijd": d.get("tijd", ""),
            "ingredienten": [schoon(x, namen_re) for x in d.get("ingredienten", []) or []],
            "bereiding": [schoon(x, namen_re) for x in d.get("bereiding", []) or []],
            "voeding": d.get("voeding") or None,
        })

    recepten = []
    naam_test = re.compile(r"\b(?:" + namen_re + r")\b", re.I) if namen_re else None
    for f in sorted(glob.glob(os.path.join(o.recepten, "*.json"))):
        r = laad(f)
        bron = r.get("bron", "")
        # Geen aantekeningen of overgenomen receptteksten openbaar: alleen titel, soort en bron.
        uitleg = ""
        recepten.append({
            "titel": schoon(r.get("titel", ""), namen_re),
            "soort": r.get("soort", ""),
            "link": bron if bron.startswith("http") else "",
            "bron": "" if bron.startswith("http") else schoon(bron, namen_re),
            "favoriet": bool(r.get("favoriet")),
            "uitleg": uitleg,
        })
    recepten.sort(key=lambda r: (not r["favoriet"], r["titel"].lower()))

    keuken = {"bijgewerkt": stempel, "week": week, "recepten": recepten}

    # Laatste controle: geen enkele naam mag erin staan.
    for obj in (menu, keuken):
        tekst = json.dumps(obj, ensure_ascii=False)
        if naam_test and naam_test.search(tekst):
            raise SystemExit("Er staat nog een naam in de uitvoer; niets opgeslagen.")

    json.dump(menu, open(os.path.join(ROOT, "menu.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    json.dump(keuken, open(os.path.join(ROOT, "data", "keuken.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("ok:", len(menu["dagen"]), "dagen,", len(week), "in gastenweek,", len(recepten), "recepten")


if __name__ == "__main__":
    main()
