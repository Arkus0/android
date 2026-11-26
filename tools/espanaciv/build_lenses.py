"""Lentes: cada hexágono coloreado por una medida municipal (lenses.json).

Cada municipio reparte su población entre los hexágonos según la superficie suya que cae en cada uno (densidad
uniforme dentro del municipio). Densidad = población asignada ÷ superficie; las tasas son medias ponderadas por esa
población; el crecimiento compara la población asignada en dos años.
"""

from __future__ import annotations

import numpy as np

from common import load_interim, write_web

GROUPS = [{"id": "people", "name": "Población"}, {"id": "prosperity", "name": "Prosperidad"},
          {"id": "knowledge", "name": "Conocimiento"}, {"id": "life", "name": "Vida diaria"},
          {"id": "land", "name": "Territorio"}]

RAMP = {
    "density": ["#1b1035", "#4b2377", "#9a3b8a", "#e0645e", "#f9b24a", "#fff3a8"],
    "income": ["#3a1c0b", "#7a4413", "#b8781f", "#e3b23c", "#f6e27f", "#fffbe0"],
    "poverty": ["#03051a", "#4c1d4b", "#a11a5b", "#e83f3f", "#f69c73", "#faebdd"],
    "age": ["#00224e", "#35456c", "#666970", "#948e77", "#c8b866", "#fee838"],
    "foreign": ["#0b0405", "#382a54", "#395d9c", "#3497a9", "#60ceac", "#def5e5"],
    "degrees": ["#08203e", "#0f4c81", "#2a7fc1", "#5fa8e0", "#a6d1f2", "#eaf5ff"],
    "unemp": ["#1a0505", "#4a0f0f", "#80201a", "#b8452b", "#e07b54", "#f9c9a8"],
    "solo": ["#1a0a2e", "#3f1d6b", "#6a3fa0", "#9a72c9", "#c9a9e6", "#f3e8ff"],
    "growth": ["#5c0d14", "#a3302b", "#d9774f", "#f1d9b5", "#8cc79a", "#2f8f63", "#0f4d3a"],
    "forest": ["#0b1f0f", "#14401c", "#1f6b2b", "#3a9443", "#7fc07a", "#d5efcd"],
    "farmland": ["#141d05", "#2f4510", "#557019", "#84a02a", "#b8cf55", "#eef7b8"],
    "developed": ["#121218", "#2c2c3c", "#4b4b66", "#727294", "#a3a3c2", "#e2e2f0"],
    "elev": ["#1f3b2c", "#4c7a46", "#a9a65d", "#c98f4f", "#9a6a52", "#efe9e1"],
    "scrub": ["#1c1a05", "#45410f", "#76701d", "#a8a033", "#d4ce62", "#f8f6c4"],
}


def pctl(vals, lo=2, hi=98):
    v = np.array([x for x in vals if x is not None and np.isfinite(x)])
    if not len(v):
        return [0, 1]
    return [float(np.percentile(v, lo)), float(np.percentile(v, hi))]


def nice(x, d):
    return round(x, d) if d else int(round(x))


def build():
    W = load_interim("_world")
    S = load_interim("_stats")
    owner = W["owner"]
    size = len(owner)
    comp, tot = W["comp"], W["muni_px_total"]
    munis = S["munis"]
    ids = W["muni_ids"]
    year = S["year"]
    y0 = 2001
    rec = [munis.get(c) for c in ids]

    def frac(mi, px):
        t = tot[mi] if mi < len(tot) else 0
        return px / t if t else 1.0

    def popw(mi, px, y=None):
        r = rec[mi]
        if not r:
            return 0.0
        p = r["pop"] if y is None else r["pop_series"].get(y)
        return (p or 0) * frac(mi, px)

    density = [None] * size
    growth = [None] * size
    wm = {k: [None] * size for k in ("renta_persona", "pobreza", "paro", "edad_media", "nacidos_fuera", "estudios_sup",
                                       "unipersonales", "pct_65")}
    for i in range(size):
        if owner[i] < 0 or i not in comp:
            continue
        items = comp[i]
        area = sum(px for _, px in items)
        p = sum(popw(mi, px) for mi, px in items)
        density[i] = p / area if area else None
        p0 = sum(popw(mi, px, y0) for mi, px in items)
        p1 = sum(popw(mi, px, year) for mi, px in items)
        growth[i] = p1 / p0 - 1 if p0 > 0 else None
        for k in wm:
            s = w = 0.0
            for mi, px in items:
                r = rec[mi]
                if not r or r.get(k) is None:
                    continue
                ww = popw(mi, px)
                if ww <= 0:
                    continue
                s += r[k] * ww
                w += ww
            wm[k][i] = s / w if w else None

    pct = W["pct"]
    land = {k: [pct[k][i] / 100 if owner[i] >= 0 and W["cover"][i] > 0 else None for i in range(size)] for k in pct}
    elev = [float(W["elev"][i]) if owner[i] >= 0 else None for i in range(size)]

    ry, cy = S["vintages"].get("adrh:renta_persona", ["?"]), S["vintages"].get("censo:paro", S["vintages"].get("censo:ocupados", ["?"]))
    ry, cy = max(ry) if ry else "?", max(cy) if cy else "?"
    ny = max(S["vintages"].get("censo:nacidos", ["?"]))
    lenses = []

    def add(id_, group, name, icon, emoji, unit, fmt, values, ramp, higher, source, desc, scale="linear", domain=None,
            digits=4, note=None):
        vals = [None if v is None or not np.isfinite(v) else nice(v, digits) for v in values]
        dom = domain or pctl(vals)
        if scale == "log":
            dom = [max(dom[0], 0.5), dom[1]]
        d = {"id": id_, "group": group, "name": name, "icon": icon, "emoji": emoji, "unit": unit, "format": fmt,
             "scale": scale, "domain": [nice(dom[0], digits), nice(dom[1], digits)], "ramp": ramp, "higher_is": higher,
             "source": source, "description": desc + ("" if domain else " Los colores abarcan del percentil 2 al 98 de los hexágonos; "
                                                      "los valores de fuera se pintan con los colores de los extremos."),
             "values": vals}
        if note:
            d["note"] = note
        lenses.append(d)

    add("density", "people", "Población", "l-people", "👥", "habitantes / km²", "int", density, RAMP["density"], "neutral",
        "ine_padron", f"Habitantes por km² (Padrón a 1 de enero de {year}). La población de cada municipio se reparte "
        "por su superficie y se suma la que cae en cada hexágono.", scale="log", digits=1)
    gmax = 0.45
    add("growth", "people", f"Crecimiento {y0}–{year}", "l-growth", "📈", f"cambio de población {y0}–{year}", "signed_pct",
        growth, RAMP["growth"], "neutral", "ine_padron",
        f"Cambio de la población entre el Padrón de {y0} y el de {year}: el vaciamiento del interior frente al crecimiento "
        "de las costas, las islas y las coronas metropolitanas. Escala fija de −45 % a +45 %.", domain=[-gmax, gmax],
        note="Municipios con sus límites actuales; los cambios de término municipal desde 2001 son muy pocos.")
    add("age", "people", "Edad media", "l-age", "🎂", "años", "years", wm["edad_media"], RAMP["age"], "neutral", "ine_adrh",
        f"Edad media de la población (Atlas de Distribución de Renta, {ry}), ponderada por población.", digits=1)
    add("elderly", "people", "Mayores de 65", "l-age", "👵", "parte de la población con 65 años o más", "pct", wm["pct_65"],
        RAMP["age"], "neutral", "ine_adrh", f"Porcentaje de población de 65 y más años (ADRH, {ry}).")
    add("foreign_born", "people", "Nacidos fuera", "l-foreign-born", "🌍", "parte de los residentes nacida en el extranjero",
        "pct", wm["nacidos_fuera"], RAMP["foreign"], "neutral", "ine_censo",
        f"Residentes nacidos fuera de España (Censo anual, 1 de enero de {ny}), incluidos los españoles nacidos fuera.")
    add("income", "prosperity", "Renta", "l-income", "💶", "renta neta media por persona, €", "eur", wm["renta_persona"],
        RAMP["income"], "good", "ine_adrh",
        f"Renta neta media por persona (Atlas de Distribución de Renta de los Hogares, {ry}), media de los municipios del "
        "hexágono ponderada por población. El INE no publica los municipios más pequeños: sus hexágonos usan solo los que tienen dato.",
        digits=0)
    add("poverty", "prosperity", "Pobreza", "l-poverty", "🥣", "parte de la población bajo el 60 % de la renta mediana", "pct",
        wm["pobreza"], RAMP["poverty"], "bad", "ine_adrh",
        f"Porcentaje de población con ingresos por unidad de consumo por debajo del 60 % de la mediana nacional (ADRH, {ry}): "
        "el indicador de riesgo de pobreza relativa.")
    add("unemployment", "prosperity", "Paro", "unemployment", "😐", "parados ÷ población activa", "pct", wm["paro"],
        RAMP["unemp"], "bad", "ine_censo",
        f"Parados ÷ (ocupados + parados) de 16 y más años (Censo anual, {cy}).",
        note="El Censo usa registros administrativos: su paro es más bajo que el de la EPA y no se comparan.")
    add("degrees", "knowledge", "Estudios superiores", "l-degrees", "🎓", "población de 15+ con estudios superiores", "pct",
        wm["estudios_sup"], RAMP["degrees"], "good", "ine_censo",
        f"Parte de la población de 15 y más años cuyo nivel de formación alcanzado es educación superior (FP superior, "
        f"grado, máster o doctorado), según el Censo anual ({cy}).")
    add("solo", "life", "Viven solos", "l-homeownership", "🏠", "hogares de una persona", "pct", wm["unipersonales"],
        RAMP["solo"], "neutral", "ine_adrh", f"Porcentaje de hogares unipersonales (ADRH, {ry}).")
    add("forest", "land", "Bosque", "l-forest", "🌲", "parte del suelo", "pct", land["forest"], RAMP["forest"], "neutral",
        "worldcover", "Parte del suelo del hexágono con cubierta arbórea (ESA WorldCover 2021).")
    add("farmland", "land", "Cultivos", "l-farmland", "🚜", "parte del suelo", "pct", land["crop"], RAMP["farmland"], "neutral",
        "worldcover", "Parte del suelo del hexágono cultivada (ESA WorldCover 2021): cereal, viñedo, olivar, regadío…")
    add("scrub", "land", "Matorral", "l-homeownership", "🌿", "parte del suelo", "pct", land["shrub"], RAMP["scrub"], "neutral",
        "worldcover", "Parte del suelo del hexágono cubierta de matorral (ESA WorldCover 2021).")
    add("developed", "land", "Construido", "l-developed", "🏙️", "parte del suelo", "pct", land["developed"], RAMP["developed"],
        "neutral", "worldcover", "Parte del suelo del hexágono construida: edificios, calles, polígonos (ESA WorldCover 2021).")
    add("elevation", "land", "Altitud", "terrain", "⛰️", "m sobre el nivel del mar", "int", elev, RAMP["elev"], "neutral", "etopo",
        "Altitud media del hexágono (ETOPO1). Escala fija de 0 a 2.000 m.", domain=[0, 2000], digits=0)

    write_web("lenses.json", {"vintage": f"Padrón {year} · ADRH {ry} · Censo {cy}", "groups": GROUPS, "lenses": lenses})
    for l in lenses:
        n = sum(v is not None for v in l["values"])
        print(f"      {l['id']:13s} {n:5d} hexágonos  dominio {l['domain']}")


if __name__ == "__main__":
    build()
