"""Capas extra: recursos (centrales eléctricas), maravillas (Patrimonio de la Humanidad y parques nacionales),
mejoras de casilla (autovías, ferrocarril, aeropuertos), la energía de cada provincia y la bibliografía
(sources.json). La lógica de enlaces entre hexágonos es la de usaciv (pipeline/build/infrastructure.py, MIT).
"""

from __future__ import annotations

import csv
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict

import geo
from build_stats import eurostat
from common import load_interim, raw, write_web
from fetch import read_manifest
from sources import SOURCES

# ---------------------------------------------------------------------------------------------- utilidades de celdas


def nearest_land(grid, owner, x, y, rings=2, prefer=None):
    c = grid.cell_at(x, y)
    if c >= 0 and owner[c] >= 0:
        return c
    seen, frontier = {c}, [c] if c >= 0 else []
    for _ in range(rings):
        nxt = []
        for f in frontier:
            for n in grid.neighbours(f):
                if n not in seen:
                    seen.add(n)
                    nxt.append(n)
        land = [n for n in nxt if owner[n] >= 0]
        if land:
            return min(land, key=lambda n: (grid.center(n)[0] - x) ** 2 + (grid.center(n)[1] - y) ** 2)
        frontier = nxt
    return -1


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]+", " ", s).strip()


# ---------------------------------------------------------------------------------------------- recursos

RES_TYPES = [
    {"id": "nuclear", "name": "Central nuclear", "category": "energy", "emoji": "☢️", "icon": "r-nuclear", "color": "#e8d44d",
     "unit": "MW", "source": "wri_gppd", "fuel": "Nuclear", "min": 0,
     "description": "Las cinco centrales nucleares en servicio (Almaraz, Ascó, Cofrentes, Vandellós II y Trillo). Valor: potencia instalada."},
    {"id": "hydro", "name": "Central hidroeléctrica", "category": "energy", "emoji": "💧", "icon": "r-hydro", "color": "#3fa7d6",
     "unit": "MW", "source": "wri_gppd", "fuel": "Hydro", "min": 100,
     "description": "Centrales hidroeléctricas de 100 MW o más, sumando los grupos de una misma presa (Aldeadávila, José María de Oriol, Villarino…)."},
    {"id": "pumped_storage", "name": "Bombeo", "category": "energy", "emoji": "🔄", "icon": "r-pumped_storage", "color": "#2f7fb8",
     "unit": "MW", "source": "wri_gppd", "fuel": None, "min": 100,
     "description": "Centrales hidroeléctricas reversibles de 100 MW o más (La Muela–Cortes de Pallás…), detectadas por su nombre."},
    {"id": "gas_plant", "name": "Ciclo combinado de gas", "category": "energy", "emoji": "⚡", "icon": "r-gas_plant", "color": "#f08a24",
     "unit": "MW", "source": "wri_gppd", "fuel": "Gas", "min": 400,
     "description": "Centrales de gas de 400 MW o más, sumando los grupos de un mismo emplazamiento."},
    {"id": "oil_plant", "name": "Central de fuel o diésel", "category": "energy", "emoji": "🛢️", "icon": "r-oil", "color": "#6a5a4a",
     "unit": "MW", "source": "wri_gppd", "fuel": "Oil", "min": 150,
     "description": "Centrales de fuel, gasóleo o turbinas de gas de 150 MW o más: sobre todo las de Canarias, Baleares, Ceuta y Melilla, que no están conectadas a la red peninsular."},
    {"id": "wind", "name": "Parques eólicos", "category": "energy", "emoji": "🌬️", "icon": "r-wind", "color": "#9fd8cb",
     "unit": "MW", "source": "wri_gppd", "fuel": "Wind", "min": 120, "per_hex": True,
     "description": "Hexágonos con 120 MW eólicos o más sumando sus parques. La base de datos es de 2021: faltan los parques posteriores."},
    {"id": "solar", "name": "Plantas solares", "category": "energy", "emoji": "☀️", "icon": "r-solar", "color": "#ffc93c",
     "unit": "MW", "source": "wri_gppd", "fuel": "Solar", "min": 80, "per_hex": True,
     "description": "Hexágonos con 80 MW solares o más (termosolares y fotovoltaicas). La base de datos es de 2021: no recoge la gran ola fotovoltaica de 2021–2025, así que la solar real es varias veces mayor."},
]
RES_NOTE = ("Solo se cuentan las centrales dibujadas (cada tipo tiene un umbral) y la base de datos es de 2021: no es la "
            "potencia total de cada provincia ni del país. Las centrales de carbón no se dibujan porque casi todas han cerrado desde entonces.")
PUMP_RE = re.compile(r"muela|bombeo|aguayo|moralets|estany gento|tajo de la encantada|villarino|torrejon|guillena", re.I)


def site_key(name):
    n = norm(name)
    n = re.sub(r"\b(grupo|gr|g|unidad|central|ct|cn|ccc|ctcc|c t|p e|pe|planta|parque eolico|solar termica|i{1,3}|iv|v|vi|vapor|gas|turbina|diesel|[0-9]+)\b", " ", n)
    return " ".join(n.split()[:2])


def title(s):
    small = {"de", "del", "la", "las", "los", "el", "y", "i"}
    words = re.sub(r"\s+", " ", s).strip().split(" ")
    out = []
    for k, w in enumerate(words):
        lw = w.lower()
        out.append(lw if (k and lw in small) else (w if any(ch.islower() for ch in w) else w.capitalize()))
    return " ".join(out)


def build_resources(W, grid, proj, cities):
    owner, prov_codes = W["owner"], W["prov_codes"]
    rows = [r for r in csv.DictReader(open(raw("wri_gppd", "global_power_plant_database.csv"), encoding="utf-8"))
            if r["country"] == "ESP"]
    city_by_muni = {c["id"]: c["id"] for c in cities}
    items = []
    for t in RES_TYPES:
        if t["id"] == "pumped_storage":
            sel = [r for r in rows if r["primary_fuel"] == "Hydro" and PUMP_RE.search(r["name"])]
        elif t["id"] == "hydro":
            sel = [r for r in rows if r["primary_fuel"] == "Hydro" and not PUMP_RE.search(r["name"])]
        else:
            sel = [r for r in rows if r["primary_fuel"] == t["fuel"]]
        groups = defaultdict(list)
        for r in sel:
            lon, lat = float(r["longitude"]), float(r["latitude"])
            x, y = proj(lon, lat)
            cell = nearest_land(grid, owner, x, y)
            if cell < 0:
                continue
            key = cell if t.get("per_hex") else (site_key(r["name"]), round(x / 40), round(y / 40))
            groups[key].append((r, x, y, cell))
        for key, g in groups.items():
            mw = sum(float(r["capacity_mw"] or 0) for r, *_ in g)
            if mw < t["min"]:
                continue
            g.sort(key=lambda e: -float(e[0]["capacity_mw"] or 0))
            r0, x, y, cell = g[0]
            if t.get("per_hex"):
                name = f"{len(g)} parque{'s' if len(g) > 1 else ''}" if t["id"] == "wind" else f"{len(g)} planta{'s' if len(g) > 1 else ''}"
                detail = ", ".join(title(e[0]["name"]) for e in g[:3]) + ("…" if len(g) > 3 else "")
                x = sum(e[1] for e in g) / len(g)
                y = sum(e[2] for e in g) / len(g)
            else:
                name = title(re.sub(r"\s*(GRUPO|GR|Grupo|UNIDAD)?\s*\d+.*$", "", r0["name"]).strip(" -")) or title(r0["name"])
                owners = Counter(e[0]["owner"] for e in g if e[0]["owner"]).most_common(1)
                yrs = [int(float(e[0]["commissioning_year"])) for e in g if e[0]["commissioning_year"]]
                detail = ", ".join(filter(None, [f"{len(g)} grupos" if len(g) > 1 else "",
                                                 f"desde {min(yrs)}" if yrs else "", title(owners[0][0]) if owners else ""]))
            items.append({"type": t["id"], "name": name, "x": round(x, 1), "y": round(y, 1), "cell": int(cell),
                          "value": round(mw), "detail": detail, "state": geo_abbr(W, cell), "cbsa": None})
    types = [{k: v for k, v in t.items() if k not in ("fuel", "min", "per_hex")} for t in RES_TYPES]
    nat = {t["id"]: {"count": 0, "value": 0, "unit": t["unit"]} for t in RES_TYPES}
    st = defaultdict(lambda: defaultdict(lambda: {"count": 0, "value": 0, "unit": "MW"}))
    for it in items:
        nat[it["type"]]["count"] += 1
        nat[it["type"]]["value"] += it["value"]
        s = st[it["state"]][it["type"]]
        s["count"] += 1
        s["value"] += it["value"]
    out = {"types": types, "items": items,
           "summary": {"note": RES_NOTE, "national": nat, "states": {k: dict(v) for k, v in st.items()}}}
    print(f"    recursos: {Counter(i['type'] for i in items)}")
    return out


def geo_abbr(W, cell):
    from spain import PROVINCIAS
    o = W["owner"][cell]
    return PROVINCIAS[W["prov_codes"][o]][2] if o >= 0 else None


# ---------------------------------------------------------------------------------------------- maravillas

NATIONAL_PARKS = [  # (nombre, palabra clave en Wikidata, motivo, lon, lat de respaldo)
    ("Picos de Europa", "picos de europa", "peak", -4.85, 43.2), ("Ordesa y Monte Perdido", "ordesa", "canyon", 0.05, 42.65),
    ("Aigüestortes i Estany de Sant Maurici", "aiguestortes", "peak", 0.95, 42.58), ("Sierra Nevada", "sierra nevada", "peak", -3.3, 37.07),
    ("Sierra de Guadarrama", "guadarrama", "peak", -3.95, 40.85), ("Teide", "teide", "peak", -16.64, 28.27),
    ("Caldera de Taburiente", "taburiente", "canyon", -17.88, 28.73), ("Timanfaya", "timanfaya", "geyser", -13.78, 29.01),
    ("Garajonay", "garajonay", "forest", -17.24, 28.13), ("Cabañeros", "cabaneros", "forest", -4.49, 39.4),
    ("Monfragüe", "monfrague", "canyon", -5.97, 39.83), ("Tablas de Daimiel", "daimiel", "coast", -3.7, 39.14),
    ("Doñana", "donana", "coast", -6.44, 37.0), ("Islas Atlánticas de Galicia", "cies", "coast", -8.9, 42.23),
    ("Archipiélago de Cabrera", "cabrera", "coast", 2.95, 39.15), ("Sierra de las Nieves", "sierra de las nieves", "forest", -5.0, 36.7),
]
WHS_NAMES = {"803": "Las Médulas"}  # elementos sin etiqueta en Wikidata
UNESCO_NATURAL = {"doñana", "garajonay", "teide", "pirineos", "ibiza", "hayedos", "beech"}


def motif_for(name):
    n = norm(name)
    rules = [("universidad", "hall"), ("acueducto", "bridge"), ("puente", "bridge"), ("arte rupestre", "carved"),
             ("cueva", "carved"), ("altamira", "carved"), ("siega verde", "carved"), ("atapuerca", "mound"),
             ("dolmen", "mound"), ("talayot", "mound"), ("menorca", "mound"), ("gaudi", "spire"), ("sagrada", "spire"),
             ("catedral", "mission"), ("monasterio", "mission"), ("iglesia", "mission"), ("mudejar", "mission"),
             ("prerromanico", "mission"), ("san millan", "mission"), ("poblet", "mission"), ("guadalupe", "mission"),
             ("escorial", "rotunda"), ("alhambra", "rotunda"), ("mezquita", "rotunda"), ("cordoba", "rotunda"),
             ("alcazar", "rotunda"), ("asturias", "mission"), ("laguna", "quarter"), ("risco", "carved"),
             ("zahra", "arch"), ("medulas", "canyon"), ("tramontana", "peak"),
             ("palau", "rotunda"), ("lonja", "brickhall"), ("muralla", "arch"), ("merida", "arch"), ("tarraco", "arch"),
             ("medina azahara", "arch"), ("las medulas", "canyon"), ("almaden", "gantry"), ("hercules", "coast"),
             ("faro", "coast"), ("camino", "memorial"), ("palmeral", "forest"), ("paisaje", "forest"),
             ("aranjuez", "forest"), ("prado", "rotunda"), ("vizcaya", "bridge"), ("tramuntana", "peak"),
             ("pirineos", "peak"), ("ibiza", "coast"), ("hayedos", "forest"), ("teide", "peak"),
             ("garajonay", "forest"), ("donana", "coast")]
    for k, m in rules:
        if k in n:
            return m
    if any(k in n for k in ("ciudad", "centro historico", "casco", "conjunto", "barrio", "villa")):
        return "quarter"
    return "obelisk"


def build_wonders(W, grid, proj, cities):
    owner = W["owner"]
    b = json.loads(raw("wikidata", "unesco.json").read_text())["results"]["bindings"]
    by_site = defaultdict(list)
    for r in b:
        whs = r.get("whs", {}).get("value")
        if not whs:
            continue
        base = re.match(r"\d+", whs)
        if not base:
            continue
        m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", r["coord"]["value"])
        by_site[base.group(0)].append((r["itemLabel"]["value"], float(m.group(1)), float(m.group(2)),
                                       int(r["year"]["value"]) if r.get("year") else None, whs))
    wonders = []
    for site, entries in by_site.items():
        # el elemento cuyo código no tiene sufijo (el bien principal), si no el de nombre más largo
        main = sorted(entries, key=lambda e: (e[4] != site, re.fullmatch(r"Q\d+", e[0]) is not None, -len(e[0])))[0]
        name, lon, lat, year, _ = main
        if re.fullmatch(r"Q\d+", name):
            name = WHS_NAMES.get(site, name)
        if not (-19 < lon < 5 and 27 < lat < 44.5):
            continue
        x, y = proj(lon, lat)
        cell = nearest_land(grid, owner, x, y)
        if cell < 0:
            continue
        nat = any(k in norm(name) for k in map(norm, UNESCO_NATURAL))
        kind = "university" if "universidad" in norm(name) else ("natural" if nat else "landmark")
        wonders.append({"id": f"whs-{site}", "name": name[:1].upper() + name[1:], "short": short_wonder(name), "kind": kind,
                        "rule": "unesco", "rank": None, "metrics": {"inscribed": year or min((e[3] for e in entries if e[3]), default=None),
                                                                     "parts": len(entries), "whs": site},
                        "x": round(x, 1), "y": round(y, 1), "cell": int(cell), "cells": None, "county": None, "cbsa": None,
                        "state": geo_abbr(W, cell), "curated": False, "motif": motif_for(name)})
    wonders.sort(key=lambda w: (w["metrics"]["inscribed"] or 9999, w["name"]))
    for k, w in enumerate(wonders):
        w["rank"] = k + 1
    # parques nacionales
    pb = json.loads(raw("wikidata", "parques.json").read_text())["results"]["bindings"]
    wd = []
    for r in pb:
        m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", r["coord"]["value"])
        wd.append((norm(r["itemLabel"]["value"]), float(m.group(1)), float(m.group(2)),
                   float(r["area"]["value"]) if r.get("area") else None))
    parks = []
    for k, (name, key, motif, lon, lat) in enumerate(NATIONAL_PARKS):
        hits = [e for e in wd if key in e[0]]
        if hits:
            lon, lat = hits[0][1], hits[0][2]
        x, y = proj(lon, lat)
        cell = nearest_land(grid, owner, x, y, rings=3)
        if cell < 0:
            continue
        parks.append({"id": f"pn-{norm(key).replace(' ', '-')}", "name": f"Parque Nacional de {name}" if not name.startswith(("Archipiélago", "Islas", "Sierra", "Tablas", "Picos", "Caldera"))
                      else f"Parque Nacional {'de las' if name.startswith(('Islas', 'Tablas')) else 'de la' if name.startswith(('Sierra', 'Caldera')) else 'de los' if name.startswith('Picos') else 'del'} {name}",
                      "short": short_wonder(name) if norm(name) != norm(short_wonder(name)) and len(name) > 24 else name,
                      "kind": "natural", "rule": "national_park", "rank": k + 1,
                      "metrics": {"source_coords": "wikidata" if hits else "aprox."},
                      "x": round(x, 1), "y": round(y, 1), "cell": int(cell), "cells": None, "county": None, "cbsa": None,
                      "state": geo_abbr(W, cell), "curated": False, "motif": motif})
    # Un parque y un bien UNESCO en la misma casilla (Doñana, Teide, Garajonay): queda el bien UNESCO.
    taken = {w["cell"] for w in wonders}
    parks = [p for p in parks if p["cell"] not in taken]
    rules = [
        {"id": "unesco", "kind": "landmark", "kinds": ["landmark", "natural", "university"],
         "text": f"Los {len(wonders)} bienes españoles inscritos en la Lista del Patrimonio Mundial de la UNESCO (Wikidata), "
                 "colocados en su elemento principal; numerados por año de inscripción. Los bienes en serie (Camino de Santiago, "
                 "arte rupestre del arco mediterráneo, mudéjar de Aragón…) se dibujan en un solo punto."},
        {"id": "national_park", "kind": "natural", "kinds": ["natural"],
         "text": "Los 16 parques nacionales de la Red de Parques Nacionales (coordenadas de Wikidata), salvo los que ya son "
                 "Patrimonio de la Humanidad en la misma casilla."},
    ]
    print(f"    maravillas: {len(wonders)} UNESCO, {len(parks)} parques nacionales")
    return {"version": 1, "vintage": {"unesco": "Wikidata, consulta del día", "parks": "Red de Parques Nacionales"},
            "sources": ["wikidata"], "rules": rules, "national": {"unesco": len(wonders), "national_parks": len(NATIONAL_PARKS)},
            "wonders": wonders + parks}


SHORT = [  # (expresión sobre el nombre normalizado, nombre corto para el mapa)
    ("alhambra", "Alhambra"), ("acueducto de segovia", "Acueducto de Segovia"), ("reino de asturias", "Prerrománico asturiano"),
    ("centro historico de cordoba", "Mezquita de Córdoba"), ("catedral de burgos", "Catedral de Burgos"), ("escorial", "El Escorial"),
    ("gaudi", "Obras de Gaudí"), ("camino", "Camino de Santiago"), ("santiago de compostela", "Santiago de Compostela"), ("avila", "Ávila"), ("caceres", "Cáceres"),
    ("mudejar", "Mudéjar de Aragón"), ("toledo", "Toledo"), ("garajonay", "Garajonay"), ("salamanca", "Salamanca"),
    ("archivo de indias", "Catedral y Alcázar de Sevilla"), ("poblet", "Poblet"), ("merida", "Mérida"),
    ("guadalupe", "Guadalupe"), ("camino", "Camino de Santiago"), ("donana", "Doñana"), ("altamira", "Altamira"),
    ("pirineos", "Monte Perdido"), ("cuenca", "Cuenca"), ("lonja", "Lonja de Valencia"), ("palau de la musica", "Palau de la Música"),
    ("san millan", "San Millán"), ("medulas", "Las Médulas"), ("arco mediterraneo", "Arte rupestre levantino"),
    ("alcala de henares", "Alcalá de Henares"), ("tarraco", "Tarraco"), ("palmeral", "Palmeral de Elche"), ("ibiza", "Ibiza"),
    ("lugo", "Muralla de Lugo"), ("atapuerca", "Atapuerca"), ("laguna", "La Laguna"), ("aranjuez", "Aranjuez"),
    ("vizcaya", "Puente de Vizcaya"), ("teide", "Teide"), ("hercules", "Torre de Hércules"), ("mercurio", "Almadén"),
    ("tramuntana", "Sierra de Tramuntana"), ("tramontana", "Sierra de Tramuntana"), ("zahra", "Medina Azahara"),
    ("bohi", "Vall de Boí"), ("aiguestortes", "Aigüestortes"), ("antequera", "Dólmenes de Antequera"), ("azahara", "Medina Azahara"),
    ("risco caido", "Risco Caído"), ("prado", "Paseo del Prado y el Retiro"), ("talayot", "Menorca talayótica"),
    ("ubeda", "Úbeda y Baeza"), ("siega verde", "Siega Verde"), ("boi", "Vall de Boí"), ("hayedos", "Hayedos"),
    ("las medulas", "Las Médulas"), ("tarragona", "Tarraco"), ("cadiz", "Cádiz"), ("sevilla", "Sevilla"),
]


def short_wonder(name):
    n = norm(name)
    for k, v in SHORT:
        if norm(k) in n:
            return v
    s = re.sub(r"^(conjunto arqueol[oó]gico|ciudad (vieja|hist[oó]rica( fortificada)?)|centro hist[oó]rico|casco (viejo|antiguo))"
               r"( y [^,]+?)?\s+de\s+", "", name, flags=re.I)
    return (s[:1].upper() + s[1:])[:40]


# ---------------------------------------------------------------------------------------------- carreteras y tren

SAMPLE = 4.0 * geo.SCALE / 3.5 * 1.0  # cada ~4 unidades de mapa (≈1,1 km)


def _axial(grid, cell):
    col, row = cell % grid.cols, cell // grid.cols
    return col - (row - (row & 1)) // 2, row


def _from_axial(grid, q, r):
    col = q + (r - (r & 1)) // 2
    return r * grid.cols + col if 0 <= col < grid.cols and 0 <= r < grid.rows else -1


def hex_distance(grid, a, b):
    (q1, r1), (q2, r2) = _axial(grid, a), _axial(grid, b)
    return (abs(q1 - q2) + abs(r1 - r2) + abs((q1 + r1) - (q2 + r2))) // 2


def hex_walk(grid, a, b):
    n = hex_distance(grid, a, b)
    if n <= 1:
        return [a, b] if a != b else [a]
    (q1, r1), (q2, r2) = _axial(grid, a), _axial(grid, b)
    out = []
    for i in range(n + 1):
        t = i / n
        x = q1 + (q2 - q1) * t + 1e-6
        z = r1 + (r2 - r1) * t + 1e-6
        y = -x - z
        rx, ry, rz = round(x), round(y), round(z)
        dx, dy, dz = abs(rx - x), abs(ry - y), abs(rz - z)
        if dx > dy and dx > dz:
            rx = -ry - rz
        elif dy <= dz:
            rz = -rx - ry
        c = _from_axial(grid, rx, rz)
        if c >= 0 and (not out or out[-1] != c):
            out.append(c)
    return out


def sample_cells(grid, pts, step):
    runs, run = [], []
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, math.ceil(math.hypot(x1 - x0, y1 - y0) / step))
        for i in range(n):
            t = i / n
            c = grid.cell_at(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
            if c >= 0 and (not run or run[-1] != c):
                run.append(c)
    if pts:
        c = grid.cell_at(*pts[-1])
        if c >= 0 and (not run or run[-1] != c):
            run.append(c)
    if len(run) > 1:
        runs.append(run)
    return runs


def straighten(grid, run):
    out = []
    for c in run:
        while len(out) >= 2 and c in grid.neighbours(out[-2]):
            out.pop()
        if not out or out[-1] != c:
            out.append(c)
    return out


def links_of(grid, run):
    out = []
    run = straighten(grid, [c for path in ([run[0]], *(hex_walk(grid, a, b)[1:] for a, b in zip(run, run[1:]))) for c in path])
    for a, b in zip(run, run[1:]):
        path = hex_walk(grid, a, b)
        for u, v in zip(path, path[1:]):
            if u != v:
                out.append((u, v) if u < v else (v, u))
    return out


def ne_lines(fn):
    for f in json.loads(raw("natural_earth_roads", "v5.1.2", f"{fn}.geojson").read_text())["features"]:
        g = f["geometry"]
        if not g:
            continue
        lines = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
        lines = [l for l in lines if any(geo.BBOX[0] < x < geo.BBOX[2] and geo.BBOX[1] < y < geo.BBOX[3] for x, y in l[::2])]
        if lines:
            yield f["properties"], lines


def build_infra(W, grid, proj, cities):
    owner = W["owner"]
    step = 4.0
    cls_of, names = defaultdict(lambda: 9), defaultdict(Counter)
    for p, lines in ne_lines("ne_10m_roads"):
        sr = p.get("scalerank") if p.get("scalerank") is not None else 99
        t = p.get("type")
        if t == "Ferry Route" or sr > 7:
            continue
        motorway = t == "Major Highway" and p.get("expressway") == 1
        if not motorway and t not in ("Major Highway", "Secondary Highway") :
            continue
        cls = 0 if motorway else 1
        label = p.get("label") or p.get("name")
        for line in lines:
            X, Y = proj([q[0] for q in line], [q[1] for q in line], canarias=False)
            for run in sample_cells(grid, list(zip(X.tolist(), Y.tolist())), step):
                for a, b in links_of(grid, run):
                    if owner[a] < 0 and owner[b] < 0 or owner[a] == -2 or owner[b] == -2:
                        continue
                    if cls < cls_of[(a, b)]:
                        cls_of[(a, b)] = cls
                        names[(a, b)].clear()
                    if cls == cls_of[(a, b)] and label:
                        names[(a, b)][label] += 1
    roads = sorted([[a, b, c, (names[(a, b)].most_common(1)[0][0] if names[(a, b)] else None)] for (a, b), c in cls_of.items()])
    tier_of = defaultdict(lambda: 9)
    for p, lines in ne_lines("ne_10m_railroads"):
        sr = p.get("scalerank") if p.get("scalerank") is not None else 99
        if sr > 8:
            continue
        tier = 0 if sr <= 5 else 1
        for line in lines:
            X, Y = proj([q[0] for q in line], [q[1] for q in line], canarias=False)
            for run in sample_cells(grid, list(zip(X.tolist(), Y.tolist())), step):
                for a, b in links_of(grid, run):
                    if owner[a] < 0 or owner[b] < 0:
                        continue
                    tier_of[(a, b)] = min(tier_of[(a, b)], tier)
    rail = sorted([[a, b, t] for (a, b), t in tier_of.items()])

    # aeropuertos: pasajeros de Eurostat (avia_paoa) + coordenadas de Wikidata (por código OACI)
    get, cats = eurostat(raw("eurostat_air", "avia_paoa.json"))
    years = sorted(cats["time"], reverse=True)
    sched = "TOT" if "TOT" in cats.get("schedule", {}) else None
    cov = "TOTAL" if "TOTAL" in cats.get("tra_cov", {}) else None
    pax = {}
    for code in cats["rep_airp"]:
        if not code.startswith("ES_"):
            continue
        kw = {"rep_airp": code}
        if sched:
            kw["schedule"] = sched
        if cov:
            kw["tra_cov"] = cov
        for y in years:
            v = get(time=y, **kw)
            if v:
                prev = get(time=str(int(y) - 1), **kw) if str(int(y) - 1) in cats["time"] else None
                pax[code[3:]] = (v, prev, int(y))
                break
    coords = {}
    for r in json.loads(raw("wikidata", "aeropuertos.json").read_text())["results"]["bindings"]:
        m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", r["coord"]["value"])
        icao = r["icao"]["value"]
        if m and icao not in coords:
            coords[icao] = (float(m.group(1)), float(m.group(2)), r["itemLabel"]["value"], r.get("iata", {}).get("value"))
    airports = []
    for icao, (v, prev, y) in sorted(pax.items(), key=lambda kv: -kv[1][0]):
        if v < 100000 or icao not in coords:
            continue
        lon, lat, name, iata = coords[icao]
        x, y_ = proj(lon, lat)
        cell = nearest_land(grid, owner, x, y_)
        if cell < 0:
            continue
        hub = "L" if v >= 20e6 else "M" if v >= 5e6 else "S" if v >= 1e6 else "N"
        airports.append({"id": iata or icao, "icao": icao, "name": name, "city": None, "hub": hub, "enplanements": round(v),
                         "enplanements_prev": round(prev) if prev else None, "cargo_lbs": None, "year": y,
                         "x": round(x, 1), "y": round(y_, 1), "cell": int(cell), "county": None, "cbsa": None,
                         "state": geo_abbr(W, cell)})
    print(f"    {len(roads)} tramos de carretera, {len(rail)} de tren, {len(airports)} aeropuertos")
    return {
        "version": 1,
        "vintage": {"roads": "Natural Earth v5.1.2 (1:10m)", "rail": "Natural Earth v5.1.2 (1:10m)",
                    "airports": f"Eurostat avia_paoa, {airports[0]['year'] if airports else ''}"},
        "sources": ["natural_earth_roads", "eurostat_air", "wikidata"],
        "rules": {
            "roads": "Carreteras de Natural Earth 1:10m muestreadas cada ~1 km y ajustadas a enlaces entre centros de hexágono. "
                     "Clase 0: autovías y autopistas (vías rápidas «Major Highway»). Clase 1: otras carreteras principales de rango 7 o menos.",
            "rail": "Ferrocarriles de Natural Earth 1:10m de rango 8 o menos; las líneas principales son las de rango 5 o menos. "
                    "No distingue alta velocidad ni ancho de vía.",
            "ports": "",
            "airports": "Aeropuertos con al menos 100.000 pasajeros al año según Eurostat (datos de AENA), colocados por su código OACI con "
                        "las coordenadas de Wikidata. Clase: grande ≥ 20 M, mediano ≥ 5 M, pequeño ≥ 1 M pasajeros.",
        },
        "road_classes": [{"id": "interstate", "name": "Autovía"}, {"id": "major", "name": "Carretera principal"}],
        "rail_tiers": [{"id": "main", "name": "Línea principal"}, {"id": "secondary", "name": "Línea secundaria"}],
        "hubs": {"L": "Gran aeropuerto (20 M+ pasajeros)", "M": "Aeropuerto mediano (5 M+)", "S": "Aeropuerto pequeño (1 M+)",
                 "N": "Aeropuerto regional"},
        "roads": roads, "rail": rail, "ports": [], "airports": airports,
    }


# ---------------------------------------------------------------------------------------------- bibliografía


def build_sources(S):
    used = S.get("files", {})
    out = []
    for s in SOURCES:
        man = read_manifest(s["id"])
        names = sorted(man)
        if s["id"] in used:
            names = [n for n in names if n in set(used[s["id"]])] or names
        files = [{"file": n, "url": man[n]["url"], "retrieved": man[n]["retrieved"], "sha256": man[n]["sha256"],
                  "bytes": man[n]["bytes"]} for n in names]
        out.append({k: v for k, v in s.items() if k != "files"} | {"vintage": None, "files": files})
    return out


def build():
    W = load_interim("_world")
    S = load_interim("_stats")
    C = load_interim("_cities")
    grid = geo.HexGrid(**W["grid"])
    proj = W["proj"]
    cities = C["cities"]
    res = build_resources(W, grid, proj, cities)
    write_web("resources.json", res)
    write_web("wonders.json", build_wonders(W, grid, proj, cities))
    write_web("infrastructure.json", build_infra(W, grid, proj, cities))
    # energía por provincia (solo lo dibujado)
    states = C["states"]
    from spain import PROVINCIAS
    abbr_idx = {PROVINCIAS[c][2]: i for i, c in enumerate(W["prov_codes"])}
    mw_types = [t["id"] for t in RES_TYPES if t["unit"] == "MW"]
    for s in states:
        by, sites = {t: 0 for t in mw_types}, {t: 0 for t in mw_types}
        for it in res["items"]:
            if it["state"] == s["abbr"]:
                by[it["type"]] += it["value"] or 0
                sites[it["type"]] += 1
        s["energy"] = {"unit": "MW", "total": sum(by.values()), "by_type": by, "sites": sites, "note": RES_NOTE}
    write_web("states.json", states)
    write_web("sources.json", build_sources(S))


if __name__ == "__main__":
    build()
