// The map-art model: turns the optional map-layer files (infrastructure, military, wonders, trade) into what the layers
// draw, once per data arrival, and decides where each site stands inside its hex so sites never sit on a city tile
// or on each other.
//
//   createModel(w) → model; model.setData(name, data) (re-runs the placement); model.version (bumps on change)
//   model fields: net, ports, airports, installations, ranges (cell sets), parks (cell sets), wonders, routes, data
//   each site item: {kind, data, cell, x, y (km, where it is drawn), size(Rpx) → css px, minRpx, prio}
//   visibleSites(model, layerId, Rpx) → items drawn at this zoom (decluttered, cached per zoom bucket)
//   wonderMotif(wonder) → the sprite motif for a wonders.json row (WONDER_MOTIF_BY_ID, else a generic one by kind)
//
// Sites whose true hex is a city tile (or a big metro's spill tile, or the hexes its banner covers) are drawn on the
// nearest free hex one ring out, leaning toward their true point; item.cell stays the true hex and item.drawCell is
// where the glyph stands (item.nudged = true). Tooltips always describe the true site.
import { prepareNetwork, prepareRoutes, portTier, airportTier } from "../../render/art/improvements.js";
import { prepareCellSet, fortKind, isAirfieldName } from "../../render/art/sites.js";
import { metroSpill } from "../../render/art/city.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * What each wonder looks like, by wonders.json id: the motif names a sprite in render/art/sites.js WONDER_MOTIFS.
 * Picked by hand from what the site is (a canyon, a forest, a statue, …); ids not listed get a generic motif for
 * their kind (see sites.js drawWonder).
 */
export const WONDER_MOTIF_BY_ID = {
  // national parks and park units
  "nps-GRCA": "canyon", "nps-ZION": "canyon",
  "nps-ROMO": "peak", "nps-GLAC": "peak", "nps-GRTE": "peak", "nps-YOSE": "peak",
  "nps-GRSM": "forest", "nps-OLYM": "forest", "nps-ACAD": "forest", "nps-CUVA": "forest", "nps-INDU": "forest",
  "nps-JOTR": "desert",
  "nps-YELL": "geyser", "nps-HOSP": "geyser",
  "nps-JEFF": "arch", "nps-MALL": "obelisk",
  "nps-GOGA": "bridge", "nps-GATE": "coast", "nps-GUIS": "coast",
  "nps-LAKE": "dam",
  // landmarks
  "nps-STLI": "statue", "nhl-66000808": "mission", "nhl-84003872": "gantry", "nhl-66000899": "mound",
  "nhl-66000496": "adobe", "nhl-87002652": "ballpark", "nps-INDE": "brickhall", "nhl-66000826": "rotunda",
  "nps-MORU": "carved", "nhl-66000377": "quarter", "nps-WRBR": "flight", "nps-GOSP": "spike",
};
const UNI_MOTIFS = ["hall", "redhall", "spire"];

export function wonderMotif(x) {
  if (x?.motif) return x.motif; // España Civ: el pipeline elige el motivo de cada maravilla
  const m = WONDER_MOTIF_BY_ID[x?.id];
  if (m) return m;
  if (x?.kind === "university") return UNI_MOTIFS[hashStr(x.id) % 3];
  return null; // drawWonder falls back to a generic motif by kind and variant
}

// Slots inside a hex, in hex radii from the centre: the centre (only when the hex has no city and no resource), then
// a ring, preferring the lower half (city banners stand above the city tile).
// In a city hex the ring sits further out (0.64 R) so sites flank the city tile rather than cover it.
const ring = (r) => [90, 30, 150, 330, 210, 270].map((deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180), deg]);
const RING = ring(0.52), CITY_RING = ring(0.64);

// Zoom rules (hex radius in css px) and sizes (css px), per site kind. Exported for the gallery and the docs.
export const SITE_RULES = {
  port: {
    minRpx: (p) => (p.rank <= 12 ? 10 : p.rank <= 50 ? 22 : 40),
    size: (tier, Rpx) => clamp(Rpx * [1.0, 0.86, 0.72][tier], 13, [66, 58, 50][tier]),
  },
  airport: {
    minRpx: (tier) => [10, 15, 22, 36, 36][tier],
    size: (tier, Rpx) => clamp(Rpx * [1.0, 0.86, 0.72, 0.62, 0.62][tier], 12, [62, 54, 46, 40, 40][tier]),
  },
  fort: {
    minRpx: (f) => (f.tier === "major" ? 8 : f.tier === "base" ? 22 : 40),
    size: (tier, Rpx) => clamp(Rpx * (tier === "major" ? 1.0 : tier === "base" ? 0.8 : 0.62), 12, tier === "major" ? 66 : 52),
  },
  wonder: {
    minRpx: () => 2.4,
    size: (rank, Rpx) => clamp(Rpx * 1.3, rank <= 5 ? 15 : 13, 88),
  },
};

export function createModel(w) {
  const m = {
    w, version: 0, data: {},
    net: null, ports: [], airports: [], installations: [], ranges: [], parks: [], wonders: [], routes: [],
    rangeById: new Map(),
    _vis: new Map(),
  };
  m.setData = (name, data) => {
    m.data[name] = data || null;
    if (name === "infrastructure") {
      m.net = data ? prepareNetwork(w, data) : null;
      m.ports = (data?.ports || []).filter(okCell(w)).map((p) => ({
        kind: "port", data: p, cell: p.cell, tier: portTier(p), prio: 300 + (p.rank || 999),
        minRpx: SITE_RULES.port.minRpx(p), pref: waterAngle(w, p),
      }));
      m.airports = (data?.airports || []).filter(okCell(w)).map((a, k) => {
        const tier = airportTier(a);
        return { kind: "airport", data: a, cell: a.cell, tier, prio: 400 + tier * 1000 + k, minRpx: SITE_RULES.airport.minRpx(tier), pref: towards(w, a, 30) };
      });
    } else if (name === "military") {
      m.installations = (data?.installations || []).filter(okCell(w)).map((f, k) => ({
        kind: "fort", data: f, cell: f.cell, tier: f.tier, fort: fortKind(f.component), prio: 200 + k,
        minRpx: SITE_RULES.fort.minRpx(f), pref: 150, muted: f.status && f.status !== "act", coastal: nearWater(w, f.cell), airfield: isAirfieldName(f.name),
      }));
      m.ranges = (data?.ranges || []).filter((r) => Array.isArray(r.cells) && r.cells.length).map((r) => ({ range: r, ...prepareCellSet(w, r.cells) }));
      m.rangeById = new Map(m.ranges.map((r) => [r.range.id, r]));
    } else if (name === "wonders") {
      m.wonders = (data?.wonders || []).filter(okCell(w)).map((x, k) => ({
        kind: "wonder", data: x, cell: x.cell, wkind: x.kind, prio: (x.rank || 99) * 4 + k * 0.01, minRpx: SITE_RULES.wonder.minRpx(),
        pref: 90, variant: hashStr(x.id) % 3, motif: wonderMotif(x),
      }));
      m.parks = (data?.wonders || []).filter((x) => x.kind === "natural" && Array.isArray(x.cells) && x.cells.length > 1)
        .map((x) => ({ wonder: x, ...prepareCellSet(w, x.cells) }));
    } else if (name === "trade") {
      m.routes = data ? prepareRoutes(w, data) : [];
    }
    place(m);
    m._vis.clear();
    m.version++;
  };
  return m;
}

const okCell = (w) => (x) => x && Number.isInteger(x.cell) && x.cell >= 0 && x.cell < w.grid.size;

function hashStr(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Preferred direction (deg, y down) toward the site's true position, or `def` when it sits at the centre.
function towards(w, it, def) {
  const { grid } = w;
  if (!Number.isFinite(it.x) || !Number.isFinite(it.y)) return def;
  const dx = it.x - grid.cx(it.cell), dy = it.y - grid.cy(it.cell);
  if (Math.hypot(dx, dy) < 0.2 * grid.R) return def;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// A port leans toward open water: its true point if it is off the centre, else the first water neighbour.
function waterAngle(w, p) {
  const a = towards(w, p, null);
  if (a != null) return a;
  for (let d = 0; d < 6; d++) {
    const j = w.grid.neighbour(p.cell, d);
    if (j >= 0 && w.water?.[j]) return d * 60;
  }
  return 90;
}

function nearWater(w, cell) {
  if (w.water?.[cell]) return true;
  for (let d = 0; d < 6; d++) {
    const j = w.grid.neighbour(cell, d);
    if (j >= 0 && w.water?.[j]) return true;
  }
  return false;
}

const angDist = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
};

// Hexes a site should not stand on: city tiles, big metros' spill tiles, and the two hexes above a sizeable city where
// its banner plate sits (banners are drawn over the map every frame, so a site there would be hidden).
const BANNER_POP = 2.5e5;
function blockedCells(w) {
  const out = new Set(w.cityByCell.keys());
  try { for (const c of metroSpill(w).keys()) out.add(c); } catch { /* no spill art: city tiles only */ }
  for (const [cell, city] of w.cityByCell) {
    if (!(city.population >= BANNER_POP)) continue;
    for (const d of [4, 5]) {
      const j = w.grid.neighbour(cell, d);
      if (j >= 0) out.add(j);
    }
  }
  return out;
}

/**
 * The hex to draw a site on: its own, or for a blocked hex the best free one: its own footprint nearby or one ring out,
 * and only when that ring is all taken (a dense metro on a coast) two rings out. Null-safe for sites without x/y.
 */
const WATER_OK = new Set(["coast", "bridge", "dam"]);
function chooseCell(m, it, blocked, load) {
  const { grid } = m.w;
  if (!blocked.has(it.cell)) return it.cell;
  const tx = Number.isFinite(it.data.x) ? it.data.x : grid.cx(it.cell);
  const ty = Number.isFinite(it.data.y) ? it.data.y : grid.cy(it.cell);
  const own = new Set(Array.isArray(it.data.cells) ? it.data.cells : []);
  const waterOk = it.kind === "port" || WATER_OK.has(it.motif); // a harbour, a bridge or a lighthouse may stand on water
  const ring1 = new Set();
  for (let d = 0; d < 6; d++) ring1.add(grid.neighbour(it.cell, d));
  // a fort or park that spans several hexes may stand anywhere on its own ground nearby
  for (const c of own) if (Math.hypot(grid.cx(c) - tx, grid.cy(c) - ty) < 2.6 * grid.R) ring1.add(c);
  const pick = (cand, extra) => {
    let best = -1, bestS = Infinity;
    for (const c of cand) {
      if (!(c >= 0) || c === it.cell || blocked.has(c)) continue;
      if (m.w.water?.[c] && !waterOk) continue;
      const sc = Math.hypot(grid.cx(c) - tx, grid.cy(c) - ty) / grid.R + extra + (load.get(c) || 0) * 0.7 - (own.has(c) ? 0.4 : 0) +
        (m.w.resources?.byCell?.get(c)?.length ? 0.3 : 0);
      if (sc < bestS) { bestS = sc; best = c; }
    }
    return best;
  };
  let best = pick(ring1, 0);
  if (best < 0) {
    const ring2 = new Set();
    for (const c of ring1) if (c >= 0) for (let d = 0; d < 6; d++) ring2.add(grid.neighbour(c, d));
    best = pick(ring2, 0.5);
  }
  return best >= 0 ? best : it.cell;
}

/** Assign each site a hex (off city tiles) and a slot in it (highest priority first). */
function place(m) {
  const { grid } = m.w;
  const R = grid.R;
  const all = [...m.wonders, ...m.installations, ...m.ports, ...m.airports].sort((a, b) => a.prio - b.prio);
  const res = m.w.resources?.byCell;
  const blocked = blockedCells(m.w);
  const load = new Map(); // drawCell → sites so far
  for (const it of all) {
    it.drawCell = chooseCell(m, it, blocked, load);
    it.nudged = it.drawCell !== it.cell;
    load.set(it.drawCell, (load.get(it.drawCell) || 0) + 1);
  }
  const taken = new Map(); // drawCell → Set(slot index; -1 = centre)
  for (const it of all) {
    const cell = it.drawCell;
    // sites sharing a hex are drawn smaller so each keeps its own slot
    const n = load.get(cell);
    const isCity = m.w.cityByCell.has(cell);
    it.k = Math.min(isCity ? 0.72 : 1, n >= 3 ? 0.6 : n === 2 ? 0.74 : 1);
    let t = taken.get(cell);
    if (!t) taken.set(cell, (t = new Set()));
    const centreFree = !isCity && !(res && res.get(cell)?.length) && !t.has(-1);
    let slot = -1;
    if (!centreFree) {
      // lean toward the true point (for a moved site: toward the city it belongs to)
      const pref = it.nudged ? (Math.atan2(grid.cy(it.cell) - grid.cy(cell), grid.cx(it.cell) - grid.cx(cell)) * 180) / Math.PI : it.pref ?? 90;
      let best = -1, bestD = Infinity;
      RING.forEach(([, , deg], k) => {
        if (t.has(k)) return;
        const d = angDist(deg, pref) + k * 0.01;
        if (d < bestD) { bestD = d; best = k; }
      });
      slot = best >= 0 ? best : t.size % 6;
    }
    t.add(slot);
    const [ox, oy] = slot < 0 ? [0, 0] : (isCity ? CITY_RING : RING)[slot];
    it.x = grid.cx(cell) + ox * R;
    it.y = grid.cy(cell) + oy * R;
    it.slot = slot;
  }
}

/** Glyph size (css px) of a site at a zoom. */
export function siteSize(it, Rpx) {
  const k = Rpx >= 16 ? it.k ?? 1 : 1; // zoomed out only one site per hex shows anyway
  if (it.kind === "port") return k * SITE_RULES.port.size(it.tier, Rpx);
  if (it.kind === "airport") return k * SITE_RULES.airport.size(it.tier, Rpx);
  if (it.kind === "fort") return k * SITE_RULES.fort.size(it.tier, Rpx);
  return k * SITE_RULES.wonder.size(it.data.rank || 99, Rpx);
}

/**
 * The items of a layer drawn at this zoom: passing their zoom rule, then decluttered greedily by priority (a site is
 * skipped when it would cover more than ~40% of one already kept). Depends only on the zoom (not the viewport), so
 * hit tests agree with what was drawn; cached per 0.25 px bucket.
 */
export function visibleSites(m, layerId, items, Rpx) {
  const b = Math.round(Rpx * 4) / 4;
  const key = `${layerId}|${b}`;
  let out = m._vis.get(key);
  if (out) return out;
  const s = b / m.w.grid.R; // css px per km
  const cand = items.filter((it) => b >= it.minRpx).sort((p, q) => p.prio - q.prio);
  out = [];
  const kept = [];
  for (const it of cand) {
    const r = siteSize(it, b) / 2;
    const x = it.x * s, y = it.y * s;
    let ok = true;
    for (const [kx, ky, kr] of kept) {
      if ((kx - x) ** 2 + (ky - y) ** 2 < ((kr + r) * 0.62) ** 2) { ok = false; break; }
    }
    if (!ok) continue;
    kept.push([x, y, r]);
    out.push(it);
  }
  if (m._vis.size > 400) m._vis.clear();
  m._vis.set(key, out);
  return out;
}

/** The topmost item of `list` under (x, y) km at this zoom, or null. */
export function hitSites(list, x, y, Rpx, grid) {
  const s = Rpx / grid.R;
  for (let k = list.length - 1; k >= 0; k--) {
    const it = list[k];
    const r = (siteSize(it, Rpx) / 2) * 0.85 / s;
    if ((it.x - x) ** 2 + (it.y - y) ** 2 <= r * r) return it;
  }
  return null;
}
