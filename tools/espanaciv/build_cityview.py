"""Datos de la vista de ciudad y de los asesores: citizens.json, districts.json y counties.json (los municipios).

Mismos contratos que usaciv (docs/DATA_CONTRACTS.md), con datos del Censo anual del INE:

* citizens.json — la gente de cada ciudad como filas de figuritas: ocupaciones (CNO-11 a 2 dígitos, tabla 69979),
  edades (70371), estudios (66615) y lugar de nacimiento frente al de residencia (65033). No hay datos de cómo se va
  al trabajo, así que esa fila no existe. Las claves de categoría son las de usaciv (el arte de las figuras va por
  clave) con etiquetas españolas.
* districts.json — los «distritos» de cada ciudad: ramas (CNAE a 2 dígitos, tabla 69980) en las que la ciudad está
  especializada frente a España (cociente de localización, LQ). Ojo: el Censo cuenta a los ocupados donde VIVEN, no
  donde está la empresa (usaciv usa el QCEW, que cuenta en la empresa).
* counties.json — una fila por municipio con sus indicadores, para el Explorador y las gráficas de los asesores.
"""

from __future__ import annotations

import math
from collections import defaultdict

from build_stats import code_of, num, rows
from common import load_interim, raw, write_web
from spain import PROVINCIAS

T = lambda n: raw("ine_censo", "tablas", n)  # noqa: E731

# --- ocupaciones (CNO-11, 2 dígitos) → las nueve categorías de usaciv ------------------------------------------------
WORKFORCE = [
    ("executive", "Directivos, gerentes y gestión de empresas", [11, 12, 13, 14, 15, 26]),
    ("engineer", "Ingenieros, informáticos y científicos", [24, 27, 28, 31, 38]),
    ("scholar", "Docentes, juristas, cultura y servicios sociales", [22, 23, 25, 29, 37]),
    ("healer", "Sanidad (médicos, enfermería, técnicos, auxiliares)", [21, 33, 56]),
    ("service", "Hostelería, cuidados, limpieza y seguridad", [50, 51, 57, 58, 59, 91, 92, 93, 94]),
    ("clerk", "Comercio y oficinas", [34, 35, 36, 41, 42, 43, 44, 45, 52, 53, 54, 55]),
    ("farmer", "Agricultura, ganadería, pesca y montes", [61, 62, 63, 64, 95]),
    ("builder", "Construcción, instalación y reparación", [32, 71, 72, 74, 75, 96]),
    ("maker", "Fábricas, transporte y almacenes", [73, 76, 77, 78, 81, 82, 83, 84, 97, 98]),
]
CNO_KEY = {c: k for k, _, cs in WORKFORCE for c in cs}
AGE = [("child", "Menores de 16"), ("young", "De 16 a 34 años"), ("midlife", "De 35 a 64 años"), ("elder", "65 años o más")]
AGE_OF = {"Menos de 16 años": "child", "De 16 a 24 años": "young", "De 25 a 34 años": "young", "De 35 a 44 años": "midlife",
          "De 45 a 54 años": "midlife", "De 55 a 64 años": "midlife", "65 y más años": "elder"}
EDUCATION = [
    ("less_than_hs", "Sin estudios o solo primaria"),
    ("high_school", "ESO (primera etapa de secundaria)"),
    ("some_college", "Bachillerato o FP de grado medio"),
    ("bachelors", "FP superior o grado universitario"),
    ("graduate", "Máster o doctorado"),
]
EDU_OF = {
    "Sin estudios": "less_than_hs", "Educación primaria": "less_than_hs",
    "Primera etapa de Educación Secundaria y similar": "high_school",
    "Segunda etapa de educación secundaria, con orientación general": "some_college",
    "Segunda etapa de educación secundaria con orientación profesional, Educación postsecundaria no superior": "some_college",
    "Enseñanzas de formación profesional, artes plásticas y diseño y deportivas de grado superior y equivalentes": "bachelors",
    "Grados universitarios de hasta 240 créditos ECTS, diplomados universitarios y equivalentes": "bachelors",
    "Grados universitarios de más de 240 créditos ECTS, licenciados y equivalentes": "bachelors",
    "Másteres, especialidades en Ciencias de la Salud por el sistema de residencia y similares": "graduate",
    "Doctorado universitario": "graduate",
}
NATIVITY = [("born_in_state", "Nacidos en el mismo municipio"), ("other_state", "Nacidos en otro municipio de su comunidad"),
            ("native_abroad", "Nacidos en otra comunidad autónoma"), ("foreign_born", "Nacidos en el extranjero")]
NAT_OF = {"Mismo municipio al de residencia": "born_in_state", "Distinto municipio de la misma provincia": "other_state",
          "Distinta provincia de la misma comunidad": "other_state", "Distinta comunidad": "native_abroad",
          "Nacido en el extranjero o en antiguos territorios españoles": "foreign_born"}
FIGURES = {"workforce": 20, "age": 10}
RULE = {"specialist_high": 1.5, "specialist_low": 0.67, "min_share": 0.01, "max_high": 4, "max_low": 2}


def largest_remainder(counts, keys, n):
    tot = sum(counts.get(k, 0) for k in keys)
    if tot <= 0:
        return None
    raw_ = [counts.get(k, 0) / tot * n for k in keys]
    out = [math.floor(v) for v in raw_]
    left = n - sum(out)
    order = sorted(range(len(keys)), key=lambda j: (-(raw_[j] - math.floor(raw_[j])), j))
    for j in order[:left]:
        out[j] += 1
    return dict(zip(keys, out))


def row_block(counts, keys, figures=None):
    tot = sum(counts.get(k, 0) for k in keys)
    if tot <= 0:
        return None
    out = {"total": round(tot), "counts": {k: round(counts.get(k, 0)) for k in keys},
           "shares": {k: round(counts.get(k, 0) / tot, 3) for k in keys}, "_raw": {k: counts.get(k, 0) / tot for k in keys}}
    if figures:
        out["figures"] = largest_remainder(counts, keys, figures)
    return out


def latest_year(path, col="Periodo"):
    ys = set()
    for k, r in enumerate(rows(path)):
        ys.add(int(r[col]))
        if k > 20000:
            break
    return max(ys)


def build_citizens(cities_ids, year_pop):
    wf = defaultdict(lambda: defaultdict(float))
    y = latest_year(T("69979.csv"))
    for r in rows(T("69979.csv")):
        if r["Sexo"] != "Total" or int(r["Periodo"]) != y:
            continue
        c = code_of(r["Capitales de provincia y principales ciudades"])
        k = CNO_KEY.get(int(r["Ocupación"][:2])) if r["Ocupación"][:2].isdigit() else None
        if k and num(r["Total"]) is not None:
            wf[c][k] += num(r["Total"])
    nat_wf = defaultdict(float)
    for r in rows(T("69959.csv")):
        if r["Sexo"] != "Total" or int(r["Periodo"]) != y or r.get("Provincias") or r.get("Comunidades y Ciudades Autónomas"):
            continue
        k = CNO_KEY.get(int(r["Ocupación"][:2])) if r["Ocupación"][:2].isdigit() else None
        if k and num(r["Total"]) is not None:
            nat_wf[k] += num(r["Total"])

    age = defaultdict(lambda: defaultdict(float))
    ya = latest_year(T("70371.csv"))
    for r in rows(T("70371.csv")):
        if r["Sexo"] != "Total" or r["Año de llegada a municipio"] != "Total" or int(r["Periodo"]) != ya:
            continue
        k = AGE_OF.get(r["Edad"])
        if k:
            age[code_of(r["Capitales de provincia y principales ciudades"])][k] += num(r["Total"]) or 0
    # España por grupos quinquenales: el de 15 a 19 se reparte 1/5 a «menores de 16» y 4/5 a «16 a 34».
    nat_age = defaultdict(float)
    q = {}
    for r in rows(T("65034_nacional.csv")):
        if r.get("Provincias") or r.get("Municipios") or r.get("Secciones") or r["Sexo"] != "Total" or int(r["Periodo"]) != ya:
            continue
        q[r["Edad"]] = num(r["Total"]) or 0
    for e, v in q.items():
        if e.startswith("De "):
            a0 = int(e.split()[1])
            if a0 < 15:
                nat_age["child"] += v
            elif a0 == 15:
                nat_age["child"] += v / 5
                nat_age["young"] += v * 4 / 5
            elif a0 < 35:
                nat_age["young"] += v
            elif a0 < 65:
                nat_age["midlife"] += v
            else:
                nat_age["elder"] += v
        elif e.startswith("100"):
            nat_age["elder"] += v

    edu = defaultdict(lambda: defaultdict(float))
    ye = latest_year(T("66615.csv"))
    for r in rows(T("66615.csv")):
        if r["Sexo"] != "Total" or r["Edad"] != "15 y más años" or int(r["Periodo"]) != ye:
            continue
        k = EDU_OF.get(r["Nivel de formación alcanzado"])
        if k:
            edu[code_of(r["Capitales de provincia y principales ciudades"])][k] += num(r["Total"]) or 0
    nat_edu = defaultdict(float)
    for r in rows(T("66600.csv")):
        if r.get("Comunidades y Ciudades Autónomas") or r.get("Provincias") or r["Sexo"] != "Total" or r["Edad"] != "15 y más años" \
                or int(r["Periodo"]) != ye:
            continue
        k = EDU_OF.get(r["Nivel de estudios"])
        if k:
            nat_edu[k] += num(r["Total"]) or 0

    nat = defaultdict(lambda: defaultdict(float))
    nat_nat = defaultdict(float)
    want = set(cities_ids)
    for r in rows(T("65033.csv")):
        if r["Sexo"] != "Total" or r.get("Secciones") or int(r["Periodo"]) != year_pop:
            continue
        k = NAT_OF.get(r["Relación entre lugar de nacimiento y lugar de residencia"])
        if not k:
            continue
        if r.get("Municipios"):
            c = code_of(r["Municipios"])
            if c in want:
                nat[c][k] += num(r["Total"]) or 0
        elif not r.get("Provincias"):
            nat_nat[k] += num(r["Total"]) or 0

    keys = {"workforce": [k for k, *_ in WORKFORCE], "age": [k for k, _ in AGE], "education": [k for k, _ in EDUCATION],
            "nativity": [k for k, _ in NATIVITY]}
    labels = {"workforce": {k: l for k, l, _ in WORKFORCE}, "age": dict(AGE), "education": dict(EDUCATION), "nativity": dict(NATIVITY)}

    def person(wfc, agec, educ, natc):
        out = {
            "workforce": row_block(wfc, keys["workforce"], FIGURES["workforce"]) if wfc else None,
            "age": row_block(agec, keys["age"], FIGURES["age"]) if agec else None,
            "commute": None,
            "education": row_block(educ, keys["education"]) if educ else None,
            "nativity": row_block(natc, keys["nativity"]) if natc else None,
        }
        if out["education"]:
            out["education"]["bachelors_plus"] = round(out["education"]["_raw"]["bachelors"] + out["education"]["_raw"]["graduate"], 3)
        if out["nativity"]:
            out["nativity"]["foreign_born"] = out["nativity"]["shares"]["foreign_born"]
            out["nativity"]["born_in_state"] = out["nativity"]["shares"]["born_in_state"]
        if out["age"]:
            out["age"]["median"] = None
        return out

    national = person(nat_wf, nat_age, nat_edu, nat_nat)
    cities = {}
    for c in cities_ids:
        p = person(wf.get(c), age.get(c), edu.get(c), nat.get(c))
        specs = []
        for rid in ("workforce", "age", "education", "nativity"):
            row, nrow = p[rid], national[rid]
            if not row or not nrow:
                continue
            for k in keys[rid]:
                s, ns = row["_raw"][k], nrow["_raw"][k]
                if s < RULE["min_share"] and ns < RULE["min_share"] or ns <= 0:
                    continue
                ratio = s / ns
                if ratio >= RULE["specialist_high"] or ratio <= RULE["specialist_low"]:
                    specs.append({"row": rid, "key": k, "share": round(s, 3), "national": round(ns, 3), "ratio": round(ratio, 2)})
        hi = sorted([s for s in specs if s["ratio"] >= 1], key=lambda s: -s["ratio"])[: RULE["max_high"]]
        lo = sorted([s for s in specs if s["ratio"] < 1], key=lambda s: s["ratio"])[: RULE["max_low"]]
        p["specialists"] = hi + lo
        p["reliable"] = True
        cities[c] = p
    for blk in [national] + list(cities.values()):
        for rid in keys:
            if blk.get(rid):
                blk[rid].pop("_raw", None)
    national["specialists"] = []
    groups = {rid: [{"key": k, "label": labels[rid][k], "icon": f"c-{k}", "lines": ""} for k in keys[rid]] for rid in keys}
    for k, _, cs in WORKFORCE:
        g = next(g for g in groups["workforce"] if g["key"] == k)
        g["lines"] = "CNO-11 " + ", ".join(str(c) for c in cs)
    print(f"    ciudadanos: {len(cities)} ciudades; con ocupaciones {sum(1 for v in cities.values() if v['workforce'])}, "
          f"edades {sum(1 for v in cities.values() if v['age'])}, estudios {sum(1 for v in cities.values() if v['education'])}, "
          f"origen {sum(1 for v in cities.values() if v['nativity'])}")
    return {
        "version": 1, "vintage": f"Censo anual {y} (INE)", "year": y, "sources": ["ine_censo"],
        "figures": FIGURES,
        "rows": {"workforce": "Ocupados de 16 y más años por ocupación", "age": "Residentes por edad",
                 "education": "Población de 15 y más años por nivel de estudios", "nativity": "Residentes por lugar de nacimiento"},
        "groups": groups,
        "rule": {**RULE, "text": "Una categoría destaca cuando su peso en la ciudad es al menos 1,5 veces (▲) o como mucho 0,67 veces (▼) "
                 "el de España; se ignoran las que no llegan al 1 % ni en la ciudad ni en España."},
        "national": national, "cities": cities,
    }


# --- distritos ---------------------------------------------------------------------------------------------------------
CATALOG = [
    ("campus", "Campus", "#4a7bd0", [62, 63, 71, 72], {"62": "Software", "63": "Servicios de información", "71": "Ingeniería y arquitectura", "72": "Investigación (I+D)"},
     ("scientific", "Ciudad del conocimiento", {"62": "Ciudad tecnológica", "72": "Ciudad científica"}),
     "Informática, servicios de información, ingeniería e I+D."),
    ("commercial_hub", "Centro financiero", "#c9a43a", [64, 65, 66], {"64": "Banca", "65": "Seguros", "66": "Servicios financieros"},
     ("commercial", "Ciudad financiera", {}), "Banca, seguros y servicios financieros."),
    ("industrial_zone", "Zona industrial", "#b0642a", list(range(5, 34)),
     {"29": "Automóvil", "30": "Aeronáutica, naval y ferroviaria", "21": "Farmacia", "19": "Refino", "24": "Metalurgia",
      "20": "Química", "10": "Alimentación", "11": "Bebidas", "13": "Textil", "15": "Cuero y calzado", "23": "Cerámica y cemento",
      "16": "Madera", "05": "Minería del carbón", "08": "Canteras"},
     ("industrial", "Ciudad industrial", {"29": "Ciudad del motor", "15": "Ciudad del calzado", "23": "Ciudad de la cerámica",
                                          "19": "Ciudad del refino", "20": "Ciudad química"}),
     "Industria manufacturera y extractiva."),
    ("harbor", "Puerto", "#2f7fb8", [50, 52], {"50": "Navieras", "52": "Logística y almacenes"},
     ("maritime", "Ciudad portuaria", {}), "Transporte marítimo, almacenamiento y actividades anexas. Solo en ciudades junto al agua."),
    ("theater_square", "Plaza de las artes", "#8a5bc4", [59, 60, 90, 91], {"59": "Cine, TV y música", "60": "Radio y televisión",
                                                                        "90": "Artes escénicas", "91": "Museos y bibliotecas"},
     ("cultural", "Ciudad de las artes", {}), "Cine, televisión, artes escénicas, museos."),
    ("entertainment_complex", "Complejo turístico", "#d05a8a", [55, 92, 93], {"55": "Hoteles", "92": "Juegos de azar", "93": "Deporte y ocio"},
     ("entertainment", "Ciudad turística", {"55": "Ciudad turística"}), "Hoteles y alojamiento, ocio, deporte y juego."),
    ("aerodrome", "Aeródromo", "#5a9ad0", [51], {"51": "Transporte aéreo"}, ("aviation", "Nudo aéreo", {}), "Aerolíneas y transporte aéreo."),
    ("government_plaza", "Plaza del gobierno", "#3a7a5a", [84], {"84": "Administración pública y defensa"},
     ("governmental", "Ciudad administrativa", {}), "Administración pública, defensa y Seguridad Social."),
    ("aqueduct", "Acueducto y central", "#2a8aa6", [35, 36, 37], {"35": "Energía", "36": "Agua", "37": "Saneamiento"},
     ("utility", "Ciudad de la energía", {}), "Electricidad, gas, agua y saneamiento."),
    ("granary", "Granero", "#7aa83a", [1, 2, 3], {"01": "Agricultura y ganadería", "02": "Silvicultura", "03": "Pesca y acuicultura"},
     ("agricultural", "Ciudad agrícola", {"03": "Ciudad pesquera"}), "Agricultura, ganadería, silvicultura y pesca."),
]
D_RULE = {"min_lq": 1.25, "min_jobs": 1000, "min_share": 0.01, "specialty_lq": 3.0, "specialty_jobs": 500, "max_per_city": 5,
          "harbor_needs_water": True, "badge_lq": 6.0, "badge_share": 0.03}


def build_districts(S, W, cities):
    from build_stats import parse_cnae_table
    import geo
    ct = parse_cnae_table(raw("ine_censo", "tablas", "69980.csv"), ["Capitales de provincia y principales ciudades"])
    nt = parse_cnae_table(raw("ine_censo", "tablas", "69960.csv"), ["Total Nacional", "Comunidades y Ciudades Autónomas", "Provincias"])
    y = S["census_year"]
    natc = nt["Total Nacional"][y]
    nat_tot = natc.get("total") or sum(v for k, v in natc.items() if k != "total" and v)
    names = {}
    for r in rows(raw("ine_censo", "tablas", "69960.csv")):
        a = r["Actividad económica"]
        if a[:2].isdigit():
            names[a[:2]] = a[3:].strip()
        if len(names) >= 88:
            break
    grid = geo.HexGrid(**W["grid"])
    water = W["water"]
    out_c = {}
    for c in cities:
        d = ct.get(c["id"], {}).get(y)
        if not d:
            out_c[c["id"]] = None
            continue
        tot = d.get("total") or sum(v for k, v in d.items() if k != "total" and v)
        near_water = any(water[n] != 0 for cell in c["footprint"] for n in [cell] + grid.neighbours(cell))
        lq = lambda codes: (sum(d.get(k) or 0 for k in codes) / tot) / (sum(natc.get(k) or 0 for k in codes) / nat_tot)  # noqa: E731
        top = []
        for k, v in d.items():
            if k == "total" or not v or not natc.get(k):
                continue
            l = (v / tot) / (natc[k] / nat_tot)
            if v >= 500:
                top.append({"naics": f"{k:02d}", "emp": round(v), "lq": round(l, 2), "avg_pay": None, "oty_pct": None,
                            "suppressed": 0, "lower_bound": False})
        top.sort(key=lambda t: -t["lq"])
        ds = []
        for cid, name, color, codes, sub, badge, desc in CATALOG:
            emp = sum(d.get(k) or 0 for k in codes)
            if emp <= 0:
                continue
            L = lq(codes)
            share = emp / tot
            best = None
            for sk in sub:
                se = d.get(int(sk)) or 0
                if se <= 0 or not natc.get(int(sk)):
                    continue
                sl = (se / tot) / (natc[int(sk)] / nat_tot)
                if sl > 1 and (best is None or sl > best[1]) and se >= D_RULE["specialty_jobs"]:
                    best = (sk, sl, se)
            broad = L >= D_RULE["min_lq"] and (emp >= D_RULE["min_jobs"] or share >= D_RULE["min_share"])
            spec = best is not None and best[1] >= D_RULE["specialty_lq"]
            if not (broad or spec):
                continue
            if cid == "harbor" and not near_water:
                continue
            strength = max(emp - emp / L if L > 0 else 0, (best[2] - best[2] / best[1]) if best else 0)
            ds.append({"id": cid, "lq": round(L, 2), "emp": round(emp), "share": round(share, 4), "avg_pay": None,
                       "sub": best[0] if best else None, "sub_lq": round(best[1], 2) if best else None,
                       "sub_emp": round(best[2]) if best else None, "sub_lower_bound": False,
                       "via": "broad" if broad else "specialty", "strength": round(strength), "suppressed": 0, "lower_bound": False})
        ds.sort(key=lambda x: -x["strength"])
        ds = ds[: D_RULE["max_per_city"]]
        badge = None
        if c["capital"]:
            badge = {"id": "governmental", "label": "Capital", "district": "government_plaza", "basis": "censo",
                     "text": "Capital de España"}
        elif ds:
            strong = [x for x in ds if x["lq"] >= D_RULE["badge_lq"] and x["share"] >= D_RULE["badge_share"]]
            pick = strong[0] if strong else ds[0]
            cat = next(x for x in CATALOG if x[0] == pick["id"])
            lbl = cat[5][1]
            if pick["sub"] and pick["sub_lq"] and pick["sub_lq"] >= 3 and pick["sub"] in cat[5][2]:
                lbl = cat[5][2][pick["sub"]]
            what = f"{cat[4].get(pick['sub'], cat[1])}" if pick["sub"] and pick["sub_lq"] and pick["sub_lq"] >= 3 else cat[1]
            x = pick["sub_lq"] if pick["sub"] and pick["sub_lq"] and pick["sub_lq"] >= 3 else pick["lq"]
            badge = {"id": cat[5][0], "label": lbl, "district": pick["id"], "basis": "censo",
                     "text": f"{what}: {str(round(x, 1)).replace('.', ',')}× el peso de España en los ocupados"}
        out_c[c["id"]] = {"emp": round(tot), "avg_pay": None, "counties": [1, 1], "top": top[:8], "districts": ds, "badge": badge}
    industries = {f"{k:02d}": {"title": names.get(f"{k:02d}", str(k)), "us_emp": round(v), "nat_emp": round(v)}
                  for k, v in natc.items() if k != "total" and v}
    n_with = sum(1 for v in out_c.values() if v and v["districts"])
    print(f"    distritos: {n_with} de {len(cities)} ciudades con algún distrito")
    return {
        "version": 1, "vintage": f"Censo anual {y} (INE), ocupados por actividad", "year": y, "sources": ["ine_censo"],
        "rule": {**D_RULE, "college_share": None, "text":
                 "Un distrito aparece cuando sus ramas pesan al menos 1,25 veces más en los ocupados de la ciudad que en los de España "
                 "y suman al menos 1.000 ocupados o el 1 % del total, o cuando una de sus especialidades pesa 3 veces más con al menos 500 "
                 "ocupados. Se ordenan por «fuerza» (ocupados por encima de lo normal en España) y se muestran hasta 5. El Puerto exige "
                 "agua al lado. La insignia es la del distrito más fuerte. El Censo cuenta a los ocupados donde viven, no donde trabajan.",
                 "county_note": ""},
        "catalog": [{"id": cid, "name": name, "icon": f"d-{cid.replace('_', '-')}", "color": color,
                     "naics": [f"{k:02d}" for k in codes], "own": [], "sub": sub,
                     "badge": {"id": b[0], "label": b[1], "labels": b[2]}, "description": desc, "caveat": None}
                    for cid, name, color, codes, sub, b, desc in CATALOG],
        "industries": industries,
        "national": {"emp": round(nat_tot), "avg_pay": None},
        "cities": out_c, "counties": {},
    }


# --- municipios ---------------------------------------------------------------------------------------------------------
def build_counties(S, W, cities):
    munis = S["munis"]
    city_ids = {c["id"] for c in cities}
    lens_area = defaultdict(float)
    for i, items in W["comp"].items():
        for mi, px in items:
            lens_area[mi] += px
    rep = {}
    for i, items in W["comp"].items():
        for mi, px in items:
            if px > rep.get(mi, (0, -1))[1]:
                rep[mi] = (i, px)
    pct = W["pct"]
    land = defaultdict(lambda: defaultdict(float))
    wsum = defaultdict(float)
    for i, items in W["comp"].items():
        if W["cover"][i] <= 0:
            continue
        for mi, px in items:
            wsum[mi] += px
            for k in ("forest", "crop", "developed", "shrub", "grass"):
                land[mi][k] += pct[k][i] / 100 * px
    y0 = 2001
    year = S["year"]
    cols = ["geoid", "name", "state", "population", "land_km2", "density", "growth", "income", "poverty", "median_age", "elderly",
            "foreign_born", "bachelors", "unemployment", "solo", "forest", "crop", "shrub", "developed", "cbsa", "cell"]
    out = []
    for mi, code in enumerate(W["muni_ids"]):
        m = munis.get(code)
        if not m:
            continue
        a = lens_area.get(mi)
        p0, p1 = m["pop_series"].get(y0), m["pop_series"].get(year)
        L = {k: (land[mi][k] / wsum[mi] if wsum[mi] else None) for k in ("forest", "crop", "shrub", "developed")}
        out.append([code, W["muni_names"][mi], PROVINCIAS[code[:2]][2], m["pop"], round(a, 1) if a else None,
                    round(m["pop"] / a, 2) if a and m["pop"] else None, round(p1 / p0 - 1, 4) if p0 and p1 else None,
                    m.get("renta_persona"), m.get("pobreza"), m.get("edad_media"), m.get("pct_65"), m.get("nacidos_fuera"),
                    m.get("estudios_sup"), m.get("paro"), m.get("unipersonales"),
                    *[round(L[k], 3) if L[k] is not None else None for k in ("forest", "crop", "shrub", "developed")],
                    code if code in city_ids else None, rep.get(mi, (None,))[0]])
    F = lambda key, label, fmt, unit=None, hi="neutral", src="", desc="": {  # noqa: E731
        "key": key, "label": label, "format": fmt, "unit": unit, "higher_is": hi, "source": src, "description": desc}
    ry = S["vintages"].get("adrh:renta_persona", ["?"])[-1]
    cy = S["census_year"]
    fields = [
        F("geoid", "Código INE", "text"), F("name", "Municipio", "text"), F("state", "Provincia", "text"),
        F("population", "Población", "int", "habitantes", src="ine_padron", desc=f"Padrón a 1 de enero de {year}."),
        F("land_km2", "Superficie", "km2", "km²", src="es_atlas", desc="Superficie rasterizada a 1 km (aproximada)."),
        F("density", "Densidad", "float", "habitantes / km²", src="ine_padron", desc="Población ÷ superficie."),
        F("growth", f"Crecimiento {y0}–{year}", "signed", "cambio de población", src="ine_padron", desc=f"Padrón {year} ÷ Padrón {y0} − 1."),
        F("income", "Renta por persona", "usd", "€ por persona y año", "good", "ine_adrh", f"Renta neta media por persona (ADRH {ry})."),
        F("poverty", "Bajo el 60 % de la mediana", "pct", "de la población", "bad", "ine_adrh", f"Población con ingresos por unidad de consumo bajo el 60 % de la mediana (ADRH {ry})."),
        F("median_age", "Edad media", "years", "años", src="ine_adrh", desc=f"Edad media de la población (ADRH {ry})."),
        F("elderly", "Mayores de 65", "pct", "de la población", src="ine_adrh", desc=f"Población de 65 y más años (ADRH {ry})."),
        F("foreign_born", "Nacidos fuera", "pct", "de los residentes", src="ine_censo", desc="Residentes nacidos en el extranjero (Censo)."),
        F("bachelors", "Estudios superiores", "pct", "de la población de 15+", "good", "ine_censo", f"Con educación superior (Censo {cy})."),
        F("unemployment", "Paro (Censo)", "pct", "parados ÷ activos", "bad", "ine_censo", f"Parados ÷ (ocupados + parados) (Censo {cy})."),
        F("solo", "Hogares de una persona", "pct", "de los hogares", src="ine_adrh", desc=f"Hogares unipersonales (ADRH {ry})."),
        F("forest", "Bosque", "pct", "del suelo", src="worldcover", desc="Parte del suelo con cubierta arbórea (ESA WorldCover)."),
        F("crop", "Cultivos", "pct", "del suelo", src="worldcover", desc="Parte del suelo cultivada (ESA WorldCover)."),
        F("shrub", "Matorral", "pct", "del suelo", src="worldcover", desc="Parte del suelo con matorral (ESA WorldCover)."),
        F("developed", "Construido", "pct", "del suelo", src="worldcover", desc="Parte del suelo construida (ESA WorldCover)."),
        F("cbsa", "Ciudad", "text", desc="El código de la ciudad si el municipio es una de las 151 ciudades del mapa."),
        F("cell", "Hexágono", "int", desc="El hexágono con más superficie del municipio."),
    ]
    print(f"    municipios: {len(out)} filas")
    return {"vintage": f"Padrón {year} · ADRH {ry} · Censo {cy}", "fields": fields, "columns": cols, "rows": out}


def build():
    W = load_interim("_world")
    S = load_interim("_stats")
    C = load_interim("_cities")
    cities = C["cities"]
    write_web("citizens.json", build_citizens([c["id"] for c in cities], S["year"]))
    write_web("districts.json", build_districts(S, W, cities))
    write_web("counties.json", build_counties(S, W, cities))


if __name__ == "__main__":
    build()
