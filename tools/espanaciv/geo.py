"""Proyección y malla hexagonal de España Civ.

Las coordenadas del mapa son "unidades de mapa": una cónica equivalente de Albers centrada en España, en km,
multiplicada por SCALE para que el mapa tenga el mismo tamaño en unidades que el de usaciv (así el arte, las
etiquetas y el zoom del motor, pensados para hexágonos de radio 25, funcionan igual). Origen arriba a la
izquierda, y hacia abajo. Un hexágono de radio 25 unidades mide 7,1 km de radio real (unos 133 km²).

Canarias va en un recuadro al suroeste de la península (como en los mapas habituales de España): se proyecta
con su propio meridiano central y se traslada; `in_inset` dice si un punto del mapa cae dentro del recuadro.

La malla es la de usaciv (pointy-top, odd-r; pipeline/core/hexgrid.py y web/js/hex.js, licencia MIT), aquí
vectorizada con numpy.
"""

from __future__ import annotations

import math

import numpy as np

R_EARTH_KM = 6371.0088
SCALE = 3.5  # unidades de mapa por km real
HEX_RADIUS = 25.0  # unidades de mapa (7,14 km reales)
SQRT3 = math.sqrt(3)

# Extensión del mapa (lon/lat) y margen: península, Baleares, Ceuta y Melilla, el norte de Marruecos y el recuadro.
BBOX = (-14.2, 34.15, 5.0, 44.45)  # oeste, sur, este, norte

CANARIAS_LON0 = -15.75
CANARIAS_CENTER = (-15.75, 28.45)  # centro real del archipiélago
INSET_TARGET = (-11.0, 35.25)  # dónde se dibuja ese centro (lon/lat en la proyección peninsular)
INSET_BOX = (-18.35, 27.55, -13.25, 29.45)  # lon/lat que entran en el recuadro (las siete islas)


class Albers:
    """Cónica equivalente de Albers (esfera), km. Igual que usaciv, con parámetros para España."""

    def __init__(self, lat1=36.0, lat2=43.0, lat0=40.0, lon0=-3.5):
        p1, p2, p0 = map(math.radians, (lat1, lat2, lat0))
        self.lat1, self.lat2, self.lat0, self.lon0d = lat1, lat2, lat0, lon0
        self.lon0 = math.radians(lon0)
        self.n = (math.sin(p1) + math.sin(p2)) / 2
        self.c = math.cos(p1) ** 2 + 2 * self.n * math.sin(p1)
        self.rho0 = R_EARTH_KM * math.sqrt(self.c - 2 * self.n * math.sin(p0)) / self.n

    def fwd(self, lon, lat):
        lon, lat = np.asarray(lon, float), np.asarray(lat, float)
        rho = R_EARTH_KM * np.sqrt(self.c - 2 * self.n * np.sin(np.radians(lat))) / self.n
        th = self.n * (np.radians(lon) - self.lon0)
        return rho * np.sin(th), self.rho0 - rho * np.cos(th)

    def inv(self, x, y):
        x, y = np.asarray(x, float), np.asarray(y, float)
        dy = self.rho0 - y
        rho = np.hypot(x, dy)
        th = np.arctan2(x, dy)
        s = (self.c - (rho * self.n / R_EARTH_KM) ** 2) / (2 * self.n)
        return np.degrees(self.lon0 + th / self.n), np.degrees(np.arcsin(np.clip(s, -1, 1)))

    def to_dict(self):
        return {"lat1": self.lat1, "lat2": self.lat2, "lat0": self.lat0, "lon0": self.lon0d}


class MapProjection:
    """lon/lat → unidades de mapa (y hacia abajo), con Canarias trasladada al recuadro."""

    def __init__(self):
        self.main = Albers()
        self.can = Albers(lon0=CANARIAS_LON0)
        tx, ty = self.main.fwd(*INSET_TARGET)
        cx, cy = self.can.fwd(*CANARIAS_CENTER)
        self.dx, self.dy = float(tx - cx), float(ty - cy)
        w, s, e, n = BBOX
        xs, ys = [], []
        for lon in np.linspace(w, e, 60):
            for lat in (s, n):
                x, y = self.main.fwd(lon, lat)
                xs.append(float(x)), ys.append(float(y))
        for lat in np.linspace(s, n, 60):
            for lon in (w, e):
                x, y = self.main.fwd(lon, lat)
                xs.append(float(x)), ys.append(float(y))
        self.min_x, self.max_y = min(xs), max(ys)
        self.width = (max(xs) - min(xs)) * SCALE
        self.height = (max(ys) - min(ys)) * SCALE
        # recuadro de Canarias en unidades de mapa (con un pequeño margen)
        cw, cs, ce, cn = INSET_BOX
        corners = [self(lo, la, canarias=True) for lo in (cw, ce) for la in (cs, cn)]
        pad = 0.55 * HEX_RADIUS * 2
        self.inset = (min(p[0] for p in corners) - pad, min(p[1] for p in corners) - pad,
                      max(p[0] for p in corners) + pad, max(p[1] for p in corners) + pad)

    def _km_to_map(self, x, y):
        return (np.asarray(x) - self.min_x) * SCALE, (self.max_y - np.asarray(y)) * SCALE

    def __call__(self, lon, lat, canarias=None):
        """Proyecta; `canarias` None = decide por la posición (lon < -12.8 y lat < 30.5)."""
        lon, lat = np.asarray(lon, float), np.asarray(lat, float)
        is_can = (lon < -12.8) & (lat < 30.5) if canarias is None else np.full(np.shape(lon), bool(canarias))
        x1, y1 = self.main.fwd(lon, lat)
        x2, y2 = self.can.fwd(lon, lat)
        x = np.where(is_can, x2 + self.dx, x1)
        y = np.where(is_can, y2 + self.dy, y1)
        X, Y = self._km_to_map(x, y)
        if X.ndim == 0:
            return float(X), float(Y)
        return X, Y

    def in_inset(self, X, Y):
        x0, y0, x1, y1 = self.inset
        X, Y = np.asarray(X), np.asarray(Y)
        return (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)

    def inverse(self, X, Y):
        """unidades de mapa → lon/lat (dentro del recuadro, la posición real en Canarias)."""
        X, Y = np.asarray(X, float), np.asarray(Y, float)
        x = X / SCALE + self.min_x
        y = self.max_y - Y / SCALE
        lon1, lat1 = self.main.inv(x, y)
        lon2, lat2 = self.can.inv(x - self.dx, y - self.dy)
        ins = self.in_inset(X, Y)
        return np.where(ins, lon2, lon1), np.where(ins, lat2, lat1)

    def to_dict(self):
        return {"scale": SCALE, "min_x": self.min_x, "max_y": self.max_y, "albers": self.main.to_dict(),
                "canarias": {"lon0": CANARIAS_LON0, "dx": self.dx, "dy": self.dy, "box": list(self.inset)}}


class HexGrid:
    """Malla pointy-top «odd-r» (filas impares desplazadas a la derecha), como usaciv."""

    _NB = (((1, 0), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1)),
           ((1, 0), (1, 1), (0, 1), (-1, 0), (0, -1), (1, -1)))

    def __init__(self, radius: float, cols: int, rows: int):
        self.radius, self.cols, self.rows = radius, cols, rows
        self.size = cols * rows

    @classmethod
    def covering(cls, width, height, radius):
        return cls(radius, math.ceil(width / (SQRT3 * radius)) + 1, math.ceil(height / (1.5 * radius)) + 1)

    def center(self, i):
        i = np.asarray(i)
        col, row = i % self.cols, i // self.cols
        return SQRT3 * self.radius * (col + 0.5 * (row & 1)), 1.5 * self.radius * row

    def cell_at(self, x, y):
        """Índice de la celda que contiene (x, y) (vectorizado); -1 fuera de la malla."""
        x, y = np.asarray(x, float), np.asarray(y, float)
        q = (SQRT3 / 3 * x - y / 3) / self.radius
        r = (2 / 3 * y) / self.radius
        cx, cz = q, r
        cy = -cx - cz
        rx, ry, rz = np.floor(cx + 0.5), np.floor(cy + 0.5), np.floor(cz + 0.5)
        dx, dy, dz = np.abs(rx - cx), np.abs(ry - cy), np.abs(rz - cz)
        a = (dx > dy) & (dx > dz)
        b = ~a & (dy <= dz)
        rx = np.where(a, -ry - rz, rx)
        rz = np.where(b, -rx - ry, rz)
        row = rz.astype(np.int64)
        col = rx.astype(np.int64) + (row - (row & 1)) // 2
        ok = (col >= 0) & (col < self.cols) & (row >= 0) & (row < self.rows)
        out = np.where(ok, row * self.cols + col, -1)
        return int(out) if out.ndim == 0 else out

    def neighbours(self, i):
        col, row = i % self.cols, i // self.cols
        out = []
        for dc, dr in self._NB[row & 1]:
            c, r = col + dc, row + dr
            if 0 <= c < self.cols and 0 <= r < self.rows:
                out.append(r * self.cols + c)
        return out

    def to_dict(self):
        return {"radius": self.radius, "cols": self.cols, "rows": self.rows}


# --- TopoJSON (es-atlas) ------------------------------------------------------------------------------------------

def topo_decode(topo: dict, obj: str):
    """Devuelve [(id, props, [polígonos [anillos [(lon, lat)]]])] de un objeto TopoJSON (arcs cuantizados)."""
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(idx):
        pts = []
        for a in idx:
            seg = arcs[a] if a >= 0 else arcs[~a][::-1]
            pts.extend(seg if not pts else seg[1:])
        return pts

    out = []
    for g in topo["objects"][obj]["geometries"]:
        t = g.get("type")
        if t == "Polygon":
            polys = [[ring(r) for r in g["arcs"]]]
        elif t == "MultiPolygon":
            polys = [[ring(r) for r in p] for p in g["arcs"]]
        else:
            polys = []
        out.append((g.get("id"), g.get("properties") or {}, polys))
    return out
