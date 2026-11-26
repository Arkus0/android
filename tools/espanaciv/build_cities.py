"""Ciudades (las 151 capitales y principales ciudades del Censo), provincias y nación: cities.json, states.json,
nation.json. Mismo contrato que usaciv (docs/DATA_CONTRACTS.md), con datos españoles:

* Comida, Producción, Ciencia y Cultura = ocupados por actividad (CNAE a 2 dígitos) del Censo anual, contados
  donde viven. Oro = PIB (Eurostat/INE). El PIB de una ciudad no se publica: se estima repartiendo el VAB de su
  provincia por ramas según los ocupados de la ciudad en cada rama (por eso lleva ≈).
* Población = Padrón a 1 de enero; crecimiento 2021 → último año, con las mismas cifras oficiales.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict

import numpy as np

import geo
from build_stats import A6, A6_NAME, RAMAS, rows, code_of, num
from common import load_interim, raw, save_interim, write_web
from spain import CCAA, PROVINCIAS

YIELDS = [
    {"key": "food", "icon": "y-food", "emoji": "🌾", "label": "Comida", "color": "#7fbf3f", "unit": "workers",
     "industries": ["agriculture"],
     "description": "Ocupados en agricultura, ganadería, silvicultura y pesca (CNAE 01–03), contados donde viven (Censo anual del INE)."},
    {"key": "production", "icon": "y-production", "emoji": "⚙️", "label": "Producción", "color": "#d9823b", "unit": "workers",
     "industries": ["manufacturing", "construction", "mining"],
     "description": "Ocupados en industria manufacturera, construcción e industrias extractivas (CNAE 05–33 y 41–43), contados donde viven (Censo anual)."},
    {"key": "gold", "icon": "y-gold", "emoji": "💰", "label": "Oro", "color": "#f2c94c", "unit": "eur", "industries": [],
     "description": "Producto interior bruto anual en euros corrientes (Eurostat, cuentas regionales NUTS 3, que elabora el INE). "
     "El INE no publica el PIB municipal: el de cada ciudad es una estimación (≈) que reparte el valor añadido de su "
     "provincia, rama a rama, según los ocupados que viven en la ciudad, más su parte de impuestos."},
    {"key": "science", "icon": "y-science", "emoji": "🔬", "label": "Ciencia", "color": "#4fa3e0", "unit": "workers",
     "industries": ["professional", "management", "information"],
     "description": "Ocupados en actividades profesionales, científicas y técnicas y en información y comunicaciones (CNAE 58–63 y 69–75), contados donde viven (Censo anual)."},
    {"key": "culture", "icon": "y-culture", "emoji": "🎭", "label": "Cultura", "color": "#b07ce0", "unit": "workers",
     "industries": ["arts"],
     "description": "Ocupados en actividades artísticas, recreativas, de entretenimiento y deporte (CNAE 90–93), contados donde viven (Censo anual)."},
]
GDP_KEYS = list(A6) + ["taxes"]
GDP_NAMES = {**A6_NAME, "taxes": "Impuestos netos sobre los productos"}

# Nombre corto para el mapa (el INE pone primero la forma cooficial o el artículo al final).
NOMBRE = {"31201": "Pamplona", "46250": "Valencia", "07040": "Palma", "12040": "Castellón", "15030": "A Coruña",
          "08101": "L'Hospitalet", "35016": "Las Palmas", "38038": "Santa Cruz de Tenerife",
          "03122": "San Vicente del Raspeig", "08245": "Santa Coloma", "29069": "Marbella", "20069": "San Sebastián",
          "01059": "Vitoria", "48020": "Bilbao", "36057": "Vigo", "11012": "Cádiz"}


def short_name(code, ine):
    if code in NOMBRE:
        return NOMBRE[code]
    n = ine.strip()
    m = re.match(r"^(.*), (El|La|Los|Las|L'|A|O|Os|As|Es|Sa|Ses|Els|Les)$", n)
    if m:
        art = m.group(2)
        n = f"{art}{'' if art.endswith(chr(39)) else ' '}{m.group(1)}"
    if "/" in n:
        n = n.split("/")[-1].strip()
    return n


def full_name(ine):
    n = ine.strip()
    m = re.match(r"^(.*), (El|La|Los|Las|L'|A|O|Os|As|Es|Sa|Ses|Els|Les)$", n)
    if m:
        art = m.group(2)
        n = f"{art}{'' if art.endswith(chr(39)) else ' '}{m.group(1)}"
    return n


UNIPROV = {"03", "04", "06", "13", "14", "15", "17", "18", "19"}  # CCAA de una sola provincia (códigos CCAA)


def full_label(name, pcode):
    prov, ccaa_code = PROVINCIAS[pcode][0], PROVINCIAS[pcode][3]
    ccaa = CCAA[ccaa_code]
    if ccaa_code in UNIPROV or prov == ccaa:
        return f"{name} · {ccaa}"
    return f"{name} · provincia de {prov} ({ccaa})"


def yields_of(jobs, gdp):
    return {
        "food": jobs.get("agriculture"),
        "production": sum(jobs.get(k) or 0 for k in ("manufacturing", "construction", "mining")),
        "gold": gdp,
        "science": sum(jobs.get(k) or 0 for k in ("professional", "management", "information")),
        "culture": jobs.get("arts"),
    }


def rank_map(items, key, reverse=True):
    vals = [(it, key(it)) for it in items]
    ok = [(it, v) for it, v in vals if v is not None]
    ok.sort(key=lambda t: (-(t[1]) if reverse else t[1], -(t[0].get("population") or 0)))
    return {id(it): r + 1 for r, (it, _) in enumerate(ok)}


def wmean(pairs):
    """[(valor, peso)] → media ponderada (ignora nulos)."""
    s = w = 0.0
    for v, p in pairs:
        if v is not None and p:
            s += v * p
            w += p
    return s / w if w else None


def adrh_summary():
    """Tablas resumen del ADRH (nación, CCAA, provincias): {('prov'|'nat', código): {indicador: valor}}."""
    out = defaultdict(dict)
    spec = {"renta/53689.csv": ("Indicadores de renta media", {"Renta neta media por persona": "renta_persona",
                                                               "Renta neta media por hogar": "renta_hogar",
                                                               "Mediana de la renta por unidad de consumo": "renta_mediana_uc"}),
            "demografia/53776.csv": ("Indicadores demográficos", {"Edad media de la población": "edad_media"}),
            "pobreza/53694.csv": ("Distribución de la renta por unidad de consumo", None)}
    for f, (col, want) in spec.items():
        p = raw("ine_adrh", *f.split("/"))
        if not p.exists():
            continue
        best = {}
        for r in rows(p):
            if r.get("Sexo", "Total") != "Total" or r.get("Islas"):
                continue
            if r.get("Provincias"):
                key = ("prov", code_of(r["Provincias"]))
            elif r.get("Comunidades y Ciudades Autónomas"):
                continue
            else:
                key = ("nat", "ES")
            ind = r.get(col, "")
            if want is None:
                name = "pobreza" if ("60%" in ind and "debajo" in ind) else None
            else:
                name = want.get(ind)
            v = num(r["Total"])
            if not name or v is None:
                continue
            y = int(r["Periodo"])
            if y >= best.get((key, name), 0):
                best[(key, name)] = y
                out[key][name] = v / 100 if name == "pobreza" else v
                out[key][name + "_year"] = y
    return out


def build():
    W = load_interim("_world")
    S = load_interim("_stats")
    grid = geo.HexGrid(**W["grid"])
    proj = W["proj"]
    owner, county = W["owner"], W["county"]
    prov_codes = W["prov_codes"]
    muni_ids = W["muni_ids"]
    muni_index = {m: i for i, m in enumerate(muni_ids)}
    munis = S["munis"]
    year = S["year"]
    g0 = 2021
    adrh = adrh_summary()

    coords = {}
    for b in json.loads(raw("wikidata", "municipios.json").read_text())["results"]["bindings"]:
        m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", b["coord"]["value"])
        if m:
            coords.setdefault(b["ine"]["value"], (float(m.group(1)), float(m.group(2))))

    # --- PIB por provincia y reparto a ciudades --------------------------------------------------------------
    prov_gdp, prov_gva = S["prov_gdp"], S["prov_gva"]
    provs_jobs = S["provs_jobs"]

    def city_gdp(code, cj):
        p = code[:2]
        gva, gdp = prov_gva.get(p), prov_gdp.get(p)
        pj = provs_jobs.get(p)
        if not gva or not gdp or not pj:
            return None, None
        by = {}
        for b in A6:
            e_p = pj["a6"].get(b) or 0
            by[b] = gva.get(b, 0) * (cj["a6"].get(b, 0) / e_p) if e_p else 0.0
        gva_tot = sum(gva.get(b, 0) for b in A6)
        tax_share = (gdp - gva_tot) / gdp if gdp else 0
        total_gva = sum(by.values())
        city = total_gva / (1 - tax_share) if tax_share < 1 else None
        by["taxes"] = city - total_gva if city else None
        return city, by

    def prov_gdp_by(p):
        gva, gdp = prov_gva.get(p), prov_gdp.get(p)
        if not gva or not gdp:
            return None
        by = {b: gva.get(b) for b in A6}
        by["taxes"] = gdp - sum(v or 0 for v in by.values())
        return by

    # --- ciudades ---------------------------------------------------------------------------------------------
    cities = []
    taken = {}
    city_codes = sorted(S["cities_jobs"], key=lambda c: -(munis.get(c, {}).get("pop") or 0))
    for code in city_codes:
        mrec = munis.get(code)
        cj = S["cities_jobs"][code]
        if not mrec:
            print(f"    ! {code} sin padrón")
            continue
        pcode = code[:2]
        lon, lat = coords.get(code, (None, None))
        mi = muni_index.get(code)
        if lon is None and mi is not None:
            cells = [c for c, comp in W["comp"].items() for m, _ in comp[:1] if m == mi]
            x, y = grid.center(cells[0]) if cells else (None, None)
        else:
            x, y = proj(lon, lat)
        cell = grid.cell_at(x, y)
        prov_i = prov_codes.index(pcode)
        if cell < 0 or owner[cell] < 0 or cell in taken:
            ring = [cell] + grid.neighbours(cell) if cell >= 0 else []
            ring2 = [n2 for n1 in ring for n2 in grid.neighbours(n1)]
            cands = [c for c in dict.fromkeys(ring + ring2) if c >= 0 and owner[c] >= 0 and c not in taken]
            cands.sort(key=lambda c: (owner[c] != prov_i, (grid.center(c)[0] - x) ** 2 + (grid.center(c)[1] - y) ** 2))
            if cands:
                cell = cands[0]
        if cell < 0:
            print(f"    ! {mrec['name']} sin celda")
            continue
        taken[cell] = code
        gdp, gdp_by = city_gdp(code, cj)
        ps = {str(y_): mrec["pop_series"].get(y_) for y_ in range(2020, year + 1)}
        p0, p1 = mrec["pop_series"].get(g0), mrec["pop_series"].get(year)
        growth = p1 / p0 - 1 if p0 and p1 else None
        fp = sorted(set([int(c) for c in np.nonzero(county == mi)[0].tolist()] + [cell])) if mi is not None else [cell]
        name_ine = S["city_names"].get(code) or mrec["name"]
        cities.append({
            "id": code,
            "name": short_name(code, name_ine),
            "full": full_label(full_name(name_ine), pcode),
            "states": [PROVINCIAS[pcode][2]],
            "metro": True,
            "capital": code == "28079",
            "provincial_capital": None,
            "x": round(float(x), 1), "y": round(float(y), 1), "cell": int(cell),
            "population": p1,
            "employed": cj["employed"],
            "yields": yields_of(cj["jobs"], gdp),
            "jobs": {k: (round(v) if v is not None else None) for k, v in cj["jobs"].items()},
            "median_income": mrec.get("renta_mediana_uc"),
            "renta_persona": mrec.get("renta_persona"),
            "renta_hogar": mrec.get("renta_hogar"),
            "pobreza": mrec.get("pobreza"),
            "edad_media": mrec.get("edad_media"),
            "nacidos_fuera": mrec.get("nacidos_fuera"),
            "estudios_sup": mrec.get("estudios_sup"),
            "median_rent": None, "home_value": None, "rent_burden": None,
            "unemployment": mrec.get("paro"),
            "gdp": round(gdp) if gdp else None,
            "gdp_year": S["gdp_year"],
            "gdp_by_industry": {k: (round(v) if v is not None else None) for k, v in (gdp_by or {}).items()} or None,
            "gdp_undisclosed": None,
            "gdp_estimated": GDP_KEYS if gdp else None,
            "growth": round(growth, 4) if growth is not None and abs(growth) < 0.25 else None,
            "growth_years": [g0, year],
            "counties": [code],
            "footprint": fp,
            "pop_series": ps,
        })
    # capitales de provincia: la ciudad del censo con más población no lo es siempre (Vigo/Pontevedra, Gijón/Oviedo…)
    CAPITALES = {"01": "01059", "02": "02003", "03": "03014", "04": "04013", "05": "05019", "06": "06015", "07": "07040",
                 "08": "08019", "09": "09059", "10": "10037", "11": "11012", "12": "12040", "13": "13034", "14": "14021",
                 "15": "15030", "16": "16078", "17": "17079", "18": "18087", "19": "19130", "20": "20069", "21": "21041",
                 "22": "22125", "23": "23050", "24": "24089", "25": "25120", "26": "26089", "27": "27028", "28": "28079",
                 "29": "29067", "30": "30030", "31": "31201", "32": "32054", "33": "33044", "34": "34120", "35": "35016",
                 "36": "36038", "37": "37274", "38": "38038", "39": "39075", "40": "40194", "41": "41091", "42": "42173",
                 "43": "43148", "44": "44216", "45": "45168", "46": "46250", "47": "47186", "48": "48020", "49": "49275",
                 "50": "50297", "51": "51001", "52": "52001"}
    capset = set(CAPITALES.values())
    for c in cities:
        c["provincial_capital"] = c["id"] in capset
    missing_caps = [p for p, c in CAPITALES.items() if c not in {x["id"] for x in cities}]
    if missing_caps:
        print(f"    ! capitales que no están en la tabla del censo: {missing_caps}")

    # rangos y pares
    keys = ["population", "gdp", "gdp_per_capita", "growth"] + [y["key"] for y in YIELDS]
    getters = {"population": lambda c: c["population"], "gdp": lambda c: c["gdp"],
               "gdp_per_capita": lambda c: c["gdp"] / c["population"] if c["gdp"] and c["population"] else None,
               "growth": lambda c: c["growth"]}
    for y in YIELDS:
        getters[y["key"]] = (lambda k: lambda c: c["yields"].get(k))(y["key"])
    ranks = {k: rank_map(cities, getters[k]) for k in keys}
    for c in cities:
        c["ranks"] = {k: ranks[k].get(id(c)) for k in keys}
        lp = math.log(c["population"] or 1)
        others = sorted((o for o in cities if o is not c), key=lambda o: abs(math.log(o["population"] or 1) - lp))
        c["peers"] = [o["id"] for o in others[:5]]
    cities.sort(key=lambda c: -(c["population"] or 0))

    # --- provincias ---------------------------------------------------------------------------------------------
    by_prov = defaultdict(list)
    for code, m in munis.items():
        if code[:2] in PROVINCIAS:
            by_prov[code[:2]].append(m)
    states = []
    land_keys = list(W["pct"])
    for i, p in enumerate(prov_codes):
        ms = by_prov[p]
        pj = provs_jobs.get(p, {"jobs": {}, "employed": None})
        pop = sum(m["pop"] or 0 for m in ms)
        p0 = sum(m["pop_series"].get(g0) or 0 for m in ms)
        gdp = prov_gdp.get(p)
        oc = sum(m.get("ocupados") or 0 for m in ms)
        pa = sum(m.get("parados") or 0 for m in ms)
        sup = sum(m.get("superior") or 0 for m in ms)
        p15 = sum(m.get("pob15") or 0 for m in ms if m.get("superior") is not None)
        nf = wmean([(m.get("nacidos_fuera"), m["pop"]) for m in ms])
        cells = np.nonzero(owner == i)[0]
        withc = [c for c in cells if W["cover"][c] > 0]
        land = {k: round(float(np.mean([W["pct"][k][c] for c in withc])) / 100, 3) for k in land_keys} if withc else None
        a = adrh.get(("prov", p), {})
        # etiqueta: centro de masa de sus hexágonos, tamaño según su extensión
        if len(cells):
            xs, ys = grid.center(cells)
            cx, cy = float(np.mean(xs)), float(np.mean(ys))
            span = float(max(np.ptp(xs), np.ptp(ys)))
            label = {"x": round(cx, 1), "y": round(cy, 1), "angle": 0, "size": round(min(110, max(14, span / 7)), 1)}
        else:
            label = None
        states.append({
            "fips": p, "abbr": PROVINCIAS[p][2], "name": PROVINCIAS[p][0], "full": PROVINCIAS[p][1],
            "ccaa": CCAA[PROVINCIAS[p][3]],
            "population": pop, "employed": pj.get("employed"),
            "yields": yields_of(pj["jobs"], gdp),
            "jobs": {k: (round(v) if v is not None else None) for k, v in pj["jobs"].items()},
            "median_income": a.get("renta_mediana_uc"),
            "renta_persona": a.get("renta_persona") or wmean([(m.get("renta_persona"), m["pop"]) for m in ms]),
            "renta_hogar": a.get("renta_hogar"),
            "pobreza": a.get("pobreza"),
            "edad_media": a.get("edad_media") or wmean([(m.get("edad_media"), m["pop"]) for m in ms]),
            "nacidos_fuera": nf,
            "estudios_sup": sup / p15 if p15 else None,
            "median_rent": None, "home_value": None, "rent_burden": None,
            "unemployment": pa / (oc + pa) if oc + pa else None,
            "gdp": round(gdp) if gdp else None, "gdp_year": S["gdp_year"],
            "gdp_by_industry": {k: (round(v) if v is not None else None) for k, v in (prov_gdp_by(p) or {}).items()} or None,
            "gdp_undisclosed": None, "gdp_estimated": None,
            "growth": round(pop / p0 - 1, 4) if p0 else None, "growth_years": [g0, year],
            "label": label, "land": land, "energy": None,
            "municipios": len(ms),
        })
    yranks = {y["key"]: rank_map(states, (lambda k: lambda s: s["yields"].get(k))(y["key"])) for y in YIELDS}
    for s in states:
        s["ranks"] = {k: yranks[k].get(id(s)) for k in yranks}

    # --- nación -------------------------------------------------------------------------------------------------
    nj = S["nation_jobs"]
    allm = [m for m in munis.values() if m["prov"] in PROVINCIAS]
    pop = sum(m["pop"] or 0 for m in allm)
    p0 = sum(m["pop_series"].get(g0) or 0 for m in allm)
    gdp_n = sum(s["gdp"] or 0 for s in states)
    gdp_by_n = defaultdict(float)
    for s in states:
        for k, v in (s["gdp_by_industry"] or {}).items():
            gdp_by_n[k] += v or 0
    oc = sum(m.get("ocupados") or 0 for m in allm)
    pa = sum(m.get("parados") or 0 for m in allm)
    sup = sum(m.get("superior") or 0 for m in allm)
    p15 = sum(m.get("pob15") or 0 for m in allm if m.get("superior") is not None)
    a = adrh.get(("nat", "ES"), {})
    nation = {
        "population": pop, "employed": nj["employed"], "yields": yields_of(nj["jobs"], gdp_n),
        "jobs": {k: round(v) for k, v in nj["jobs"].items()},
        "median_income": a.get("renta_mediana_uc"), "renta_persona": a.get("renta_persona"),
        "renta_hogar": a.get("renta_hogar"), "pobreza": a.get("pobreza"), "edad_media": a.get("edad_media"),
        "nacidos_fuera": wmean([(m.get("nacidos_fuera"), m["pop"]) for m in allm]),
        "estudios_sup": sup / p15 if p15 else None,
        "median_rent": None, "home_value": None, "rent_burden": None,
        "unemployment": pa / (oc + pa) if oc + pa else None,
        "gdp": round(gdp_n), "gdp_year": S["gdp_year"], "gdp_by_industry": {k: round(v) for k, v in gdp_by_n.items()},
        "gdp_undisclosed": None, "gdp_estimated": None,
        "growth": round(pop / p0 - 1, 4), "growth_years": [g0, year],
        "gdp_latest": S["nation_gdp"],
    }
    renta_year = a.get("renta_persona_year")
    write_web("nation.json", {
        "vintage": f"Censo anual {S['census_year']} · Padrón {year}", "year": year,
        "census_year": S["census_year"], "income_year": renta_year,
        "gdp_vintage": f"Eurostat/INE, PIB provincial {S['gdp_year']}",
        "nation": nation, "yields": YIELDS,
        "industries": {k: v[0] for k, v in RAMAS.items()},
        "gdp_industries": GDP_NAMES,
    })
    # población de cada municipio en world.json (para la búsqueda de municipios)
    from common import OUT
    wj = json.loads((OUT / "world.json").read_text(encoding="utf-8"))
    for c in wj["counties"]:
        c["pop"] = (munis.get(c["geoid"]) or {}).get("pop")
    write_web("world.json", wj)
    write_web("cities.json", cities)
    write_web("states.json", states)
    save_interim("_cities", {"cities": cities, "states": states, "nation": nation})
    print(f"    {len(cities)} ciudades; {len(states)} provincias; población {pop / 1e6:.2f} M; PIB {gdp_n / 1e9:.0f} mil M€")


if __name__ == "__main__":
    build()
