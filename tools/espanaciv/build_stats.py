"""Estadísticas: lee las tablas del INE y de Eurostat y deja intermedios limpios por municipio, ciudad,
provincia y para el total nacional (_stats). No sabe nada de hexágonos.
"""

from __future__ import annotations

import csv
import json
import re
from collections import defaultdict

from common import raw, save_interim
from sources import ADRH_DEMOG, ADRH_POBREZA, ADRH_RENTA, CENSO_ACTIVIDAD, CENSO_ESTUDIOS
from spain import NUTS3, PROVINCIAS

# --- CNAE 2009 a 2 dígitos → ramas (las mismas claves que usaciv, con nombres en castellano) ------------------
RAMAS = {
    "agriculture": ("Agricultura, ganadería, silvicultura y pesca", range(1, 4)),
    "mining": ("Industrias extractivas", range(5, 10)),
    "manufacturing": ("Industria manufacturera", range(10, 34)),
    "utilities": ("Energía, agua y saneamiento", list(range(35, 38))),
    "construction": ("Construcción", range(41, 44)),
    "wholesale": ("Comercio al por mayor", [46]),
    "retail": ("Comercio al por menor y talleres", [45, 47]),
    "transportation": ("Transporte y almacenamiento", range(49, 54)),
    "accommodation": ("Hostelería", range(55, 57)),
    "information": ("Información y comunicaciones", range(58, 64)),
    "finance": ("Finanzas y seguros", range(64, 67)),
    "real_estate": ("Inmobiliarias", [68]),
    "professional": ("Actividades profesionales, científicas y técnicas", [69, 71, 72, 73, 74, 75]),
    "management": ("Sedes centrales y consultoría de gestión", [70]),
    "admin": ("Actividades administrativas y residuos", list(range(77, 83)) + [38, 39]),
    "public_admin": ("Administración pública y defensa", [84]),
    "education": ("Educación", [85]),
    "health": ("Sanidad y servicios sociales", range(86, 89)),
    "arts": ("Artes, entretenimiento y deporte", range(90, 94)),
    "other": ("Otros servicios y hogares", list(range(94, 100))),
}
CNAE_RAMA = {c: k for k, (_, cs) in RAMAS.items() for c in cs}
# Ramas A*6 de la contabilidad regional (Eurostat NUTS 3) para repartir el PIB.
A6 = {"A": range(1, 4), "B-E": range(5, 40), "F": range(41, 44), "G-J": range(45, 64), "K-N": range(64, 83),
      "O-U": range(84, 100)}
A6_NAME = {"A": "Agricultura y pesca", "B-E": "Industria y energía", "F": "Construcción",
           "G-J": "Comercio, transporte, hostelería e información", "K-N": "Finanzas, inmobiliarias y servicios a empresas",
           "O-U": "Administración, educación, sanidad, cultura y otros"}
CNAE_A6 = {c: k for k, cs in A6.items() for c in cs}


def num(s: str):
    s = (s or "").strip()
    if not s or s in ("..", ".", "-"):
        return None
    try:
        return float(s.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        r = csv.reader(f, delimiter=";")
        head = next(r)
        for row in r:
            if len(row) == len(head):
                yield dict(zip(head, row))


def code_of(s: str):
    m = re.match(r"^(\d+)\s", s or "")
    return m.group(1) if m else None


def latest(d: dict):
    """{año: valor} → (año, valor) del año más reciente con dato."""
    ys = sorted((y for y, v in d.items() if v is not None), reverse=True)
    return (ys[0], d[ys[0]]) if ys else (None, None)


def muni_rows(path, col_geo="Municipios"):
    """Filas de nivel municipio (sin distrito ni sección; sexo total)."""
    for r in rows(path):
        if not r.get(col_geo) or r.get("Secciones") or r.get("Distritos"):
            continue
        if r.get("Sexo", "Total") != "Total":
            continue
        c = code_of(r[col_geo])
        if c and len(c) == 5:
            yield c, r


def parse_padron():
    pop = defaultdict(dict)
    names = {}
    for r in rows(raw("ine_padron", "tablas", "29005.csv")):
        if r.get("Sexo") != "Total":
            continue
        c = code_of(r["Municipios"])
        if not c:
            continue
        names[c] = r["Municipios"][6:].strip()
        pop[c][int(r["Periodo"])] = num(r["Total"])
    return pop, names


def parse_family(prefix, ids, key_col, wanted, files_used):
    """Tablas ADRH/Censo por provincia → {muni: {indicador: {año: valor}}}."""
    out = defaultdict(lambda: defaultdict(dict))
    for t in ids:
        p = raw(prefix[0], prefix[1], f"{t}.csv")
        if not p.exists():
            continue
        files_used.append(f"{prefix[1]}/{t}.csv")
        for c, r in muni_rows(p):
            ind = r.get(key_col)
            if ind in wanted:
                out[c][wanted[ind]][int(r["Periodo"])] = num(r["Total"])
    return out


def jobs_from_cnae(d: dict):
    """{cnae2: ocupados} → (jobs por rama, ocupados por rama A*6, total)."""
    jobs = {k: 0.0 for k in RAMAS}
    a6 = {k: 0.0 for k in A6}
    for c, v in d.items():
        if v is None:
            continue
        k = CNAE_RAMA.get(c)
        if k:
            jobs[k] += v
        g = CNAE_A6.get(c)
        if g:
            a6[g] += v
    return jobs, a6


def parse_cnae_table(path, geo_cols):
    """69980 (ciudades) o 69960 (nación/CCAA/provincias) → {geo: {año: {cnae2|'total': ocupados}}}."""
    out = defaultdict(lambda: defaultdict(dict))
    for r in rows(path):
        if r.get("Sexo") != "Total":
            continue
        geo = None
        for col in geo_cols:
            if r.get(col):
                geo = code_of(r[col]) or r[col]
        if geo is None:
            continue
        act = r["Actividad económica"]
        m = re.match(r"^(\d\d)\s", act)
        key = int(m.group(1)) if m else ("total" if act.startswith("Total") else None)
        if key is None:
            continue
        out[geo][int(r["Periodo"])][key] = num(r["Total"])
    return out


def eurostat(path):
    d = json.loads(path.read_text())
    dims, size = d["id"], d["size"]
    cats = {n: d["dimension"][n]["category"]["index"] for n in dims}
    vals = d["value"]

    def get(**k):
        idx = 0
        for n, sz in zip(dims, size):
            idx = idx * sz + (cats[n][k[n]] if n in k else 0)
        return vals.get(str(idx))

    return get, cats


def build():
    files = defaultdict(list)
    pop, names = parse_padron()
    files["ine_padron"].append("tablas/29005.csv")
    pop_years = sorted({y for d in pop.values() for y in d})
    year = max(pop_years)
    print(f"    padrón: {len(pop)} municipios, años {pop_years[0]}–{year}")

    renta = parse_family(("ine_adrh", "renta"), ADRH_RENTA, "Indicadores de renta media", {
        "Renta neta media por persona": "renta_persona", "Renta neta media por hogar": "renta_hogar",
        "Mediana de la renta por unidad de consumo": "renta_mediana_uc"}, files["ine_adrh"])
    demog = parse_family(("ine_adrh", "demografia"), ADRH_DEMOG, "Indicadores demográficos", {
        "Edad media de la población": "edad_media", "Porcentaje de población de 65 y más años": "pct_65",
        "Porcentaje de población menor de 18 años": "pct_18", "Tamaño medio del hogar": "hogar",
        "Porcentaje de hogares unipersonales": "unipersonales", "Porcentaje de población española": "pct_espanola"},
        files["ine_adrh"])
    pobreza = parse_family(("ine_adrh", "pobreza"), ADRH_POBREZA, None, {}, [])  # se rellena abajo
    pobreza = defaultdict(lambda: defaultdict(dict))
    for t in ADRH_POBREZA:
        p = raw("ine_adrh", "pobreza", f"{t}.csv")
        if not p.exists():
            continue
        files["ine_adrh"].append(f"pobreza/{t}.csv")
        for c, r in muni_rows(p):
            ind = next((v for k, v in r.items() if k.startswith("Distribución") or k.startswith("Porcentaje") or k.startswith("Umbral")), "")
            if "60%" in ind and "debajo" in ind and "mediana" in ind:
                pobreza[c]["pobreza"][int(r["Periodo"])] = num(r["Total"])
    estudios = parse_family(("ine_censo", "estudios"), CENSO_ESTUDIOS, "Nivel de formación alcanzado", {
        "Total": "pob15", "Educación superior": "superior"}, files["ine_censo"])
    actividad = parse_family(("ine_censo", "actividad"), CENSO_ACTIVIDAD, "Relación con la actividad", {
        "Ocupado/a": "ocupados", "Parado/a": "parados", "Total": "pob16"}, files["ine_censo"])
    nacidos = defaultdict(lambda: defaultdict(dict))
    p65031 = raw("ine_censo", "tablas", "65031.csv")
    if p65031.exists():
        files["ine_censo"].append("tablas/65031.csv")
        for c, r in muni_rows(p65031):
            lug = r.get("Lugar de nacimiento")
            if lug in ("Total", "Extranjero"):
                nacidos[c]["nac_" + ("total" if lug == "Total" else "fuera")][int(r["Periodo"])] = num(r["Total"])
    print(f"    ADRH renta {len(renta)}, demografía {len(demog)}, pobreza {len(pobreza)}; censo estudios {len(estudios)}, "
          f"actividad {len(actividad)}, nacimiento {len(nacidos)} municipios")

    # --- municipios -------------------------------------------------------------------------------------------
    # Un solo año por indicador (el más reciente publicado): un municipio sin dato ese año queda sin dato, en vez de
    # mezclar euros o porcentajes de años distintos.
    target = {}
    for src in (renta, demog, pobreza, estudios, actividad):
        for c_, inds in src.items():
            for ind, series in inds.items():
                ys = [y for y, v in series.items() if v is not None]
                if ys:
                    target[ind] = max(target.get(ind, 0), max(ys))
    munis = {}
    vint = defaultdict(set)
    for c in pop:
        rec = {"name": names[c], "prov": c[:2], "pop": pop[c].get(year), "pop_series": {y: pop[c].get(y) for y in pop_years}}
        for src, tag in ((renta, "adrh"), (demog, "adrh"), (pobreza, "adrh"), (estudios, "censo"), (actividad, "censo")):
            for ind, series in src.get(c, {}).items():
                y = target.get(ind)
                v = series.get(y)
                rec[ind] = v
                if v is not None:
                    vint[f"{tag}:{ind}"].add(y)
        nf = nacidos.get(c, {})
        y_nac = min(year, max(nf.get("nac_total", {}) or [year]))
        t, f_ = nf.get("nac_total", {}).get(y_nac), nf.get("nac_fuera", {}).get(y_nac)
        rec["nacidos_fuera"] = f_ / t if t and f_ is not None else None
        if t:
            vint["censo:nacidos"].add(y_nac)
        o, p_ = rec.get("ocupados"), rec.get("parados")
        rec["paro"] = p_ / (o + p_) if o is not None and p_ is not None and (o + p_) > 0 else None
        s, t15 = rec.get("superior"), rec.get("pob15")
        rec["estudios_sup"] = s / t15 if s is not None and t15 else None
        for k in ("pct_65", "pct_18", "unipersonales", "pct_espanola", "pobreza"):
            if rec.get(k) is not None:
                rec[k] = rec[k] / 100
        munis[c] = rec
    print("    años más recientes:", {k: sorted(v) for k, v in vint.items()})

    # --- ocupados por CNAE: ciudades (69980) y provincias / nación (69960) ------------------------------------
    files["ine_censo"] += ["tablas/69980.csv", "tablas/69960.csv"]
    cities_cnae = parse_cnae_table(raw("ine_censo", "tablas", "69980.csv"), ["Capitales de provincia y principales ciudades"])
    geo_cnae = parse_cnae_table(raw("ine_censo", "tablas", "69960.csv"),
                                ["Total Nacional", "Comunidades y Ciudades Autónomas", "Provincias"])
    cyear = max(y for g in cities_cnae.values() for y in g)
    city_names = {}
    for r in rows(raw("ine_censo", "tablas", "69980.csv")):
        c = code_of(r["Capitales de provincia y principales ciudades"])
        city_names[c] = r["Capitales de provincia y principales ciudades"][6:].strip()
        if len(city_names) > 200:
            break

    def jobs_block(d):
        jobs, a6 = jobs_from_cnae(d)
        total = d.get("total")
        return {"jobs": jobs, "a6": a6, "employed": total}

    cities = {c: jobs_block(v[cyear]) for c, v in cities_cnae.items() if cyear in v}
    provs = {}
    nation = None
    for g, v in geo_cnae.items():
        if cyear not in v:
            continue
        if g == "Total Nacional":
            nation = jobs_block(v[cyear])
        elif len(g) == 2 and g in PROVINCIAS and not g.startswith("Comunidad"):
            provs.setdefault(g, {}).update(jobs_block(v[cyear]))
    # 69960 mezcla CCAA (códigos 01-19) y provincias (01-52) en columnas distintas: rehacer por columna.
    provs = {}
    for r in rows(raw("ine_censo", "tablas", "69960.csv")):
        if r.get("Sexo") != "Total" or not r.get("Provincias") or int(r["Periodo"]) != cyear:
            continue
        pcode = code_of(r["Provincias"])
        act = r["Actividad económica"]
        m = re.match(r"^(\d\d)\s", act)
        key = int(m.group(1)) if m else ("total" if act.startswith("Total") else None)
        if key is not None:
            provs.setdefault(pcode, {})[key] = num(r["Total"])
    provs = {p: jobs_block(d) for p, d in provs.items()}
    print(f"    censo {cyear}: {len(cities)} ciudades, {len(provs)} provincias con ocupados por CNAE; nación {nation['employed']:.0f}")

    # --- PIB (Eurostat) ---------------------------------------------------------------------------------------
    gdp_get, gdp_cats = eurostat(raw("eurostat_gdp", "nama_10r_3gdp.json"))
    gva_get, gva_cats = eurostat(raw("eurostat_gdp", "nama_10r_3gva.json"))
    nat_get, nat_cats = eurostat(raw("eurostat_gdp", "nama_10_gdp.json"))
    gdp_year = max(y for y in gdp_cats["time"] if gdp_get(geo="ES300", time=y) is not None)
    gva_year = max(y for y in gva_cats["time"] if gva_get(geo="ES300", nace_r2="TOTAL", time=y) is not None)
    prov_gdp, prov_gva = defaultdict(float), defaultdict(lambda: defaultdict(float))
    for nuts, pc in NUTS3.items():
        v = gdp_get(geo=nuts, time=gdp_year)
        if v is not None:
            prov_gdp[pc] += v * 1e6
        for b in list(A6) + ["TOTAL"]:
            v = gva_get(geo=nuts, nace_r2=b, time=gva_year)
            if v is not None:
                prov_gva[pc][b] += v * 1e6
    nat_year = max(y for y in nat_cats["time"] if nat_get(time=y) is not None)
    nation_gdp = {"gdp": nat_get(time=nat_year) * 1e6, "year": int(nat_year),
                  "nuts3_sum": sum(prov_gdp.values()), "nuts3_year": int(gdp_year)}
    print(f"    PIB provincial {gdp_year} (VAB por ramas {gva_year}); PIB nacional {nat_year}: {nation_gdp['gdp'] / 1e9:.0f} mil M€")
    files["eurostat_gdp"] = ["nama_10r_3gdp.json", "nama_10r_3gva.json", "nama_10_gdp.json"]

    save_interim("_stats", {
        "year": year, "pop_years": pop_years, "munis": munis, "census_year": cyear, "cities_jobs": cities,
        "city_names": city_names, "provs_jobs": provs, "nation_jobs": nation, "prov_gdp": dict(prov_gdp),
        "prov_gva": {k: dict(v) for k, v in prov_gva.items()}, "gdp_year": int(gdp_year), "gva_year": int(gva_year),
        "nation_gdp": nation_gdp, "vintages": {k: sorted(v) for k, v in vint.items()}, "files": dict(files),
    })


if __name__ == "__main__":
    build()
