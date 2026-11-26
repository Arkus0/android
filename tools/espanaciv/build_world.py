"""El mapa: malla hexagonal, tierra y mar, provincias, municipios, relieve, cobertura del suelo y ríos.

Adaptado de usaciv (pipeline/build/world.py, MIT). Diferencias: en vez de 7 puntos por hexágono se rasteriza
cada capa a 1 km (unos 130 píxeles por hexágono) y se cuenta; la cobertura es ESA WorldCover; los umbrales de
relieve están ajustados a hexágonos de 7 km; Canarias va en un recuadro.

Escribe world.json y el intermedio _world (malla, proyección, provincia y municipios de cada celda).
"""

from __future__ import annotations

import json
import math
from collections import Counter, defaultdict

import numpy as np
from affine import Affine
from rasterio import features

import geo
from common import raw, save_interim, write_web
from spain import PROVINCIAS, RIO_NOMBRE

WATER, FOREIGN = -1, -2
LAND, OCEAN, COAST, LAKE = range(4)
FLAT, HILLS, MOUNTAINS, PEAKS = range(4)
PIX = geo.SCALE * 1.0  # 1 km real en unidades de mapa
COAST_DEPTH_M = -200
LAND_MIN_ALT_M = -100

# Relieve (hexágonos de 7 km: umbrales más bajos que los de usaciv, que usa 25 km).
HILLS_SD, MOUNTAINS_SD, MOUNTAINS_MEAN, PEAKS_MEAN, PEAKS_MAX = 55, 170, 1500, 1900, 2900

WATER_TABLE = [
    {"id": LAND, "name": "Tierra", "rule": "Más de la mitad de la superficie del hexágono (rasterizada a 1 km) cae en "
     "municipios españoles (IGN) o en países vecinos (Natural Earth). Toda isla, Ceuta y Melilla conservan al menos un hexágono."},
    {"id": OCEAN, "name": "Océano", "color": "#1b4266", "rule": "Mar de más de 200 m de profundidad y sin tierra al lado."},
    {"id": COAST, "name": "Costa", "color": "#2d6d97", "rule": "Mar junto a un hexágono de tierra o de menos de 200 m de profundidad (media ETOPO1)."},
    {"id": LAKE, "name": "Lago o embalse", "color": "#3a80b0", "rule": "Hexágono de tierra cubierto al menos en un 45 % por "
     "agua permanente (ESA WorldCover) o por un lago o embalse de Natural Earth."},
]
WATER_NOTE = ("Los límites municipales del IGN y los países de Natural Earth se rasterizan a 1 km; manda la mayoría. "
              "Las islas pequeñas (Formentera, El Hierro, La Gomera, Cabrera…), Ceuta y Melilla, más pequeñas que medio "
              "hexágono, se fuerzan a tierra en el hexágono que más superficie suya tiene. La profundidad del mar es la "
              "media de las muestras ETOPO1 bajo el nivel del mar.")
RELIEF_TABLE = [
    {"id": FLAT, "name": "Llano", "rule": f"Desviación típica de la altitud dentro del hexágono menor de {HILLS_SD} m (la Meseta es llana aunque esté a 700 m)."},
    {"id": HILLS, "name": "Colinas", "rule": f"Desviación típica ≥ {HILLS_SD} m."},
    {"id": MOUNTAINS, "name": "Montañas", "rule": f"Desviación típica ≥ {MOUNTAINS_SD} m, o altitud media ≥ {MOUNTAINS_MEAN} m."},
    {"id": PEAKS, "name": "Cumbres", "rule": f"Altitud media ≥ {PEAKS_MEAN} m, o una muestra ≥ {PEAKS_MAX} m en un hexágono montañoso (Pirineo, Sierra Nevada, Teide)."},
]
RELIEF_NOTE = ("Con las muestras ETOPO1 (~1,8 km, unas 40 por hexágono) de altitud ≥ -100 m. Un hexágono cuyo 60 % más "
               "bajo es llanura (menos de 60 m de diferencia y bajo 400 m) baja un escalón (fondos de valle).")

URBAN_MIN_PCT = 30
# id, clave, nombre, color, códigos WorldCover, regla. Ids fijados por el contrato de usaciv.
COVER = [
    (1, "forest_deciduous", "Bosque caducifolio", "#4f7a35", [], "No se usa: WorldCover no distingue el tipo de hoja."),
    (2, "forest_evergreen", "Bosque mediterráneo y pinar", "#2f5a3a", [10], "Cubierta arbórea (10) es el grupo mayor, fuera de la España atlántica."),
    (3, "forest_mixed", "Bosque atlántico", "#43703f", [10], "Cubierta arbórea (10) es el grupo mayor en Galicia, la cornisa cantábrica, el País Vasco, Navarra y el Pirineo."),
    (4, "scrub", "Matorral", "#c9b07a", [20], "Matorral (20) es el grupo mayor: monte bajo, garriga, jaral."),
    (5, "grassland", "Pastizal", "#a9b35a", [30, 100], "Herbazal (30) es el grupo mayor: prados, pastos, dehesas abiertas."),
    (6, "pasture", "Prado de siega", "#8fb04e", [], "No se usa: WorldCover no separa prados de pastizales."),
    (7, "cropland", "Cultivos", "#c2b84e", [40], "Cultivos (40) es el grupo mayor: cereal, viñedo, olivar, regadío."),
    (8, "wetland", "Humedal", "#4f8a6e", [90, 95], "Humedal herbáceo (90) es el grupo mayor: marismas, deltas."),
    (9, "urban", "Urbano", "#8a8378", [50], f"Construido (50) ≥ {URBAN_MIN_PCT} % del suelo del hexágono, haya lo que haya más."),
    (10, "barren", "Suelo desnudo", "#bfae95", [60], "Suelo desnudo o vegetación escasa (60) es el grupo mayor: badlands, malpaís, desierto."),
    (11, "ice", "Nieve", "#e8eef2", [70], "Nieve y hielo permanentes (70) es el grupo mayor."),
]
COVER_NOTE = ("De ESA WorldCover 2021 (10 m), leído a ~300 m y muestreado cada 1 km dentro de cada hexágono español "
              "(unas 130 muestras). El agua (80) no cuenta; las cuotas son sobre el resto. WorldCover no dice si un bosque "
              "es caducifolio o perenne: el arte usa bosque atlántico en la España húmeda y mediterráneo en el resto. "
              "Los países vecinos no tienen cobertura (0).")
WC_GROUP = {10: "forest", 20: "scrub", 30: "grassland", 100: "grassland", 40: "cropland", 50: "developed",
            60: "barren", 70: "ice", 90: "wetland", 95: "wetland"}
GROUP_ID = {"scrub": 4, "grassland": 5, "cropland": 7, "wetland": 8, "barren": 10, "ice": 11}
PCT = {"forest": (10,), "crop": (40,), "pasture": (), "grass": (30, 100), "shrub": (20,), "wetland": (90, 95),
       "developed": (50,)}
ATLANTIC_PROV = {"15", "27", "32", "36", "33", "39", "48", "20", "01", "31"}  # España atlántica (bosque mixto)


def classify_relief(mean, sd, mx):
    if mean >= PEAKS_MEAN or (mx >= PEAKS_MAX and sd >= MOUNTAINS_SD):
        return PEAKS
    if sd >= MOUNTAINS_SD or mean >= MOUNTAINS_MEAN:
        return MOUNTAINS
    if sd >= HILLS_SD:
        return HILLS
    return FLAT


def is_valley_floor(samples):
    if len(samples) < 6:
        return False
    v = sorted(samples)
    lo = v[: max(3, int(len(v) * 0.6))]
    return lo[-1] < 400 and lo[-1] - lo[0] < 60


def clip_segment(p, q, w, h):
    (x0, y0), (x1, y1) = p, q
    dx, dy = x1 - x0, y1 - y0
    t0, t1 = 0.0, 1.0
    for pk, qk in ((-dx, x0), (dx, w - x0), (-dy, y0), (dy, h - y0)):
        if pk == 0:
            if qk < 0:
                return None
            continue
        t = qk / pk
        if pk < 0:
            t0 = max(t0, t)
        else:
            t1 = min(t1, t)
        if t0 > t1:
            return None
    return (x0 + t0 * dx, y0 + t0 * dy), (x0 + t1 * dx, y0 + t1 * dy)


def clip_polyline(pts, w, h):
    pieces, cur = [], []
    for p, q in zip(pts, pts[1:]):
        seg = clip_segment(p, q, w, h)
        if seg is None:
            if len(cur) >= 2:
                pieces.append(cur)
            cur = []
            continue
        a, b = seg
        if cur and math.dist(cur[-1], a) < 1e-9:
            cur.append(b)
        else:
            if len(cur) >= 2:
                pieces.append(cur)
            cur = [a, b]
        if b != q:
            pieces.append(cur)
            cur = []
    if len(cur) >= 2:
        pieces.append(cur)
    return pieces


def join_lines(lines, tol=2.0):
    lines = [list(l) for l in lines]
    joined = True
    while joined:
        joined = False
        for a in range(len(lines)):
            for b in range(len(lines)):
                if a == b or not lines[a] or not lines[b]:
                    continue
                la, lb = lines[a], lines[b]
                for la2, lb2 in ((la, lb), (la, lb[::-1]), (la[::-1], lb), (la[::-1], lb[::-1])):
                    if math.dist(la2[-1], lb2[0]) <= tol:
                        lines[a] = la2 + lb2[1:]
                        lines[b] = []
                        joined = True
                        break
        lines = [l for l in lines if l]
    return lines


def simplify(points, min_d):
    out = [points[0]]
    for p in points[1:-1]:
        if math.dist(p, out[-1]) >= min_d:
            out.append(p)
    out.append(points[-1])
    return out


def project_polys(proj, polys, canarias=None):
    """[[anillos lon/lat]] → geometría GeoJSON MultiPolygon en unidades de mapa."""
    out = []
    for poly in polys:
        rings = []
        for r in poly:
            if len(r) < 3:
                continue
            a = np.asarray(r)
            X, Y = proj(a[:, 0], a[:, 1], canarias=canarias)
            rings.append(list(zip(X.tolist(), Y.tolist())))
        if rings:
            out.append(rings)
    return {"type": "MultiPolygon", "coordinates": out}


def ring_area_km2(ring):
    a = np.asarray(ring)
    if len(a) < 3:
        return 0.0
    lat0 = math.radians(a[:, 1].mean())
    x = np.radians(a[:, 0]) * math.cos(lat0) * geo.R_EARTH_KM
    y = np.radians(a[:, 1]) * geo.R_EARTH_KM
    return abs(float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))) / 2


def load_atlas():
    topo = json.loads(raw("es_atlas", "package", "es", "municipalities.json").read_text())
    munis = [(i, p.get("name"), polys) for i, p, polys in geo.topo_decode(topo, "municipalities")]
    provs = [(i, p.get("name"), polys) for i, p, polys in geo.topo_decode(topo, "provinces")]
    return munis, provs


def build():
    proj = geo.MapProjection()
    width, height = proj.width, proj.height
    grid = geo.HexGrid.covering(width, height, geo.HEX_RADIUS)
    print(f"    malla {grid.cols}×{grid.rows} = {grid.size} hexágonos (radio {geo.HEX_RADIUS} u = {geo.HEX_RADIUS / geo.SCALE:.2f} km)")

    # --- rasterización a 1 km ------------------------------------------------------------------------------------
    nx, ny = math.ceil(width / PIX), math.ceil(height / PIX)
    tr = Affine(PIX, 0, 0, 0, PIX, 0)
    px_x = (np.arange(nx) + 0.5) * PIX
    px_y = (np.arange(ny) + 0.5) * PIX
    PX, PY = np.meshgrid(px_x, px_y)
    pix_cell = grid.cell_at(PX, PY)
    in_inset = proj.in_inset(PX, PY)

    munis, provs = load_atlas()
    munis = [m for m in munis if m[0] and m[0][:2] in PROVINCIAS]
    munis.sort(key=lambda m: m[0])
    muni_ids = [m[0] for m in munis]
    print(f"    {len(munis)} municipios")
    shapes = []
    for k, (mid, name, polys) in enumerate(munis):
        shapes.append((project_polys(proj, polys), k + 1))
    muni_r = features.rasterize(shapes, out_shape=(ny, nx), transform=tr, fill=0, dtype="int32", all_touched=False) - 1

    ne = json.loads(raw("natural_earth", "v5.1.2", "ne_10m_admin_0_countries.geojson").read_text())
    fshapes = []
    for f in ne["features"]:
        p = f["properties"]
        if p.get("ADM0_A3") == "ESP" or not f["geometry"]:
            continue
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        polys = [[r for r in poly] for poly in polys
                 if any(geo.BBOX[0] - 2 < x < geo.BBOX[2] + 2 and geo.BBOX[1] - 2 < y < geo.BBOX[3] + 2 for x, y in poly[0][::5])]
        if polys:
            fshapes.append((project_polys(proj, polys, canarias=False), 1))
            print(f"      vecino: {p.get('NAME_ES') or p.get('ADMIN')}")
    foreign_r = features.rasterize(fshapes, out_shape=(ny, nx), transform=tr, fill=0, dtype="uint8") > 0
    foreign_r &= ~in_inset
    foreign_r &= muni_r < 0

    lshapes = []
    for fn in ("ne_10m_lakes", "ne_10m_lakes_europe"):
        for f in json.loads(raw("natural_earth", "v5.1.2", f"{fn}.geojson").read_text())["features"]:
            g = f["geometry"]
            if not g:
                continue
            polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
            polys = [poly for poly in polys if any(geo.BBOX[0] < x < geo.BBOX[2] and geo.BBOX[1] < y < geo.BBOX[3] for x, y in poly[0])]
            if polys:
                lshapes.append((project_polys(proj, polys, canarias=False), 1))
    lake_r = features.rasterize(lshapes, out_shape=(ny, nx), transform=tr, fill=0, dtype="uint8") > 0 if lshapes else np.zeros((ny, nx), bool)

    # --- cobertura del suelo de cada píxel (WorldCover) ----------------------------------------------------------
    lon, lat = proj.inverse(PX, PY)
    wc = np.zeros((ny, nx), np.uint8)
    for f in sorted(raw("worldcover").glob("*.npz")):
        z = np.load(f)
        data, (l, b, r, t) = z["data"], z["bounds"]
        n = data.shape[0]
        sel = (lon >= l) & (lon < r) & (lat > b) & (lat <= t)
        cx = np.clip(((lon[sel] - l) / (r - l) * n).astype(int), 0, n - 1)
        cy = np.clip(((t - lat[sel]) / (t - b) * n).astype(int), 0, n - 1)
        wc[sel] = data[cy, cx]

    # --- contadores por celda -----------------------------------------------------------------------------------
    ok = pix_cell >= 0
    pc = pix_cell[ok]
    n_all = np.bincount(pc, minlength=grid.size)
    spain_px = (muni_r >= 0)[ok]
    n_spain = np.bincount(pc, weights=spain_px, minlength=grid.size)
    n_foreign = np.bincount(pc, weights=foreign_r[ok], minlength=grid.size)
    wc_ok = wc[ok]
    n_wc_water = np.bincount(pc, weights=(wc_ok == 80) & spain_px, minlength=grid.size)
    n_lake = np.bincount(pc, weights=lake_r[ok] & spain_px, minlength=grid.size)

    # municipios por celda: {celda: Counter(muni → píxeles)}
    mp = muni_r[ok]
    sel = mp >= 0
    key = pc[sel].astype(np.int64) * 10000 + mp[sel]
    uk, uc = np.unique(key, return_counts=True)
    cell_munis = defaultdict(dict)
    for k_, c_ in zip(uk.tolist(), uc.tolist()):
        cell_munis[k_ // 10000][k_ % 10000] = c_
    muni_px_total = np.bincount(mp[sel], minlength=len(munis))

    prov_codes = sorted(PROVINCIAS, key=lambda c: PROVINCIAS[c][0])
    prov_index = {c: i for i, c in enumerate(prov_codes)}
    muni_prov = np.array([prov_index[m[:2]] for m in muni_ids])

    owner = np.full(grid.size, WATER, np.int64)
    water = np.full(grid.size, OCEAN, np.int64)
    for i in range(grid.size):
        if n_all[i] == 0:
            continue
        land = n_spain[i] + n_foreign[i]
        if land * 2 > n_all[i]:
            water[i] = LAND
            if n_spain[i] >= n_foreign[i]:
                pc_ = Counter()
                for m, c_ in cell_munis[i].items():
                    pc_[muni_prov[m]] += c_
                owner[i] = pc_.most_common(1)[0][0]
            else:
                owner[i] = FOREIGN

    # Islas pequeñas, Ceuta y Melilla: al menos un hexágono de tierra por trozo de territorio ≥ 8 km².
    forced = []
    pieces = defaultdict(list)  # provincia → [(área, lon, lat del centroide aproximado, munis)]
    for mi, (mid, name, polys) in enumerate(munis):
        for poly in polys:
            area = ring_area_km2(poly[0])
            if area >= 8:
                a = np.asarray(poly[0])
                pieces[mid[:2]].append((area, a[:, 0], a[:, 1], mi))
    for pcode, plist in pieces.items():
        for area, lons, lats, mi in plist:
            X, Y = proj(lons, lats)
            cells = grid.cell_at(X, Y)
            cells = cells[cells >= 0]
            if cells.size == 0:
                continue
            # celdas cuyo interior contiene parte de este municipio
            cand = [c for c in set(cells.tolist()) | {grid.cell_at(float(X.mean()), float(Y.mean()))} if c >= 0]
            if any(owner[c] >= 0 and mi in cell_munis.get(c, {}) for c in cand):
                continue
            best = max(cand, key=lambda c: (cell_munis.get(c, {}).get(mi, 0), -abs(n_all[c])))
            if cell_munis.get(best, {}).get(mi, 0) == 0:
                cell_munis[best][mi] = 1
            if owner[best] < 0:
                owner[best] = prov_index[pcode]
                water[best] = LAND
                forced.append((munis[mi][1], best))
    print(f"    {len(forced)} hexágonos forzados a tierra (islas pequeñas, Ceuta, Melilla): {[f[0] for f in forced][:30]}")

    # Lagos y embalses: hexágonos españoles mayormente agua.
    lakes = 0
    for i in range(grid.size):
        if owner[i] >= 0 and n_spain[i] > 0 and (n_wc_water[i] + n_lake[i]) / n_spain[i] >= 0.45 and n_spain[i] > 0.6 * n_all[i]:
            owner[i], water[i] = WATER, LAKE
            lakes += 1
    print(f"    {lakes} hexágonos de lago o embalse")

    # municipio dominante de cada celda (dentro de su provincia si se puede)
    county = np.full(grid.size, -1, np.int64)
    comp = {}  # celda → [(muni, píxeles)]
    for i in range(grid.size):
        cm = cell_munis.get(i)
        if not cm or owner[i] < 0:
            continue
        comp[i] = sorted(cm.items(), key=lambda kv: -kv[1])
        same = [(m, c) for m, c in comp[i] if muni_prov[m] == owner[i]]
        county[i] = (same or comp[i])[0][0]
    # celdas de tierra española sin muestra: el municipio más común de las vecinas
    for i in np.nonzero((owner >= 0) & (county < 0))[0]:
        nb = Counter(int(county[j]) for j in grid.neighbours(int(i)) if county[j] >= 0 and owner[j] == owner[i])
        if nb:
            county[i] = nb.most_common(1)[0][0]
            comp[int(i)] = [(county[i], 1)]
    # municipios sin ninguna celda (muy pequeños): a la celda española que contiene su centroide, o la más cercana
    covered = set(m for i in comp for m, _ in comp[i])
    orphans = 0
    for mi, (mid, name, polys) in enumerate(munis):
        if mi in covered or not polys:
            continue
        a = np.asarray(max((p[0] for p in polys), key=len))
        X, Y = proj(a[:, 0].mean(), a[:, 1].mean())
        c = grid.cell_at(X, Y)
        cands = [c] + (grid.neighbours(c) if c >= 0 else [])
        cands = [x for x in cands if x >= 0 and owner[x] >= 0]
        if not cands:
            continue
        c = cands[0]
        comp.setdefault(c, []).append((mi, 1))
        orphans += 1
    print(f"    {orphans} municipios diminutos asignados a la celda de su centroide")

    # --- elevación (ETOPO1) ---------------------------------------------------------------------------------------
    lat_e, lon_e, alt_e, can_e = [], [], [], []
    for win, is_can in (("peninsula", False), ("canarias", True)):
        a = np.genfromtxt(raw("etopo", f"etopo_{win}.csv"), delimiter=",", skip_header=2)
        a = a[~np.isnan(a[:, 2])]
        lat_e.append(a[:, 0]), lon_e.append(a[:, 1]), alt_e.append(a[:, 2]), can_e.append(np.full(len(a), is_can))
    lat_e, lon_e, alt_e, can_e = map(np.concatenate, (lat_e, lon_e, alt_e, can_e))
    EX = np.empty_like(lat_e)
    EY = np.empty_like(lat_e)
    for flag in (False, True):
        s = can_e == flag
        EX[s], EY[s] = proj(lon_e[s], lat_e[s], canarias=flag)
    ins = proj.in_inset(EX, EY)
    keep = np.where(can_e, ins, ~ins)
    EX, EY, alt_e = EX[keep], EY[keep], alt_e[keep]
    ec = grid.cell_at(EX, EY)
    m = ec >= 0
    ec, alt_e = ec[m], alt_e[m]
    landm = alt_e >= LAND_MIN_ALT_M
    n_e = np.bincount(ec, minlength=grid.size)
    s_e = np.bincount(ec, weights=alt_e, minlength=grid.size)
    nl = np.bincount(ec[landm], minlength=grid.size)
    sl = np.bincount(ec[landm], weights=alt_e[landm], minlength=grid.size)
    sl2 = np.bincount(ec[landm], weights=alt_e[landm] ** 2, minlength=grid.size)
    below = alt_e < 0
    nb_ = np.bincount(ec[below], minlength=grid.size)
    sb_ = np.bincount(ec[below], weights=alt_e[below], minlength=grid.size)
    order = np.argsort(ec, kind="stable")
    ec_s, alt_s = ec[order], alt_e[order]
    starts = np.searchsorted(ec_s, np.arange(grid.size))
    ends = np.searchsorted(ec_s, np.arange(grid.size), side="right")

    elev = np.zeros(grid.size, np.int64)
    elev_max = np.zeros(grid.size, np.int64)
    relief = np.zeros(grid.size, np.int64)
    sd_list = []
    valley = 0
    for i in range(grid.size):
        if water[i] == LAND:
            samp = alt_s[starts[i]:ends[i]]
            samp = samp[samp >= LAND_MIN_ALT_M] if (samp >= LAND_MIN_ALT_M).any() else samp
            if samp.size == 0:
                continue
            mean = float(samp.mean())
            sd = float(samp.std())
            mx = float(samp.max())
            elev[i] = round(max(mean, 0))
            elev_max[i] = max(0, round(mx))
            relief[i] = classify_relief(max(mean, 0), sd, mx)
            if relief[i] in (HILLS, MOUNTAINS) and is_valley_floor(samp.tolist()):
                relief[i] -= 1
                valley += 1
            if owner[i] >= 0:
                sd_list.append(sd)
        else:
            if n_e[i] == 0:
                elev[i] = -4000
            elif water[i] != LAKE and nb_[i]:
                elev[i] = round(sb_[i] / nb_[i])
            else:
                elev[i] = min(round(s_e[i] / n_e[i]), 0)
    for i in range(grid.size):
        if water[i] == OCEAN:
            near = any(water[j] == LAND for j in grid.neighbours(i))
            water[i] = COAST if near or elev[i] > COAST_DEPTH_M else OCEAN
    rc = Counter(relief[owner >= 0].tolist())
    print(f"    relieve (España): {dict(sorted(rc.items()))}; {valley} fondos de valle; sd p50/p90 = "
          f"{np.percentile(sd_list, 50):.0f}/{np.percentile(sd_list, 90):.0f} m")

    # --- cobertura ---------------------------------------------------------------------------------------------
    codes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100]
    cidx = np.full(256, -1, np.int64)
    for k_, c_ in enumerate(codes):
        cidx[c_] = k_
    wsel = spain_px & (cidx[wc_ok] >= 0)
    hist = np.bincount(pc[wsel] * len(codes) + cidx[wc_ok[wsel]], minlength=grid.size * len(codes)).reshape(grid.size, len(codes))
    cover = np.zeros(grid.size, np.int64)
    pct = {k: np.zeros(grid.size, np.int64) for k in PCT}
    for i in range(grid.size):
        if owner[i] < 0:
            continue
        h = dict(zip(codes, hist[i].tolist()))
        land = sum(v for c_, v in h.items() if c_ != 80)
        if not land:
            continue
        for k, cs in PCT.items():
            pct[k][i] = round(100 * sum(h.get(c_, 0) for c_ in cs) / land)
        if pct["developed"][i] >= URBAN_MIN_PCT:
            cover[i] = 9
            continue
        groups = Counter()
        for c_, v in h.items():
            g = WC_GROUP.get(c_)
            if g and g != "developed":
                groups[g] += v
        if not groups:
            continue
        best = groups.most_common(1)[0][0]
        if best == "forest":
            cover[i] = 3 if prov_codes[owner[i]] in ATLANTIC_PROV else 2
        else:
            cover[i] = GROUP_ID[best]
    print(f"    cobertura: {dict(sorted(Counter(cover[owner >= 0].tolist()).items()))}")

    # --- ríos -------------------------------------------------------------------------------------------------
    by_river = defaultdict(list)
    for fn in ("ne_10m_rivers_lake_centerlines", "ne_10m_rivers_europe"):
        for f in json.loads(raw("natural_earth", "v5.1.2", f"{fn}.geojson").read_text())["features"]:
            g, p = f["geometry"], f["properties"]
            if not g or not p.get("name"):
                continue
            lines = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
            for line in lines:
                a = np.asarray(line)[:, :2]
                if not ((a[:, 0] > geo.BBOX[0]) & (a[:, 0] < geo.BBOX[2]) & (a[:, 1] > geo.BBOX[1]) & (a[:, 1] < geo.BBOX[3])).any():
                    continue
                name = RIO_NOMBRE.get(p["name"], p["name"])
                if name == "Alagón" and a[:, 1].mean() > 41.8:
                    name = "Aragón"
                rank = int(p.get("scalerank") or 10)
                X, Y = proj(a[:, 0], a[:, 1], canarias=False)
                by_river[name].append((rank, list(zip(X.tolist(), Y.tolist()))))
    rivers = []
    for name, parts in by_river.items():
        rank = min(r for r, _ in parts)
        pieces = [pc_ for _, pts in parts for pc_ in clip_polyline(pts, width, height)]
        for piece in join_lines(pieces):
            if sum(math.dist(a, b) for a, b in zip(piece, piece[1:])) < 12:
                continue
            pts = simplify(piece, 6.0)
            if len(pts) >= 2:
                rivers.append({"name": name, "rank": rank, "pts": [round(v, 1) for p in pts for v in p]})
    rivers.sort(key=lambda r: r["rank"])
    print(f"    {len(rivers)} tramos de río: {sorted(set(r['name'] for r in rivers))}")

    # celda representativa de cada municipio: la que más superficie suya tiene (para la búsqueda)
    rep_cell, best_px = {}, {}
    for i, items in comp.items():
        for mi, px in items:
            if px > best_px.get(mi, -1):
                best_px[mi], rep_cell[mi] = px, int(i)
    cover_table = [{"id": 0, "key": "none", "name": "Ninguna", "rule": "Agua, país vecino o sin muestras de WorldCover."}] + [
        {"id": cid, "key": k, "name": n, "color": col, "worldcover": cs, "rule": rule} for cid, k, n, col, cs, rule in COVER]
    states_out = [{"fips": c, "abbr": PROVINCIAS[c][2], "name": PROVINCIAS[c][0], "full": PROVINCIAS[c][1]} for c in prov_codes]
    write_web("world.json", {
        "version": 2,
        "grid": grid.to_dict(),
        "width": round(width, 1),
        "height": round(height, 1),
        "margin": 0,
        "projection": proj.to_dict(),
        "insets": [{"id": "canarias", "name": "Canarias", "box": [round(v, 1) for v in proj.inset]}],
        "owner": owner.tolist(),
        "county": county.tolist(),
        "elev": elev.tolist(),
        "elev_max": elev_max.tolist(),
        "water": water.tolist(),
        "relief": relief.tolist(),
        "cover": cover.tolist(),
        "pct": {k: v.tolist() for k, v in pct.items()},
        "tables": {"water": WATER_TABLE, "relief": RELIEF_TABLE, "cover": cover_table,
                   "notes": {"water": WATER_NOTE, "relief": RELIEF_NOTE, "cover": COVER_NOTE}},
        "states": states_out,
        "counties": [{"geoid": m[0], "name": m[1], "cell": rep_cell.get(k)} for k, m in enumerate(munis)],
        "rivers": rivers,
    })
    # superficie de cada municipio dentro de cada celda (píxeles de 1 km² ≈ km²)
    save_interim("_world", {
        "grid": grid.to_dict(), "proj": proj, "owner": owner, "county": county, "water": water, "cover": cover,
        "pct": pct, "elev": elev, "relief": relief, "prov_codes": prov_codes, "muni_ids": muni_ids,
        "muni_names": [m[1] for m in munis], "muni_prov": muni_prov, "comp": comp,
        "muni_px_total": muni_px_total, "n_all": n_all,
    })


if __name__ == "__main__":
    build()
