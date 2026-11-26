// Simulación de «Hispania»: el mapa de juego (derivado de world.json + game.json), el estado de la partida y todas
// las reglas (rendimientos, crecimiento, producción, investigación, fronteras, movimiento, combate, turnos,
// victoria). Sin DOM: la interfaz (ui.js), el dibujo (render.js) y la IA (ai.js) llaman aquí.
import {
  PEOPLES, PEOPLE_BY_ID, DIFFICULTY, COVER, RELIEF, WATER, RESOURCES, UNITS, BUILDINGS, WONDERS, TECHS, LAST_TECH, MAX_TURNS,
  GOVS, INVASIONS, EVENTS, TAGS, FAITHS, ERAS, yearOf, yearLabel, IMPROVEMENTS, MINERALS, PLANTS, ROAD,
} from "./rules.js";

// --- utilidades -------------------------------------------------------------------------------------------------
export function rng(G) {
  // mulberry32 con el estado dentro de la partida (determinista y guardable)
  G.rng = (G.rng + 0x6d2b79f5) | 0;
  let t = G.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const hash01 = (i, salt) => {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// --- mapa de juego ---------------------------------------------------------------------------------------------
// kind: 0 intransitable (fuera de España o vacío) · 1 tierra · 2 costa · 3 mar abierto · 4 lago
export const K = { VOID: 0, LAND: 1, COAST: 2, OCEAN: 3, LAKE: 4 };

export function buildMap(w, gd) {
  const grid = w.grid, n = grid.size, cols = grid.cols;
  const owner = w.raw.owner;
  const kind = new Int8Array(n), relief = new Int8Array(n), cover = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    relief[i] = w.relief?.[i] ?? 0;
    cover[i] = w.cover?.[i] ?? 0;
    const wt = w.water?.[i] ?? 0;
    if (owner[i] >= 0) kind[i] = K.LAND;
    else if (wt === 1) kind[i] = K.OCEAN;
    else if (wt === 2) kind[i] = K.COAST;
    else if (wt === 3) kind[i] = K.LAKE;
    else kind[i] = K.VOID;
  }
  const nb = new Int32Array(n * 6);
  for (let i = 0; i < n; i++) for (let d = 0; d < 6; d++) nb[i * 6 + d] = grid.neighbour(i, d);
  // coordenadas cúbicas (odd-r) para distancias
  const qx = new Int16Array(n), qz = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = (i / cols) | 0;
    qx[i] = c - ((r - (r & 1)) >> 1);
    qz[i] = r;
  }
  const river = new Uint8Array(n);
  for (const rv of w.raw.rivers || []) {
    const p = rv.pts || [];
    for (let k = 0; k + 3 < p.length; k += 2) {
      const x0 = p[k], y0 = p[k + 1], x1 = p[k + 2], y1 = p[k + 3];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (grid.R * 0.5)));
      for (let s = 0; s <= steps; s++) {
        const c = grid.cellAt(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps);
        if (c >= 0 && kind[c] === K.LAND) river[c] = 1;
      }
    }
  }
  const coastal = new Uint8Array(n), fresh = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (kind[i] !== K.LAND) continue;
    for (let d = 0; d < 6; d++) {
      const j = nb[i * 6 + d];
      if (j < 0) continue;
      if (kind[j] === K.COAST || kind[j] === K.OCEAN) coastal[i] = 1;
      if (kind[j] === K.LAKE) fresh[i] = 1;
    }
    if (river[i]) fresh[i] = 1;
  }
  // recursos: los históricos de game.json y otros comunes repartidos por terreno (deterministas)
  const res = new Array(n).fill(null);
  for (const r of gd?.resources || []) if (r.cell >= 0 && r.cell < n && RESOURCES[r.type]) res[r.cell] = r.type;
  for (let i = 0; i < n; i++) {
    if (res[i]) continue;
    const h = hash01(i, 77);
    if (kind[i] === K.LAND && relief[i] < 3) {
      const cv = cover[i];
      if ((cv === 7 || cv === 9) && h < 0.05) res[i] = "trigo";
      else if (cv === 5 && h < 0.06) res[i] = "ganado";
      else if (COVER[cv]?.forest && h < 0.05) res[i] = "madera";
      else if (cv === 4 && h < 0.04) res[i] = "ovejas";
    } else if (kind[i] === K.COAST && h < 0.05) res[i] = "pesca";
  }
  const M = {
    grid, n, cols, rows: grid.rows, kind, relief, cover, nb, qx, qz, river, coastal, fresh, res,
    names: gd?.names || {}, ancient: gd?.ancient || {}, starts: gd?.starts || {}, wonderSites: gd?.wonder_sites || {},
    entries: gd?.entries || {},
  };
  let land = 0;
  for (let i = 0; i < n; i++) if (kind[i] === K.LAND) land++;
  M.landCells = land;
  M.siteBase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (kind[i] !== K.LAND || relief[i] >= 2 || COVER[cover[i]]?.marsh) { M.siteBase[i] = -1; continue; }
    let s = 0;
    for (const j of within(M, i, 2)) {
      if (j === i) continue;
      const y = baseYield(M, j);
      s += y.f * 1.6 + y.p * 1.1 + y.g * 0.8 + (res[j] ? 2 : 0);
    }
    s += fresh[i] ? 6 : 0;
    s += coastal[i] ? 7 : 0;
    M.siteBase[i] = s;
  }
  return M;
}

export function dist(M, a, b) {
  const dx = M.qx[a] - M.qx[b], dz = M.qz[a] - M.qz[b];
  return (Math.abs(dx) + Math.abs(dz) + Math.abs(dx + dz)) / 2;
}
/** Casillas a distancia ≤ r de c (incluida c). */
export function within(M, c, r) {
  const out = [c];
  const seen = new Set(out);
  let ring = [c];
  for (let k = 0; k < r; k++) {
    const next = [];
    for (const i of ring) for (let d = 0; d < 6; d++) {
      const j = M.nb[i * 6 + d];
      if (j >= 0 && !seen.has(j)) { seen.add(j); next.push(j); out.push(j); }
    }
    ring = next;
  }
  return out;
}
export const neighbours = (M, c) => {
  const out = [];
  for (let d = 0; d < 6; d++) { const j = M.nb[c * 6 + d]; if (j >= 0) out.push(j); }
  return out;
};

function baseYield(M, c) {
  const k = M.kind[c];
  let f = 0, p = 0, g = 0, s = 0, cu = 0;
  if (k === K.LAND) {
    const cv = COVER[M.cover[c]] || COVER[0], rl = RELIEF[M.relief[c]] || RELIEF[0];
    f = cv.f; p = cv.p; g = cv.g || 0;
    if (rl.p) p += rl.p;
    if (rl.fMax != null) f = Math.min(f, rl.fMax);
    if (M.river[c]) g += 1;
  } else if (k === K.COAST || k === K.OCEAN || k === K.LAKE) {
    const wt = WATER[k === K.LAKE ? 3 : k === K.COAST ? 2 : 1];
    f = wt.f; p = wt.p; g = wt.g;
  }
  const r = M.res[c] && RESOURCES[M.res[c]];
  if (r) { f += r.f || 0; p += r.p || 0; g += r.g || 0; s += r.s || 0; cu += r.c || 0; }
  return { f, p, g, s, c: cu };
}

export function terrainName(M, c) {
  const k = M.kind[c];
  if (k === K.LAND) {
    const rl = M.relief[c];
    const cv = COVER[M.cover[c]]?.name || "Tierra";
    return rl === 0 ? cv : `${RELIEF[rl].name} · ${cv.toLowerCase()}`;
  }
  if (k === K.COAST) return "Costa";
  if (k === K.OCEAN) return "Mar abierto";
  if (k === K.LAKE) return "Lago";
  return "Tierras lejanas";
}
export function moveCostOf(M, c) {
  if (M.kind[c] !== K.LAND) return 1;
  const rl = RELIEF[M.relief[c]] || RELIEF[0];
  if (!Number.isFinite(rl.move)) return Infinity;
  const cv = COVER[M.cover[c]] || {};
  return Math.min(3, rl.move + (cv.forest || cv.marsh ? 1 : 0));
}
export function defenseBonus(M, c) {
  if (M.kind[c] !== K.LAND) return 0;
  return Math.min(6, (RELIEF[M.relief[c]]?.def || 0) + (COVER[M.cover[c]]?.forest ? 3 : 0));
}

// --- partida ----------------------------------------------------------------------------------------------------
export function createGame(M, { people, rivals = 5, difficulty = "normal", seed = (Date.now() % 1e9) | 0 } = {}) {
  const G = {
    v: 1, seed, rng: seed, turn: 1, difficulty, nextId: 1, players: [], cities: [], units: [],
    tileOwner: new Int32Array(M.n).fill(-1), explored: new Uint8Array(M.n), log: [], over: null, wondersBuilt: {},
    invDone: {}, chron: [], alerts: [], improv: {}, road: {}, routes: [],
  };
  const others = PEOPLES.filter((p) => p.id !== people && M.starts[p.id] != null);
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rng(G) * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const chosen = [PEOPLE_BY_ID.get(people), ...others.slice(0, Math.max(1, Math.min(rivals, others.length)))];
  chosen.forEach((pp, idx) => {
    const P = {
      idx, people: pp.id, name: pp.name, color: pp.color, ink: pp.ink, human: idx === 0, alive: true,
      gold: 10, science: 0, research: null, techs: ["agricultura"], culture: 0, war: {}, met: {},
      capital: null, settlers: 0, lastScore: 0, peaceUntil: {}, original: true,
      gov: "jefatura", govTurn: 1, stability: 60, stabMod: 0, mods: {}, temp: [], tags: [], evDone: [], country: null, techBoost: {},
      faith: "antiguos", evChoice: {}, evLast: {}, lastEv: -99,
    };
    if (pp.id === "celtiberos") P.techs.push("mineria");
    if (pp.id === "argaricos") P.techs.push("mineria", "bronce");
    if (pp.id === "vettones") P.techs.push("ganaderia");
    G.players.push(P);
  });
  for (const P of G.players) {
    let start = M.starts[P.people];
    if (start == null || M.kind[start] !== K.LAND) start = nearestLand(M, start ?? 0);
    const spot = (c) => within(M, c, 2).filter((j) => j !== c && M.kind[j] === K.LAND && moveCostOf(M, j) < Infinity);
    addUnit(G, P.idx, "colono", start);
    addUnit(G, P.idx, "guerreros", start);
    const free = spot(start);
    if (free[0] != null) addUnit(G, P.idx, "explorador", free[0]);
    if (!P.human && difficulty === "dificil" && free[1] != null) addUnit(G, P.idx, "guerreros", free[1]);
    P.start = start;
  }
  logEvent(G, `Comienza la partida. Diriges a los ${G.players[0].name}.`, { player: 0 });
  chron(G, 0, `Los ${G.players[0].name} se asientan en ${PEOPLE_BY_ID.get(people)?.region || "la Península"}.`, "origen");
  return G;
}
function nearestLand(M, c) {
  let best = -1, bd = Infinity;
  for (let i = 0; i < M.n; i++) if (M.kind[i] === K.LAND && moveCostOf(M, i) < Infinity) {
    const d = dist(M, i, c);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
export function addUnit(G, owner, type, cell) {
  const u = { id: G.nextId++, owner, type, cell, hp: 100, mp: UNITS[type].mov, fortified: false, acted: false, goto: null, sleep: false };
  G.units.push(u);
  return u;
}
export function logEvent(G, msg, { player = null, cell = null, kind = "info" } = {}) {
  G.log.push({ turn: G.turn, msg, player, cell, kind });
  if (G.log.length > 300) G.log.splice(0, G.log.length - 300);
}

export const has = (P, tech) => P.techs.includes(tech);
export const atWar = (G, a, b) => a !== b && !!G.players[a]?.war[b];
export const unitsAt = (G, c) => G.units.filter((u) => u.cell === c);
export const cityAt = (G, c) => G.cities.find((x) => x.cell === c) || null;
let _cbi = null;
export const cityById = (G, id) => {
  if (!_cbi || _cbi.G !== G || _cbi.n !== G.cities.length) _cbi = { G, n: G.cities.length, map: new Map(G.cities.map((c) => [c.id, c])) };
  return _cbi.map.get(id) || null;
};
export const isMilitary = (u) => UNITS[u.type].cls !== "civil";
export const isNaval = (u) => UNITS[u.type].cls === "naval";
const stackCat = (type) => (UNITS[type].cls === "naval" ? "n" : UNITS[type].cls === "civil" ? "c" : "m");
export const playerCities = (G, p) => G.cities.filter((c) => c.owner === p);
export const playerUnits = (G, p) => G.units.filter((u) => u.owner === p);
export const tileCity = (G, c) => (G.tileOwner[c] >= 0 ? cityById(G, G.tileOwner[c]) : null);
export const tileOwnerPlayer = (G, c) => tileCity(G, c)?.owner ?? -1;

// --- rendimientos -----------------------------------------------------------------------------------------------
export function tileYield(G, M, owner, c, city = null) {
  const y = baseYield(M, c);
  const P = G.players[owner];
  if (!P) return y;
  if (M.kind[c] === K.LAND) {
    if (M.relief[c] === 1 && has(P, "mineria")) y.p += 1;
    if (M.cover[c] === 5 && has(P, "ganaderia")) y.f += 1;
    if (P.people === "vettones" && M.cover[c] === 5) y.f += 1;
    if (P.people === "galaicos" && M.cover[c] === 3) y.f += 1;
    if (P.people === "ilergetes" && M.river[c]) y.p += 1;
    if (P.people === "argaricos" && M.relief[c] >= 1) y.p += 1;
  } else {
    if (P.people === "galaicos" && M.kind[c] === K.COAST) y.f += 1;
    if (city && city.buildings.includes("puerto")) y.f += 1;
  }
  if (P.people === "tartesios" && M.res[c]) y.g += 1;
  const imp = G.improv?.[c] && IMPROVEMENTS[G.improv[c]];
  if (imp) {
    y.f += imp.f || 0; y.p += imp.p || 0; y.g += imp.g || 0;
    if (imp.up && has(P, imp.up.tech)) { y.f += imp.up.f || 0; y.p += imp.up.p || 0; y.g += imp.up.g || 0; }
    if (G.improv[c] === "mina" && MINERALS.includes(M.res[c])) y.g += 1;
  }
  return y;
}
const tileScore = (y, needFood) => y.f * (needFood ? 2.2 : 1.3) + y.p * 1.25 + y.g * 0.8 + y.s * 1 + y.c * 0.7;

export function playerWonders(G, p) {
  const out = [];
  for (const c of G.cities) if (c.owner === p) for (const w of c.wonders) out.push(w);
  return out;
}
export function housing(G, M, city) {
  let h = 4 + (M.fresh[city.cell] || M.coastal[city.cell] ? 3 : 0);
  for (const b of city.buildings) h += BUILDINGS[b]?.housing || 0;
  for (const w of playerWonders(G, city.owner)) h += WONDERS[w]?.allHousing || 0;
  return h;
}
export const growthNeed = (pop) => Math.round(8 + 5 * pop + Math.pow(pop, 1.8));
export const borderCost = (k) => Math.round(8 + 5 * k + Math.pow(k, 1.5));
export function eraOf(P) {
  let e = 0;
  for (const t of P.techs) e = Math.max(e, TECHS[t]?.era || 0);
  return e;
}

/** Rendimiento de una ciudad: casillas trabajadas (elegidas automáticamente) + centro + edificios + maravillas. */
export function cityYield(G, M, city) {
  const P = G.players[city.owner];
  const mine = [];
  for (const c of within(M, city.cell, 3)) if (c !== city.cell && G.tileOwner[c] === city.id && M.kind[c] !== K.VOID) mine.push(c);
  // centro
  const cy = tileYield(G, M, city.owner, city.cell, city);
  const tot = { f: Math.max(2, cy.f) + 2, p: Math.max(1, cy.p) + 1, g: cy.g + 1, s: cy.s, c: cy.c };
  // casillas: codiciosa, primando la comida mientras haga falta
  const ys = mine.map((c) => ({ c, y: tileYield(G, M, city.owner, c, city) }));
  const worked = [];
  const taken = new Set();
  // casillas ocupadas por unidades enemigas no se trabajan
  for (const u of G.units) if (u.owner !== city.owner && atWar(G, city.owner, u.owner)) taken.add(u.cell);
  for (let k = 0; k < city.pop; k++) {
    const surplus = tot.f - 2 * city.pop;
    let best = null, bs = -Infinity;
    for (const t of ys) {
      if (taken.has(t.c)) continue;
      const s = tileScore(t.y, surplus < 2);
      if (s > bs) { bs = s; best = t; }
    }
    if (!best) break;
    taken.add(best.c);
    worked.push(best.c);
    tot.f += best.y.f; tot.p += best.y.p; tot.g += best.y.g; tot.s += best.y.s; tot.c += best.y.c;
  }
  // población, palacio y edificios
  tot.s += 1 + city.pop * (0.5 + 0.13 * eraOf(P)); // la ciencia por habitante crece con la era
  tot.c += 1;
  if (city.capital) { tot.p += 2; tot.s += 2; tot.g += 2; tot.c += 1; }
  let gPct = 0, sPct = 0, pPct = 0, cPct = 0;
  for (const b of city.buildings) {
    const B = BUILDINGS[b];
    if (!B) continue;
    tot.f += B.f || 0; tot.p += B.p || 0; tot.g += B.g || 0; tot.s += B.s || 0; tot.c += B.c || 0;
    gPct += B.gPct || 0; sPct += B.sPct || 0; pPct += B.pPct || 0;
  }
  for (const w of city.wonders) {
    const W = WONDERS[w];
    tot.f += W.f || 0; tot.p += W.p || 0; tot.g += W.g || 0; tot.s += W.s || 0; tot.c += W.c || 0;
  }
  for (const w of playerWonders(G, city.owner)) {
    const W = WONDERS[w];
    tot.f += W.allF || 0; tot.g += W.allG || 0; tot.c += W.allC || 0;
    if (W.coastG && M.coastal[city.cell]) tot.g += W.coastG;
  }
  // ventajas de cada pueblo
  if (P.people === "iberos") { tot.c += 2; tot.s += 1; }
  if (P.people === "tartesios") tot.g += 2;
  if (P.people === "carpetanos") { if (city.capital) tot.s += 3; sPct += 0.1; }
  // gobierno y decisiones
  const m = pmods(G, P);
  tot.f += m.cityF; tot.s += m.cityS; tot.c += m.cityC; tot.g += m.cityG;
  for (const r of G.routes || []) {
    if (r.from === city.id) { const t = routeYield(G, M, r); tot.g += t.g; tot.s += t.s; }
    else if (r.to === city.id) tot.g += 1;
  }
  if (city.faith && city.faith === P.faith && P.faith !== "laica") tot.c += 1; // cohesión: la ciudad comparte la fe del Estado
  if (M.coastal[city.cell]) tot.g += m.coastG;
  if (city.capital) tot.p += m.capP;
  pPct += m.pPct; gPct += m.gPct; sPct += m.sPct; cPct += m.cPct;
  const k = stabMult(P);
  tot.p = Math.max(0, tot.p * (1 + pPct) * k);
  tot.g = Math.max(0, tot.g * (1 + gPct) * k);
  tot.s = Math.max(0, tot.s * (1 + sPct) * k);
  tot.c = Math.max(0, tot.c * (1 + cPct) * k);
  if (!P.human) {
    const k = DIFFICULTY[G.difficulty]?.ai ?? 1;
    tot.p *= k; tot.s *= k; tot.g *= k;
  }
  for (const key of ["f", "p", "g", "s", "c"]) tot[key] = Math.round(tot[key] * 10) / 10;
  return { ...tot, food: tot.f - 2 * city.pop, worked, housing: housing(G, M, city) };
}

export function playerTotals(G, M, p) {
  const t = { f: 0, p: 0, g: 0, s: 0, c: 0, food: 0 };
  for (const c of playerCities(G, p)) {
    const y = cityYield(G, M, c);
    for (const k of Object.keys(t)) t[k] += y[k];
  }
  for (const k of Object.keys(t)) t[k] = Math.round(t[k] * 10) / 10;
  t.upkeep = upkeep(G, p);
  t.net = Math.round((t.g - t.upkeep) * 10) / 10;
  return t;
}
export function upkeep(G, p) {
  const nu = G.units.filter((u) => u.owner === p && UNITS[u.type].cls !== "civil").length;
  const free = 2 + playerCities(G, p).length;
  return Math.max(0, nu - free);
}

// --- construcción -----------------------------------------------------------------------------------------------
export function settlerCost(G, p) { return 40 + 12 * Math.min(6, Math.max(0, playerCities(G, p).length - 1)); }
export function itemCost(G, item, p) {
  if (!item) return 0;
  if (item.kind === "unit") return item.id === "colono" ? settlerCost(G, p) : UNITS[item.id].cost;
  if (item.kind === "building") return BUILDINGS[item.id].cost;
  if (item.kind === "wonder") return WONDERS[item.id].cost;
  return 0;
}
export function itemName(item) {
  if (!item) return "Nada";
  if (item.kind === "unit") return UNITS[item.id].name;
  if (item.kind === "building") return BUILDINGS[item.id].name;
  if (item.kind === "wonder") return WONDERS[item.id].name;
  return "Comercio";
}
export function itemEmoji(item) {
  if (!item) return "·";
  if (item.kind === "unit") return UNITS[item.id].emoji;
  if (item.kind === "building") return BUILDINGS[item.id].emoji;
  if (item.kind === "wonder") return WONDERS[item.id].emoji;
  return "💱";
}
export function wonderSiteOk(G, M, city, wid) {
  const site = M.wonderSites[wid]?.cell;
  return site != null && G.tileOwner[site] === city.id;
}
/** Lo que una ciudad puede construir ahora: [{kind, id, cost, ok, why}] */
export function buildOptions(G, M, city) {
  const P = G.players[city.owner];
  const out = [];
  for (const [id, U] of Object.entries(UNITS)) {
    if (U.tech && !has(P, U.tech)) continue;
    if (U.obs && has(P, U.obs)) continue;
    if (U.cls === "naval" && !M.coastal[city.cell]) continue;
    const o = { kind: "unit", id, cost: itemCost(G, { kind: "unit", id }, city.owner), ok: true };
    if (id === "colono" && city.pop < 2) { o.ok = false; o.why = "Necesita 2 de población"; }
    out.push(o);
  }
  for (const [id, B] of Object.entries(BUILDINGS)) {
    if (B.tech && !has(P, B.tech)) continue;
    if (city.buildings.includes(id)) continue;
    const o = { kind: "building", id, cost: B.cost, ok: true };
    if (B.coastal && !M.coastal[city.cell]) { o.ok = false; o.why = "Solo en la costa"; }
    if (B.needs && !city.buildings.includes(B.needs)) { o.ok = false; o.why = `Requiere ${BUILDINGS[B.needs].name}`; }
    out.push(o);
  }
  for (const [id, W] of Object.entries(WONDERS)) {
    if (W.tech && !has(P, W.tech)) continue;
    if (G.wondersBuilt[id] != null) continue;
    if (!M.wonderSites[id]) continue;
    const o = { kind: "wonder", id, cost: W.cost, ok: wonderSiteOk(G, M, city, id) };
    if (!o.ok) o.why = `Su sitio (${M.wonderSites[id].short}) no está en el territorio de esta ciudad`;
    out.push(o);
  }
  out.push({ kind: "trade", id: "comercio", cost: 0, ok: true });
  return out;
}
export function setBuild(G, city, item) { city.build = item ? { kind: item.kind, id: item.id } : null; }
export function buyCost(G, city) {
  const it = city.build;
  if (!it || it.kind === "trade" || it.kind === "wonder") return null;
  const left = Math.max(0, itemCost(G, it, city.owner) - city.prod);
  return Math.round(left * 2 + 10);
}
export function buy(G, M, city) {
  const cost = buyCost(G, city);
  const P = G.players[city.owner];
  if (cost == null || P.gold < cost) return false;
  P.gold -= cost;
  city.prod = itemCost(G, city.build, city.owner);
  city.bought = true;
  return true;
}

// --- ciudades ---------------------------------------------------------------------------------------------------
export function canFound(G, M, u) {
  if (u.type !== "colono") return { ok: false, why: "Solo los colonos fundan ciudades" };
  const c = u.cell;
  if (M.kind[c] !== K.LAND) return { ok: false, why: "Hay que fundar en tierra firme" };
  if (moveCostOf(M, c) === Infinity) return { ok: false, why: "No se puede fundar en las cumbres" };
  for (const x of G.cities) if (dist(M, x.cell, c) < 4) return { ok: false, why: `Demasiado cerca de ${x.name}` };
  const own = tileOwnerPlayer(G, c);
  if (own >= 0 && own !== u.owner) return { ok: false, why: "Esa tierra ya es de otro pueblo" };
  return { ok: true };
}
function cityName(G, M, P, c) {
  const used = new Set(G.cities.map((x) => x.name));
  for (const j of within(M, c, 2)) {
    const a = M.ancient[j];
    if (a && !used.has(a)) return a;
  }
  for (const r of [0, 1, 2]) for (const j of within(M, c, r)) {
    const real = M.names[j];
    if (real && !used.has(real)) return real;
  }
  const pp = PEOPLE_BY_ID.get(P.people);
  for (const nm of pp?.names || []) if (!used.has(nm)) return nm;
  return `Ciudad ${G.cities.length + 1}`;
}
export function foundCity(G, M, u) {
  const chk = canFound(G, M, u);
  if (!chk.ok) return null;
  const P = G.players[u.owner];
  const city = {
    id: G.nextId++, owner: u.owner, orig: u.owner, name: cityName(G, M, P, u.cell), cell: u.cell, pop: 1, food: 0, prod: 0,
    build: null, buildings: [], wonders: [], hp: 200, culture: 0, tiles: 0, capital: !P.capital, founded: G.turn, hitTurn: -1,
    faith: P.faith || "antiguos",
  };
  if (!P.capital) { P.capital = city.id; P.capitalCell = city.cell; }
  if (playerWonders(G, u.owner).some((w) => WONDERS[w].freeWalls)) city.buildings.push("murallas");
  G.cities.push(city);
  for (const c of within(M, u.cell, 1)) if (G.tileOwner[c] < 0 && M.kind[c] !== K.VOID) G.tileOwner[c] = city.id;
  G.tileOwner[u.cell] = city.id;
  G.units = G.units.filter((x) => x !== u);
  city.hp = cityMaxHp(city);
  logEvent(G, `${P.name} fundan ${city.name}.`, { player: u.owner, cell: city.cell, kind: "city" });
  if (P.human) {
    const n = playerCities(G, u.owner).length;
    if (n === 1) chron(G, u.owner, `Fundáis ${city.name}, vuestra capital.`, "ciudad");
    else if (n === 5 || n === 10 || n === 20) chron(G, u.owner, `Con ${city.name} ya tenéis ${n} ciudades.`, "ciudad");
  }
  return city;
}
export function cityMaxHp(city) {
  let h = 200;
  for (const b of city.buildings) h += BUILDINGS[b]?.hp || 0;
  return h;
}
export function cityStrength(G, M, city) {
  const P = G.players[city.owner];
  let s = 10 + 2 * city.pop + 6 * eraOf(P);
  for (const b of city.buildings) s += BUILDINGS[b]?.def || 0;
  for (const w of playerWonders(G, city.owner)) s += WONDERS[w]?.allDef || 0;
  const g = G.units.find((u) => u.cell === city.cell && u.owner === city.owner && isMilitary(u) && UNITS[u.type].cls !== "explorador");
  if (g) s += Math.round(unitStr(G, g) * 0.5);
  if (M.relief[city.cell] >= 1) s += 2;
  const m = pmods(G, P);
  s += m.def;
  return Math.round(s * (1 + m.defPct));
}
const canStrike = (city) => city.buildings.includes("murallas");

function acquireTile(G, M, city) {
  let best = -1, bs = -Infinity;
  for (const c of within(M, city.cell, 3)) {
    if (G.tileOwner[c] >= 0 || M.kind[c] === K.VOID) continue;
    if (M.kind[c] === K.OCEAN && dist(M, c, city.cell) > 2) continue;
    let adj = false;
    for (const j of neighbours(M, c)) if (G.tileOwner[j] === city.id) { adj = true; break; }
    if (!adj) continue;
    const y = tileYield(G, M, city.owner, c, city);
    const s = y.f * 1.3 + y.p + y.g * 0.8 + (M.res[c] ? 4 : 0) - dist(M, c, city.cell) * 0.6 + (WONDER_CELLS(M).has(c) ? 3 : 0);
    if (s > bs) { bs = s; best = c; }
  }
  if (best >= 0) { G.tileOwner[best] = city.id; city.tiles++; return best; }
  return -1;
}
let _wc = null;
const WONDER_CELLS = (M) => (_wc && _wc.M === M ? _wc.set : (_wc = { M, set: new Set(Object.values(M.wonderSites).map((s) => s.cell)) }).set);

function freeSpawn(G, M, city, type) {
  const cat = stackCat(type);
  const busy = (c) => G.units.some((u) => u.cell === c && (stackCat(u.type) === cat || u.owner !== city.owner));
  if (cat === "n") {
    // los barcos salen al agua junto a la ciudad (o se quedan en el puerto)
    if (!busy(city.cell)) return city.cell;
    for (const c of within(M, city.cell, 2)) if ((M.kind[c] === K.COAST || M.kind[c] === K.LAKE || M.kind[c] === K.OCEAN) && !busy(c)) return c;
    return -1;
  }
  const ok = (c) => M.kind[c] === K.LAND && moveCostOf(M, c) < Infinity && !busy(c);
  if (ok(city.cell)) return city.cell;
  for (const c of within(M, city.cell, 3)) if (ok(c) && (G.tileOwner[c] === city.id || G.tileOwner[c] < 0)) return c;
  return -1;
}

function processCity(G, M, city, events) {
  const P = G.players[city.owner];
  const y = cityYield(G, M, city);
  // crecimiento
  const cap = y.housing;
  if (y.food >= 0) {
    if (city.pop < cap) city.food += y.food;
    else city.food = Math.min(city.food, growthNeed(city.pop) - 1);
  } else city.food += y.food;
  if (city.food >= growthNeed(city.pop)) {
    city.food -= growthNeed(city.pop);
    city.food = Math.floor(city.food * (city.buildings.includes("granero") ? 1 : 0.5));
    city.pop++;
    if (P.human && city.pop % 3 === 0) events.push({ msg: `${city.name} crece a ${city.pop}.`, cell: city.cell, kind: "grow" });
  } else if (city.food < 0) {
    if (city.pop > 1) { city.pop--; city.food = 0; events.push({ msg: `Hambre en ${city.name}: pierde población.`, cell: city.cell, kind: "bad", player: city.owner }); }
    else city.food = 0;
  }
  // cultura y fronteras
  city.culture += y.c;
  P.culture += y.c;
  while (city.culture >= borderCost(city.tiles)) {
    const need = borderCost(city.tiles);
    if (acquireTile(G, M, city) < 0) break;
    city.culture -= need;
  }
  // producción
  P._sci = (P._sci || 0) + y.s;
  P._gold = (P._gold || 0) + y.g;
  const it = city.build;
  if (!it) return;
  if (it.kind === "trade") { P._gold += y.p * 0.5; return; }
  city.prod += y.p;
  const cost = itemCost(G, it, city.owner);
  if (city.prod < cost) return;
  city.bought = false;
  if (it.kind === "unit") {
    if (it.id === "colono" && city.pop < 2) { city.prod = cost; return; }
    const at = freeSpawn(G, M, city, it.id);
    if (at < 0) { city.prod = cost; return; }
    const nu = addUnit(G, city.owner, it.id, at);
    nu.home = city.id;
    if (it.id === "colono") { city.pop--; P.settlers++; }
    city.prod -= cost;
    if (P.human) events.push({ msg: `${city.name} ha entrenado ${UNITS[it.id].name}.`, cell: city.cell, kind: "unit", player: city.owner });
    city.build = null;
  } else if (it.kind === "building") {
    city.buildings.push(it.id);
    if (it.id === "murallas" || it.id === "castillo") city.hp = Math.min(cityMaxHp(city), city.hp + 100);
    city.prod -= cost;
    if (P.human) events.push({ msg: `${city.name} ha construido: ${BUILDINGS[it.id].name}.`, cell: city.cell, kind: "build", player: city.owner });
    city.build = null;
  } else if (it.kind === "wonder") {
    if (G.wondersBuilt[it.id] != null) { city.build = null; return; }
    city.wonders.push(it.id);
    G.wondersBuilt[it.id] = city.owner;
    if (WONDERS[it.id].freeWalls) for (const c of playerCities(G, city.owner)) if (!c.buildings.includes("murallas")) c.buildings.push("murallas");
    city.prod -= cost;
    events.push({ msg: `🏛️ ${P.name} terminan una maravilla: ${WONDERS[it.id].name} (${city.name}).`, cell: city.cell, kind: "wonder", player: city.owner, all: true });
    if (P.human) chron(G, city.owner, `Termináis ${WONDERS[it.id].name} en ${city.name}.`, "maravilla");
    city.build = null;
    // las demás ciudades que la construían pierden la obra (la producción pasa a comercio)
    for (const c of G.cities) if (c !== city && c.build?.kind === "wonder" && c.build.id === it.id) {
      c.build = null;
      if (G.players[c.owner].human) events.push({ msg: `Otro pueblo terminó antes ${WONDERS[it.id].name}: ${c.name} se queda sin obra.`, cell: c.cell, kind: "bad", player: c.owner });
    }
  }
  if (city.build?.kind !== "unit") city.prod = Math.min(city.prod, 40);
}

// --- investigación ----------------------------------------------------------------------------------------------
export function availableTechs(P) {
  return Object.keys(TECHS).filter((t) => !has(P, t) && TECHS[t].req.every((r) => has(P, r)));
}
// Las tecnologías se encarecen a medida que se conocen más (el ritmo del juego: la imprenta, hacia el turno 200).
export function techCost(P, t) { return Math.round(TECHS[t].cost * (1.2 + 0.14 * P.techs.length) * (1 - (P.techBoost?.[t] || 0))); }
export function turnsTo(need, per) { return per > 0 ? Math.max(1, Math.ceil(need / per)) : Infinity; }

// --- visibilidad ------------------------------------------------------------------------------------------------
export function visibility(G, M, p) {
  const vis = new Uint8Array(M.n);
  const mark = (c, r) => { for (const j of within(M, c, r)) vis[j] = 1; };
  for (const u of G.units) if (u.owner === p) mark(u.cell, (UNITS[u.type].sight || 2) + (M.relief[u.cell] >= 1 && M.kind[u.cell] === K.LAND ? 1 : 0));
  for (const c of G.cities) if (c.owner === p) mark(c.cell, 3);
  const mine = new Set(G.cities.filter((c) => c.owner === p).map((c) => c.id));
  for (let i = 0; i < M.n; i++) if (mine.has(G.tileOwner[i])) {
    vis[i] = 1;
    for (let d = 0; d < 6; d++) { const j = M.nb[i * 6 + d]; if (j >= 0) vis[j] = 1; }
  }
  return vis;
}
export function updateExplored(G, M) {
  const vis = visibility(G, M, 0);
  for (let i = 0; i < M.n; i++) if (vis[i]) G.explored[i] = 1;
  // conocer a otro pueblo: ver una de sus unidades o ciudades
  for (const u of G.units) if (u.owner !== 0 && vis[u.cell]) meet(G, 0, u.owner);
  for (const c of G.cities) if (c.owner !== 0 && vis[c.cell]) meet(G, 0, c.owner);
  return vis;
}
export function meet(G, a, b) {
  if (a === b || G.players[a].met[b]) return false;
  G.players[a].met[b] = true;
  G.players[b].met[a] = true;
  if (a === 0 || b === 0) logEvent(G, `Habéis conocido a los ${G.players[a === 0 ? b : a].name}.`, { player: 0, kind: "meet" });
  return true;
}

// --- movimiento -------------------------------------------------------------------------------------------------
const waterMov = (G, p) => 3 + (playerWonders(G, p).some((w) => WONDERS[w].embark) ? 1 : 0);
export function fullMp(G, M, u) { return isNaval(u) || M.kind[u.cell] === K.LAND ? UNITS[u.type].mov : waterMov(G, u.owner); }

/** Coste de entrar en `to` desde `from`, o -1 si no se puede (99 = embarcar/desembarcar: gasta todo). */
export function enterCost(G, M, u, from, to, { ignoreUnits = false, occ = null } = {}) {
  const blocked = () => (occ ? (occ.get(to) || []).some((o) => o !== u.owner) : G.units.some((o) => o.cell === to && o.owner !== u.owner));
  const k = M.kind[to];
  const P = G.players[u.owner];
  if (k === K.VOID) return -1;
  if (isNaval(u)) {
    // los barcos solo navegan (y entran en los puertos propios)
    if (k === K.LAND) {
      const c = cityAt(G, to);
      if (!c || c.owner !== u.owner) return -1;
    } else if (k === K.OCEAN && !has(P, "cartografia")) return -1;
    if (!ignoreUnits && blocked()) return -1;
    return 1;
  }
  if (k === K.LAND) {
    if (moveCostOf(M, to) === Infinity) return -1;
  } else {
    if (k === K.OCEAN && !has(P, "cartografia")) return -1;
    if ((k === K.COAST || k === K.LAKE) && !has(P, "navegacion") && !has(P, "cartografia")) return -1;
  }
  const tc = tileCity(G, to);
  // fronteras cerradas en paz (salvo para los mercaderes)
  if (tc && tc.owner !== u.owner && !atWar(G, u.owner, tc.owner) && !UNITS[u.type].trade) return -1;
  if (tc && tc.cell === to && tc.owner !== u.owner) return -1; // las ciudades ajenas solo se toman atacando
  if (!ignoreUnits && blocked()) return -1;
  const fromLand = M.kind[from] === K.LAND, toLand = k === K.LAND;
  if (fromLand !== toLand) return 99;
  if (!toLand) return 1;
  // caminos: mitad de coste (cuarta parte con ferrocarril) entre casillas con camino o ciudad
  if ((G.road[from] || isCityCell(G, from)) && (G.road[to] || isCityCell(G, to)) && (G.road[from] || G.road[to])) return has(P, "ferrocarril") ? 0.25 : 0.5;
  return moveCostOf(M, to);
}
let _cc = null;
function isCityCell(G, c) {
  if (!_cc || _cc.G !== G || _cc.n !== G.cities.length) _cc = { G, n: G.cities.length, set: new Set(G.cities.map((x) => x.cell)) };
  return _cc.set.has(c);
}
function canStop(G, u, c) {
  const cat = stackCat(u.type);
  return !G.units.some((o) => o !== u && o.cell === c && (o.owner !== u.owner || stackCat(o.type) === cat));
}

/**
 * Camino por turnos (Dijkstra) desde la unidad hasta `target`. Devuelve {path:[celdas], turns:[turno de llegada a cada
 * celda]} o null. Con `attack`, el destino puede estar ocupado por el enemigo (se para al lado).
 */
export function findPath(G, M, u, target, { attack = false, maxTurns = 30 } = {}) {
  if (target === u.cell) return { path: [], turns: [] };
  const n = M.n;
  const best = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const mpAt = new Float32Array(n), tAt = new Int16Array(n);
  const key = (t, mp, full) => t * 1000 + (full - mp);
  const heap = [];
  const push = (k, c) => { heap.push([k, c]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const start = u.cell;
  const full0 = fullMp(G, M, u);
  const occ = occupancy(G);
  const wm = waterMov(G, u.owner), lm = UNITS[u.type].mov, naval = isNaval(u);
  const movAt = (c) => (naval || M.kind[c] === K.LAND ? lm : wm);
  best[start] = 0; mpAt[start] = u.mp; tAt[start] = 0;
  push(0, start);
  while (heap.length) {
    const [k, c] = pop();
    if (k > best[c]) continue;
    if (c === target) break;
    for (let d = 0; d < 6; d++) {
      const j = M.nb[c * 6 + d];
      if (j < 0) continue;
      const isTarget = j === target;
      let cost = enterCost(G, M, u, c, j, { ignoreUnits: attack && isTarget, occ });
      if (cost < 0) {
        if (!(attack && isTarget)) continue;
        cost = 1;
      }
      // las propias unidades se atraviesan, pero no se acaba un turno encima de ellas (simplificado: se permite pasar)
      let t = tAt[c], mp = mpAt[c];
      const fullHere = movAt(c);
      if (mp <= 0) { t += 1; mp = fullHere; }
      if (t > maxTurns) continue;
      mp = cost <= mp ? mp - cost : 0;
      const fullNext = movAt(j);
      const kk = key(t, mp, Math.max(fullNext, full0));
      if (kk < best[j]) {
        best[j] = kk; prev[j] = c; mpAt[j] = mp; tAt[j] = t;
        push(kk, j);
      }
    }
  }
  if (best[target] === Infinity) return null;
  const path = [], turns = [];
  for (let c = target; c !== start && c >= 0; c = prev[c]) { path.push(c); turns.push(tAt[c]); }
  path.reverse(); turns.reverse();
  return { path, turns };
}

/** Casillas alcanzables este turno (para pintarlas). */
function occupancy(G) {
  const occ = new Map();
  for (const o of G.units) { const l = occ.get(o.cell); if (l) l.push(o.owner); else occ.set(o.cell, [o.owner]); }
  return occ;
}
export function reachable(G, M, u) {
  const out = new Map();
  if (u.mp <= 0) return out;
  const occ = occupancy(G);
  const q = [[u.cell, u.mp]];
  const bestMp = new Map([[u.cell, u.mp]]);
  while (q.length) {
    const [c, mp] = q.shift();
    for (const j of neighbours(M, c)) {
      const cost = enterCost(G, M, u, c, j, { occ });
      if (cost < 0) continue;
      const left = cost <= mp ? mp - cost : 0;
      if ((bestMp.get(j) ?? -1) >= left) continue;
      bestMp.set(j, left);
      if (canStop(G, u, j)) out.set(j, left);
      if (left > 0) q.push([j, left]);
    }
  }
  out.delete(u.cell);
  return out;
}

/** Mueve la unidad por el camino tanto como le dé el turno. Devuelve las celdas recorridas. */
export function moveAlong(G, M, u, path) {
  const steps = [];
  let i = 0;
  while (i < path.length && u.mp > 0) {
    const to = path[i];
    const cost = enterCost(G, M, u, u.cell, to);
    if (cost < 0) break;
    // no acabar el movimiento encima de otra unidad propia del mismo tipo
    const last = i === path.length - 1 || u.mp - cost <= 0;
    if (last && !canStop(G, u, to)) break;
    u.cell = to;
    u.mp = cost <= u.mp ? u.mp - cost : 0;
    u.fortified = false;
    u.task = null;
    u.acted = true;
    steps.push(to);
    i++;
    captureCivilians(G, M, u);
  }
  u.goto = i < path.length ? path.slice(i) : null;
  return steps;
}
function captureCivilians(G, M, u) {
  if (!isMilitary(u)) return;
  for (const o of [...G.units]) {
    if (o.cell === u.cell && o.owner !== u.owner && !isMilitary(o) && atWar(G, u.owner, o.owner)) {
      o.owner = u.owner; o.mp = 0; o.goto = null;
      logEvent(G, `${G.players[u.owner].name} capturan unos ${UNITS[o.type].name.toLowerCase()}.`, { player: u.owner, cell: u.cell, kind: "war" });
    }
  }
}

// --- combate ----------------------------------------------------------------------------------------------------
export function unitStr(G, u, { ranged = false } = {}) {
  const U = UNITS[u.type];
  let s = ranged ? U.rstr || 0 : U.str;
  s -= Math.round(10 * (1 - u.hp / 100));
  return Math.max(1, s);
}
function defMods(G, M, u, vs) {
  const P = G.players[u.owner];
  let m = 0;
  if (M.kind[u.cell] !== K.LAND) return isNaval(u) ? 0 : -Math.max(0, unitStr(G, u) - 8); // embarcada: muy vulnerable
  m += defenseBonus(M, u.cell);
  if (u.fortified) m += 4;
  if (P.people === "vascones" && M.relief[u.cell] >= 1) m += 5;
  if (P.people === "celtiberos" && UNITS[u.type].cls === "melee") m += 4;
  if (vs && UNITS[u.type].vsMounted && UNITS[vs.type].cls === "montada") m += UNITS[u.type].vsMounted;
  return m;
}
function attMods(G, M, u, target) {
  const P = G.players[u.owner];
  let m = 0;
  if (P.people === "celtiberos" && UNITS[u.type].cls === "melee") m += 4;
  m += pmods(G, P).att;
  if (target.unit && UNITS[u.type].vsMounted && UNITS[target.unit.type].cls === "montada") m += UNITS[u.type].vsMounted;
  if (target.city && UNITS[u.type].vsCity) m += UNITS[u.type].vsCity;
  return m;
}
/** Qué hay que atacar en `cell` para el jugador p: {city?, unit?} (la ciudad manda sobre su guarnición). */
export function targetAt(G, p, cell) {
  const city = cityAt(G, cell);
  if (city && city.owner !== p) return { city, owner: city.owner };
  const us = G.units.filter((u) => u.cell === cell && u.owner !== p);
  if (!us.length) return null;
  const mil = us.find(isMilitary);
  return { unit: mil || us[0], owner: (mil || us[0]).owner, civilianOnly: !mil };
}
export function canAttack(G, M, u, cell) {
  const U = UNITS[u.type];
  if (U.cls === "civil" || u.mp <= 0) return false;
  const t = targetAt(G, u.owner, cell);
  if (!t) return false;
  const d = dist(M, u.cell, cell);
  if (U.rstr) return d <= U.range && d >= 1;
  if (U.cls === "naval") return d === 1 && M.kind[cell] !== K.LAND; // espolonazo: solo a otros barcos
  if (M.kind[u.cell] !== K.LAND) return false; // no se ataca desde el agua
  if (d !== 1) return false;
  if (t.city && U.cls === "explorador") return false;
  return M.kind[cell] === K.LAND;
}
const dmg = (diff, r) => Math.max(1, Math.round(30 * Math.exp(diff / 25) * r));

export function preview(G, M, u, cell) {
  const t = targetAt(G, u.owner, cell);
  if (!t) return null;
  const U = UNITS[u.type];
  const ranged = !!U.rstr;
  const A = unitStr(G, u, { ranged }) + attMods(G, M, u, t);
  if (t.city) {
    const D = cityStrength(G, M, t.city);
    return { ...t, ranged, A, D, toDef: dmg(A - D, 1), toAtt: ranged ? 0 : dmg(D - A, 1), defHp: t.city.hp, attHp: u.hp };
  }
  if (t.civilianOnly) return { ...t, ranged, A, D: 0, toDef: 100, toAtt: 0, defHp: t.unit.hp, attHp: u.hp, capture: !ranged };
  const D = unitStr(G, t.unit) + defMods(G, M, t.unit, u);
  return { ...t, ranged, A, D, toDef: dmg(A - D, 1), toAtt: ranged ? 0 : dmg(D - A, 1), defHp: t.unit.hp, attHp: u.hp };
}

/** Resuelve un ataque. Devuelve {ok, toDef, toAtt, killed, died, captured, cityTaken}. */
export function attack(G, M, u, cell) {
  if (!canAttack(G, M, u, cell)) return { ok: false };
  const t = targetAt(G, u.owner, cell);
  if (!atWar(G, u.owner, t.owner)) return { ok: false, needWar: t.owner };
  const pv = preview(G, M, u, cell);
  const r1 = 0.8 + rng(G) * 0.4, r2 = 0.8 + rng(G) * 0.4;
  const out = { ok: true, ranged: pv.ranged, cell };
  u.mp = 0; u.acted = true; u.fortified = false; u.goto = null;
  const A = G.players[u.owner], D = G.players[t.owner];
  if (t.civilianOnly && !pv.ranged) {
    // se captura/expulsa al civil y se entra en la casilla
    u.cell = cell;
    captureCivilians(G, M, u);
    out.captured = true;
    return out;
  }
  if (t.civilianOnly && pv.ranged) {
    G.units = G.units.filter((x) => x !== t.unit);
    out.killed = true;
    logEvent(G, `${A.name} acaban con unos ${UNITS[t.unit.type].name.toLowerCase()} de los ${D.name}.`, { player: u.owner, cell, kind: "war" });
    return out;
  }
  if (t.city) {
    const city = t.city;
    let toDef = dmg(pv.A - pv.D, r1);
    if (pv.ranged) toDef = Math.min(toDef, city.hp - 1);
    city.hp = Math.max(0, city.hp - toDef);
    city.hitTurn = G.turn;
    out.toDef = toDef;
    if (!pv.ranged) {
      const toAtt = dmg(pv.D - pv.A, r2);
      u.hp -= toAtt;
      out.toAtt = toAtt;
      if (u.hp <= 0) { G.units = G.units.filter((x) => x !== u); out.died = true; }
      else if (city.hp <= 0 && UNITS[u.type].cls !== "explorador" && !isNaval(u)) {
        captureCity(G, M, city, u.owner);
        u.cell = city.cell;
        out.cityTaken = city;
      }
    }
    return out;
  }
  const def = t.unit;
  const toDef = dmg(pv.A - pv.D, r1);
  def.hp -= toDef;
  out.toDef = toDef;
  if (!pv.ranged) {
    const toAtt = dmg(pv.D - pv.A, r2);
    u.hp -= toAtt;
    out.toAtt = toAtt;
  }
  def.fortified = false;
  if (def.hp <= 0) {
    G.units = G.units.filter((x) => x !== def);
    out.killed = true;
    if (!pv.ranged && u.hp > 0) {
      const left = G.units.filter((x) => x.cell === cell && x.owner !== u.owner);
      if (!left.some(isMilitary) && enterCost(G, M, u, u.cell, cell, { ignoreUnits: true }) >= 0) {
        u.cell = cell;
        captureCivilians(G, M, u);
      }
    }
  }
  if (u.hp <= 0) { G.units = G.units.filter((x) => x !== u); out.died = true; }
  return out;
}

function captureCity(G, M, city, p) {
  const old = city.owner;
  const A = G.players[p], D = G.players[old];
  // la guarnición y los civiles de la casilla caen con la ciudad
  G.units = G.units.filter((x) => !(x.cell === city.cell && x.owner === old));
  city.owner = p;
  city.pop = Math.max(1, city.pop - 1);
  city.hp = Math.round(cityMaxHp(city) * 0.25);
  city.build = null;
  city.prod = 0;
  if (city.capital) city.capital = false;
  city.buildings = city.buildings.filter((b) => b !== "castillo");
  logEvent(G, `⚔️ ${A.name} conquistan ${city.name}, ciudad de los ${D.name}.`, { player: p, cell: city.cell, kind: "war", all: true });
  if (A.human) chron(G, p, `Conquistáis ${city.name} a los ${D.name}.`, "guerra");
  if (D.human) chron(G, old, `Los ${A.name} os arrebatan ${city.name}.`, "guerra");
  if (A.invader) {
    // los invasores que toman una ciudad se quedan: nace un pueblo nuevo
    A.invader = false;
    A.settled = true;
    A.name = A.settleName || A.name;
    A.capital = city.id;
    city.capital = true;
    A.expires = null;
    logEvent(G, `🏴 Nace ${A.name}: los invasores se asientan en ${city.name}.`, { player: p, cell: city.cell, kind: "war", all: true });
    for (const H of G.players) if (H.human && H.alive) chron(G, H.idx, `Nace ${A.name}, con capital en ${city.name}.`, "invasion");
  }
  if (!playerCities(G, old).length) {
    // capital perdida y sin ciudades: si no le quedan colonos, el pueblo desaparece
    if (!G.units.some((u) => u.owner === old && u.type === "colono")) eliminate(G, old);
  } else if (D.capital === city.id) {
    const nc = playerCities(G, old).sort((a, b) => b.pop - a.pop)[0];
    nc.capital = true;
    D.capital = nc.id;
  }
}
function eliminate(G, p) {
  const P = G.players[p];
  if (!P.alive) return;
  P.alive = false;
  G.units = G.units.filter((u) => u.owner !== p);
  for (const q of G.players) { delete q.war[p]; }
  P.war = {};
  logEvent(G, `☠️ Los ${P.name} han desaparecido de la historia.`, { player: p, kind: "war", all: true });
}

// --- diplomacia -------------------------------------------------------------------------------------------------
export function declareWar(G, a, b) {
  if (a === b || atWar(G, a, b)) return;
  G.players[a].war[b] = true;
  G.players[b].war[a] = true;
  meet(G, a, b);
  G.players[a].warSince = G.players[a].warSince || {};
  G.players[a].warSince[b] = G.turn;
  G.players[b].warSince = G.players[b].warSince || {};
  G.players[b].warSince[a] = G.turn;
  logEvent(G, `⚔️ Los ${G.players[a].name} declaran la guerra a los ${G.players[b].name}.`, { player: a, kind: "war", all: true });
  if (G.players[a].human) chron(G, a, `Declaráis la guerra a los ${G.players[b].name}.`, "guerra");
  if (G.players[b].human) chron(G, b, `Los ${G.players[a].name} os declaran la guerra.`, "guerra");
}
export function makePeace(G, M, a, b) {
  if (!atWar(G, a, b)) return;
  delete G.players[a].war[b];
  delete G.players[b].war[a];
  G.players[a].peaceUntil[b] = G.turn + 15;
  G.players[b].peaceUntil[a] = G.turn + 15;
  // las unidades que quedan dentro de fronteras ajenas vuelven a su ciudad más cercana
  for (const u of [...G.units]) {
    const own = tileOwnerPlayer(G, u.cell);
    if (!((u.owner === a && own === b) || (u.owner === b && own === a))) continue;
    const homes = playerCities(G, u.owner).sort((x, y) => dist(M, x.cell, u.cell) - dist(M, y.cell, u.cell));
    const spot = homes.map((h) => freeSpawn(G, M, h, u.type)).find((c) => c >= 0);
    if (spot != null) { u.cell = spot; u.goto = null; } else G.units = G.units.filter((x) => x !== u);
  }
  logEvent(G, `🕊️ Paz entre los ${G.players[a].name} y los ${G.players[b].name}.`, { player: a, kind: "peace", all: true });
  for (const x of [a, b]) if (G.players[x].human) chron(G, x, `Paz con los ${G.players[x === a ? b : a].name}.`, "paz");
}
export function military(G, p) {
  let s = 0;
  for (const u of G.units) if (u.owner === p && isMilitary(u)) s += UNITS[u.type].str * (0.5 + u.hp / 200);
  return Math.round(s);
}
export function score(G, p) {
  const cs = playerCities(G, p);
  const P = G.players[p];
  return 5 * cs.length + cs.reduce((a, c) => a + c.pop, 0) * 2 + P.techs.length * 3 + playerWonders(G, p).length * 8 + Math.floor(P.culture / 40);
}

// --- turnos -----------------------------------------------------------------------------------------------------
/** Al empezar el turno de un jugador: curación, movimientos, fortificación y órdenes «ir a» pendientes. */
export function startTurn(G, M, p) {
  for (const u of G.units) {
    if (u.owner !== p) continue;
    if (!u.acted && u.hp < 100) {
      const own = tileOwnerPlayer(G, u.cell) === p;
      const inCity = !!cityAt(G, u.cell);
      u.hp = Math.min(100, u.hp + (inCity ? 25 : own ? 15 : 10));
    }
    u.acted = false;
    u.mp = u.task ? 0 : fullMp(G, M, u); // los obreros con tarea siguen trabajando
  }
  for (const c of G.cities) if (c.owner === p && c.hitTurn < G.turn - 1) c.hp = Math.min(cityMaxHp(c), c.hp + 20);
}
/** Al acabar el turno de un jugador: sus ciudades amuralladas disparan. */
export function cityStrikes(G, M, p) {
  const out = [];
  for (const city of playerCities(G, p)) {
    if (!canStrike(city)) continue;
    let best = null, bh = Infinity;
    for (const u of G.units) {
      if (!atWar(G, p, u.owner) || dist(M, u.cell, city.cell) > 2) continue;
      if (u.hp < bh) { bh = u.hp; best = u; }
    }
    if (!best) continue;
    const D = unitStr(G, best) + defMods(G, M, best, null);
    const d = dmg(cityStrength(G, M, city) - D, 0.8 + rng(G) * 0.4);
    best.hp -= d;
    out.push({ city, unit: best, dmg: d });
    if (best.hp <= 0) G.units = G.units.filter((x) => x !== best);
  }
  return out;
}
/** Final de ronda: ciudades, ciencia, oro y victoria. Devuelve los avisos de la ronda. */
export function endRound(G, M) {
  const events = [];
  for (const P of G.players) { P._sci = 0; P._gold = 0; }
  for (const city of [...G.cities]) processCity(G, M, city, events);
  for (const P of G.players) {
    if (!P.alive) continue;
    // oro y mantenimiento
    P.gold = Math.round((P.gold + P._gold - upkeep(G, P.idx)) * 10) / 10;
    if (P.gold < 0) {
      const us = G.units.filter((u) => u.owner === P.idx && isMilitary(u));
      if (us.length) {
        const u = us[Math.floor(rng(G) * us.length)];
        G.units = G.units.filter((x) => x !== u);
        if (P.human) events.push({ msg: `Sin oro para pagar soldadas: se disuelve una unidad de ${UNITS[u.type].name}.`, kind: "bad", player: P.idx });
      }
      P.gold = 0;
    }
    // ciencia
    P.science += P._sci;
    if (P.research) {
      const cost = techCost(P, P.research);
      if (P.science >= cost) {
        P.science -= cost;
        P.techs.push(P.research);
        if (P.human) events.push({ msg: `🔬 Descubierto: ${TECHS[P.research].name}.`, kind: "tech", player: P.idx });
        const era = TECHS[P.research].era;
        if (era > (P.era ?? 0)) {
          P.era = era;
          if (P.human) chron(G, P.idx, `Entráis en la ${ERAS[era]}.`, "era");
        }
        if (P.research === LAST_TECH) win(G, P.idx, "ciencia");
        P.research = null;
      }
    }
    // pueblos sin ciudades ni colonos (los invasores tienen sus propias reglas)
    if (!P.invader && !playerCities(G, P.idx).length && !G.units.some((u) => u.owner === P.idx && u.type === "colono") && G.turn > 1) eliminate(G, P.idx);
    P.lastScore = score(G, P.idx);
  }
  workStep(G, M, events);
  routeStep(G, M);
  for (const e of events) logEvent(G, e.msg, e);
  stabilityStep(G, M);
  invasionStep(G, M);
  checkVictory(G, M);
  G.turn++;
  return events;
}
function win(G, p, how) {
  if (G.over) return;
  G.over = { winner: p, how, turn: G.turn };
  const names = { ciencia: "victoria científica", dominio: "victoria por dominio", tiempo: "victoria por puntos", conquista: "victoria por conquista" };
  logEvent(G, `🏆 ${countryName(G.players[p])}: ${names[how] || how}.`, { player: p, kind: "win", all: true });
  chron(G, 0, p === 0 ? `¡Victoria! (${names[how] || how})` : `Los ${G.players[p].name} se imponen (${names[how] || how}).`, "fin");
}
export function checkVictory(G, M) {
  if (G.over) return;
  const alive = G.players.filter((P) => P.alive && !P.invader);
  if (!G.players[0].alive) { G.over = { winner: alive.sort((a, b) => b.lastScore - a.lastScore)[0]?.idx ?? -1, how: "derrota", turn: G.turn }; return; }
  if (alive.length === 1) return win(G, alive[0].idx, "conquista");
  // dominio: tener todas las capitales originales (las de los pueblos del principio)
  const capCells = G.players.filter((P) => P.original).map((P) => P.capitalCell).filter((c) => c != null);
  const caps = G.cities.filter((c) => capCells.includes(c.cell));
  for (const P of alive) {
    if (capCells.length >= 2 && capCells.every((cell) => caps.find((c) => c.cell === cell)?.owner === P.idx)) return win(G, P.idx, "dominio");
  }
  if (G.turn >= MAX_TURNS) {
    const best = alive.sort((a, b) => score(G, b.idx) - score(G, a.idx))[0];
    return win(G, best.idx, "tiempo");
  }
}

// --- guardar / cargar ---------------------------------------------------------------------------------------------
// --- obreros, caminos y rutas comerciales ----------------------------------------------------------------------
function impWhere(G, M, c, where) {
  if (M.kind[c] !== K.LAND || moveCostOf(M, c) === Infinity) return false;
  const cv = COVER[M.cover[c]] || {};
  const r = M.res[c];
  if (where === "llano") return M.relief[c] <= 1 && !cv.forest && !cv.marsh && !MINERALS.includes(r) && !PLANTS.includes(r) && M.cover[c] !== 10 && M.cover[c] !== 11;
  if (where === "mina") return M.relief[c] >= 1 || MINERALS.includes(r);
  if (where === "bosque") return !!cv.forest;
  if (where === "cultivo") return PLANTS.includes(r);
  if (where === "pasto") return M.cover[c] === 5 || ["ovejas", "ganado", "caballos"].includes(r);
  return false;
}
/** Qué puede construir un obrero en su casilla: [{id, name, emoji, turns, ok, why, road?}] */
export function workOptions(G, M, u) {
  const P = G.players[u.owner];
  const c = u.cell;
  const out = [];
  const own = tileOwnerPlayer(G, c) === u.owner;
  const isCity = isCityCell(G, c);
  for (const [id, I] of Object.entries(IMPROVEMENTS)) {
    if (!impWhere(G, M, c, I.where)) continue;
    const o = { id, name: I.name, emoji: I.emoji, turns: I.turns, ok: true };
    if (I.tech && !has(P, I.tech)) { o.ok = false; o.why = `Requiere ${TECHS[I.tech].name}`; }
    else if (!own) { o.ok = false; o.why = "Solo en tu territorio"; }
    else if (isCity) { o.ok = false; o.why = "No en el centro de una ciudad"; }
    else if (G.improv[c] === id) { o.ok = false; o.why = "Ya está construida"; }
    out.push(o);
  }
  if (M.kind[c] === K.LAND && !isCity) {
    const o = { id: "camino", name: ROAD.name, emoji: ROAD.emoji, turns: ROAD.turns, ok: true, road: true };
    if (!has(P, ROAD.tech)) { o.ok = false; o.why = `Requiere ${TECHS[ROAD.tech].name}`; }
    else if (G.road[c]) { o.ok = false; o.why = "Ya hay camino"; }
    out.push(o);
  }
  return out;
}
export function startWork(G, M, u, id) {
  const o = workOptions(G, M, u).find((x) => x.id === id && x.ok);
  if (!o) return false;
  u.task = { id, left: o.turns };
  u.mp = 0;
  u.acted = true;
  u.goto = null;
  return true;
}
function workStep(G, M, events) {
  for (const u of G.units) {
    if (!u.task) continue;
    u.task.left -= 1;
    if (u.task.left > 0) continue;
    const id = u.task.id;
    u.task = null;
    if (id === "camino") G.road[u.cell] = 1;
    else {
      G.improv[u.cell] = id;
      if (G.players[u.owner]?.human) events.push({ msg: `Obreros: ${IMPROVEMENTS[id].name.toLowerCase()} terminados.`, cell: u.cell, kind: "build", player: u.owner });
    }
  }
}
/** Construye caminos entre la capital y las ciudades de p (efecto de algunos eventos). */
export function buildRoads(G, M, p) {
  const P = G.players[p];
  const cap = cityById(G, P.capital);
  if (!cap) return 0;
  let n = 0;
  const walker = { owner: p, type: "obreros", cell: cap.cell, mp: 99, hp: 100 };
  for (const c of playerCities(G, p)) {
    if (c === cap) continue;
    walker.cell = cap.cell;
    const path = findPath(G, M, walker, c.cell, { maxTurns: 60 });
    if (!path) continue;
    for (const cell of path.path) if (M.kind[cell] === K.LAND && !G.road[cell]) { G.road[cell] = 1; n++; }
  }
  return n;
}

export function maxRoutes(G, P) {
  return 1 + Math.floor(playerCities(G, P.idx).length / 3) + ["banca", "economia", "ferrocarril"].filter((t) => has(P, t)).length + (P.mods?.routes || 0);
}
export const routesOf = (G, p) => (G.routes || []).filter((r) => r.owner === p);
export function routeYield(G, M, r) {
  const a = cityById(G, r.from), b = cityById(G, r.to);
  if (!a || !b) return { g: 0, s: 0 };
  const foreign = a.owner !== b.owner;
  let g = 2 + Math.floor(dist(M, a.cell, b.cell) / 6) + Math.floor(b.pop / 3);
  if (foreign) g *= 1.5;
  return { g: Math.round(g), s: foreign ? 1 + Math.floor(eraOf(G.players[a.owner]) / 2) : 0 };
}
/** Ciudades con las que estos mercaderes pueden abrir ruta ahora mismo (junto a ellos). */
export function tradeTargets(G, M, u) {
  if (!UNITS[u.type].trade) return [];
  const P = G.players[u.owner];
  const home = cityById(G, u.home) || playerCities(G, u.owner)[0];
  if (!home) return [];
  const mine = routesOf(G, u.owner);
  const out = [];
  for (const c of G.cities) {
    if (c === home || dist(M, c.cell, u.cell) > 1) continue;
    const Q = G.players[c.owner];
    if (c.owner !== u.owner && (atWar(G, u.owner, c.owner) || Q.invader)) continue;
    if (mine.some((r) => r.from === home.id && r.to === c.id)) continue;
    out.push({ city: c, from: home, yield: routeYield(G, M, { from: home.id, to: c.id }), full: mine.length >= maxRoutes(G, P) });
  }
  return out;
}
export function openRoute(G, M, u, cityId) {
  const t = tradeTargets(G, M, u).find((x) => x.city.id === cityId);
  if (!t || t.full) return false;
  G.routes.push({ owner: u.owner, from: t.from.id, to: cityId, since: G.turn });
  G.units = G.units.filter((x) => x !== u);
  const P = G.players[u.owner];
  logEvent(G, `🧳 Ruta comercial entre ${t.from.name} y ${t.city.name}.`, { player: u.owner, cell: t.city.cell, kind: "trade" });
  if (P.human) chron(G, u.owner, `Abrís una ruta comercial entre ${t.from.name} y ${t.city.name}${t.city.owner !== u.owner ? ` (${G.players[t.city.owner].name})` : ""}.`, "comercio");
  return true;
}
function routeStep(G, M) {
  G.routes = (G.routes || []).filter((r) => {
    const a = cityById(G, r.from), b = cityById(G, r.to);
    return a && b && a.owner === r.owner && !atWar(G, a.owner, b.owner) && !G.players[b.owner]?.invader;
  });
}

// --- historia: gobierno, estabilidad, invasiones, decisiones y crónica ----------------------------------------------
export function chron(G, p, text, kind = "info") {
  if (!G.players[p]?.human) return;
  G.chron.push({ turn: G.turn, year: yearLabel(G.turn), text, kind });
}
export function countryName(P) { return P.country || P.name; }

/** Modificadores de un pueblo: gobierno + decisiones permanentes + decisiones temporales en vigor. */
export function pmods(G, P) {
  const gov = GOVS[P.gov] || GOVS.jefatura;
  const m = { pPct: 0, gPct: 0, sPct: 0, cPct: 0, capP: 0, att: 0, def: 0, defPct: 0, stab: 0, cityF: 0, cityS: 0, cityC: 0, cityG: 0, coastG: 0, drought: 0 };
  const add = (o) => { if (o) for (const k in o) if (k in m && typeof o[k] === "number") m[k] += o[k]; };
  add(gov);
  add(P.mods);
  for (const t of P.temp || []) if (t.until >= G.turn) add(t.mods);
  m.sprawl = Math.max(0, (gov.sprawl ?? 1) + (P.mods?.sprawl || 0));
  m.weary = gov.weary ?? 1;
  return m;
}
export function stabMult(P) {
  const s = P.stability ?? 60;
  return s >= 70 ? 1.1 : s >= 40 ? 1 : s >= 20 ? 0.85 : 0.7;
}
export function stabilityTarget(G, M, P) {
  const m = pmods(G, P);
  const cs = playerCities(G, P.idx);
  let t = 55 + m.stab + (P.stabMod || 0) + (P.people === "vascones" ? 10 : 0);
  let b = 0;
  for (const c of cs) for (const k of c.buildings) b += BUILDINGS[k]?.stab || 0;
  t += Math.min(15, b);
  for (const w of playerWonders(G, P.idx)) t += WONDERS[w]?.stab || 0;
  t -= Math.max(0, cs.length - 6) * 2 * m.sprawl;
  t -= faithFriction(P, cs);
  let wars = 0;
  for (const Q of G.players) if (Q.alive && atWar(G, P.idx, Q.idx)) wars += Q.invader ? 0.5 : 1;
  t -= wars * 4 * m.weary;
  return Math.max(0, Math.min(100, Math.round(t)));
}
export function faithFriction(P, cs) {
  if (P.faith === "laica") return 0;
  const other = cs.filter((c) => c.faith && c.faith !== P.faith).length;
  const k = P.tags?.includes("tolerante") ? 0.5 : 1.5;
  return Math.min(15, other * k);
}
function faithStep(G, P) {
  if (P.faith === "laica") return;
  const tol = P.tags?.includes("tolerante");
  for (const c of playerCities(G, P.idx)) {
    if (!c.faith) c.faith = P.faith;
    if (c.faith === P.faith) continue;
    let pr = 0.03 + 0.03 * c.buildings.filter((b) => b === "templo" || b === "catedral").length;
    if (P.tags?.includes("confesional")) pr += 0.03;
    if (tol) pr *= 0.5;
    if (rng(G) < pr) c.faith = P.faith;
  }
}
function stabilityStep(G, M) {
  for (const P of G.players) {
    if (!P.alive) continue;
    faithStep(G, P);
    if (P.invader) continue;
    P.temp = (P.temp || []).filter((t) => t.until >= G.turn);
    const tgt = stabilityTarget(G, M, P);
    const d = Math.max(-3, Math.min(3, tgt - P.stability));
    P.stability = Math.max(0, Math.min(100, P.stability + d));
    if (P.stability < 20 && playerCities(G, P.idx).length >= 3 && rng(G) < 0.1) revolt(G, M, P);
  }
}
function bestUnitOf(techs, cls, min = null) {
  let best = min;
  for (const [id, U] of Object.entries(UNITS)) {
    if (U.cls !== cls || (U.tech && !techs.includes(U.tech))) continue;
    if (!best || (U.rstr || U.str) > (UNITS[best].rstr || UNITS[best].str)) best = id;
  }
  return best;
}
function withReqs(list) {
  const out = new Set();
  const walk = (t) => { if (!TECHS[t] || out.has(t)) return; out.add(t); TECHS[t].req.forEach(walk); };
  list.forEach(walk);
  return [...out];
}
function quietWar(G, A, B) {
  A.war[B.idx] = true; B.war[A.idx] = true;
  (A.warSince ??= {})[B.idx] = G.turn;
  (B.warSince ??= {})[A.idx] = G.turn;
}
function newInvader(G, o) {
  const P = {
    idx: G.players.length, people: o.id, name: o.name, color: o.color, ink: o.ink || "#fff", human: false, alive: true,
    invader: true, invasion: o.invasion || null, rebel: !!o.rebel, settleName: o.settle || null,
    gold: 50, science: 0, research: null, techs: o.techs, culture: 0, war: {}, met: {}, capital: null, settlers: 0, lastScore: 0,
    peaceUntil: {}, original: false, gov: "jefatura", stability: 60, stabMod: 0, mods: {}, temp: [], tags: [], evDone: [],
    country: null, techBoost: {}, expires: G.turn + (o.turns || 30),
    faith: o.faith || "antiguos", evChoice: {}, evLast: {}, lastEv: -99,
  };
  if (!o.rebel) P.mods.att = 4; // ejércitos veteranos
  G.players.push(P);
  return P;
}
function placeUnits(G, M, P, types, centers) {
  const used = new Set(G.units.map((u) => u.cell));
  for (const c of G.cities) used.add(c.cell);
  const spots = [];
  for (const c0 of centers) {
    const list = within(M, c0, 3).filter((c) => M.kind[c] === K.LAND && moveCostOf(M, c) < Infinity && !used.has(c));
    list.sort((a, b) => dist(M, a, c0) - dist(M, b, c0));
    spots.push(list);
  }
  let placed = 0;
  types.forEach((t, k) => {
    const list = spots[k % spots.length];
    const c = list?.find((x) => !used.has(x));
    if (c == null) return;
    used.add(c);
    const u = addUnit(G, P.idx, t, c);
    u.mp = 0;
    placed++;
  });
  return placed;
}
function spawnInvasion(G, M, inv) {
  const originals = G.players.filter((P) => P.alive && !P.invader);
  if (!originals.length) return;
  const lead = originals.reduce((a, b) => (b.techs.length > a.techs.length ? b : a));
  const techs = withReqs([...lead.techs, ...(inv.techs || [])]);
  const k = DIFFICULTY[G.difficulty]?.invasion ?? 1;
  const n = Math.max(3, Math.round(inv.n * k));
  const types = [];
  for (let i = 0; i < n; i++) {
    const t = inv.units[i % inv.units.length];
    types.push(bestUnitOf(techs, UNITS[t].cls, t));
  }
  const centers = inv.at.map((e) => M.entries[e]).filter((c) => c != null);
  if (!centers.length) return;
  const P = newInvader(G, { id: inv.id, name: inv.short, color: inv.color, ink: inv.ink, invasion: inv.id, settle: inv.settle, techs, faith: inv.faith });
  placeUnits(G, M, P, types, centers);
  for (const Q of originals) { quietWar(G, P, Q); }
  for (const Q of G.players) if (Q.alive && Q.settled && Q.idx !== P.idx) { quietWar(G, P, Q); }
  logEvent(G, `🚩 Invasión: ${inv.name} entra en la Península.`, { player: P.idx, cell: centers[0], kind: "war", all: true });
  if (G.players[0].alive) {
    G.alerts.push({ kind: "invasion", title: inv.name, text: inv.text, cell: centers[0], player: P.idx, n: types.length });
    chron(G, 0, `${inv.name} invade la Península por ${M.names[centers[0]] || "la frontera"}.`, "invasion");
  }
}
function revolt(G, M, P) {
  const cs = playerCities(G, P.idx).filter((c) => !c.capital);
  if (!cs.length) return;
  const city = cs[Math.floor(rng(G) * cs.length)];
  const R = newInvader(G, { id: `rebeldes-${city.id}`, name: `Rebeldes de ${city.name}`, color: "#3e2723", ink: "#fff", rebel: true, settle: `República de ${city.name}`, techs: [...P.techs], turns: 15, faith: city.faith || P.faith });
  const melee = bestUnitOf(P.techs, "melee", "guerreros");
  placeUnits(G, M, R, [melee, melee, melee], [city.cell]);
  quietWar(G, R, P);
  logEvent(G, `🔥 Revuelta en ${city.name}: la estabilidad de los ${P.name} se ha hundido.`, { player: P.idx, cell: city.cell, kind: "bad", all: true });
  if (P.human) {
    G.alerts.push({ kind: "revolt", title: `Revuelta en ${city.name}`, text: "Tu país está al borde del caos: los rebeldes se alzan en armas. Si toman la ciudad, se independizará.", cell: city.cell, player: R.idx });
    chron(G, P.idx, `Estalla una revuelta en ${city.name}.`, "crisis");
  }
}
function invasionStep(G, M) {
  const y = yearOf(G.turn);
  for (const inv of INVASIONS) {
    if (G.invDone[inv.id] != null || y < inv.year) continue;
    G.invDone[inv.id] = G.turn;
    spawnInvasion(G, M, inv);
  }
  for (const P of G.players) {
    if (!P.alive || !P.invader) continue;
    const units = G.units.filter((u) => u.owner === P.idx).length;
    if (units && G.turn < P.expires) continue;
    P.alive = false;
    G.units = G.units.filter((u) => u.owner !== P.idx);
    for (const Q of G.players) delete Q.war[P.idx];
    P.war = {};
    P.repelled = true;
    logEvent(G, units ? `Los ${P.name} se retiran de la Península.` : `La invasión de los ${P.name} ha sido rechazada.`, { player: P.idx, kind: "peace", all: true });
    if (G.players[0].alive && G.turn > 2) chron(G, 0, units ? `Los ${P.name} se retiran sin conquistar ninguna ciudad.` : `La invasión de los ${P.name} es rechazada.`, "invasion");
  }
}

// gobiernos
export function availableGovs(P) { return Object.keys(GOVS).filter((g) => !GOVS[g].tech || has(P, GOVS[g].tech)); }
export function setGov(G, P, id, { free = false } = {}) {
  if (!GOVS[id] || P.gov === id) return false;
  P.gov = id;
  P.govTurn = G.turn;
  if (!free) P.stability = Math.max(0, P.stability - 10);
  if (P.human) chron(G, P.idx, `Nuevo régimen: ${GOVS[id].name}.`, "gobierno");
  logEvent(G, `👑 Los ${P.name} adoptan la ${GOVS[id].name.toLowerCase()}.`, { player: P.idx, kind: "gov", all: P.human });
  return true;
}
export const GOV_COOLDOWN = 10;

// nombre del país
export function territoryShare(G, M, p) {
  const mine = new Set(playerCities(G, p).map((c) => c.id));
  let n = 0;
  for (let i = 0; i < M.n; i++) if (M.kind[i] === K.LAND && mine.has(G.tileOwner[i])) n++;
  return n / Math.max(1, M.landCells);
}
export function nameSuggestions(G, M, P) {
  const pp = PEOPLE_BY_ID.get(P.people);
  const cap = cityById(G, P.capital);
  const lands = pp ? [pp.land] : [];
  if (cap) lands.push(cap.name);
  if (!lands.length) lands.push(P.name);
  const share = territoryShare(G, M, P.idx);
  if (share > 0.25) lands.push("Iberia");
  if (share > 0.4) lands.push("Hispania", "España");
  const titles = [GOVS[P.gov]?.title || "Reino de", "Reino de", "República de", "Confederación de"];
  const out = [];
  for (const l of lands) for (const t of titles) {
    const n = `${t} ${l}`;
    if (!out.includes(n)) out.push(n);
  }
  return out.slice(0, 8);
}
export function setCountry(G, P, name) {
  const n = String(name || "").trim().slice(0, 48);
  if (!n) return;
  P.country = n;
  if (P.human) chron(G, P.idx, `Vuestro país pasa a llamarse ${n}.`, "nombre");
}

// decisiones -------------------------------------------------------------------------------------------------
function closeRivals(G, M, P) {
  // pueblos originales vivos, en orden de cercanía (para el jugador, solo los conocidos)
  const mine = playerCities(G, P.idx);
  const out = [];
  for (const Q of G.players) {
    if (!Q.alive || Q.idx === P.idx || Q.invader) continue;
    if (P.human && !P.met[Q.idx]) continue;
    let d = Infinity;
    for (const a of mine) for (const b of playerCities(G, Q.idx)) d = Math.min(d, dist(M, a.cell, b.cell));
    if (d === Infinity) continue;
    out.push({ Q, d });
  }
  return out.sort((x, y) => x.d - y.d);
}
function hasRes(G, M, P, type) {
  const ids = new Set(playerCities(G, P.idx).map((c) => c.id));
  for (let i = 0; i < M.n; i++) if (M.res[i] === type && ids.has(G.tileOwner[i])) return true;
  return false;
}
const any = (list, f) => [].concat(list).some(f);
function eventCtx(G, M, P, ev, y) {
  if (y < ev.from || y > ev.to) return null;
  if (ev.repeat) { if (G.turn - (P.evLast[ev.id] ?? -999) < ev.repeat) return null; }
  else if (P.evDone.includes(ev.id)) return null;
  if (ev.human && !P.human) return null;
  const cs = playerCities(G, P.idx);
  if (!cs.length) return null;
  if (ev.coastal && !cs.some((c) => M.coastal[c.cell])) return null;
  if (ev.river && !cs.some((c) => M.river[c.cell])) return null;
  if (ev.minCities && cs.length < ev.minCities) return null;
  if (ev.maxCities && cs.length > ev.maxCities) return null;
  if (ev.minPop && cs.reduce((x, c) => x + c.pop, 0) < ev.minPop) return null;
  if (ev.people && !any(ev.people, (x) => x === P.people)) return null;
  if (ev.notPeople && any(ev.notPeople, (x) => x === P.people)) return null;
  if (ev.tags && !any(ev.tags, (t) => P.tags.includes(t))) return null;
  if (ev.notTags && any(ev.notTags, (t) => P.tags.includes(t))) return null;
  if (ev.gov && !any(ev.gov, (g) => g === P.gov)) return null;
  if (ev.notGov && any(ev.notGov, (g) => g === P.gov)) return null;
  if (ev.faith && !any(ev.faith, (f) => f === P.faith)) return null;
  if (ev.notFaith && any(ev.notFaith, (f) => f === P.faith)) return null;
  if (ev.mixed && !cs.some((c) => c.faith && c.faith !== P.faith)) return null;
  if (ev.stabBelow != null && P.stability >= ev.stabBelow) return null;
  if (ev.stabAbove != null && P.stability <= ev.stabAbove) return null;
  if (ev.tech && !has(P, ev.tech)) return null;
  if (ev.noTech && has(P, ev.noTech)) return null;
  if (ev.wonder && !playerWonders(G, P.idx).includes(ev.wonder)) return null;
  if (ev.res && !hasRes(G, M, P, ev.res)) return null;
  if (ev.after) {
    const [id, ch] = [].concat(ev.after);
    if (P.evChoice[id] == null || (ch != null && P.evChoice[id] !== ch)) return null;
  }
  if (ev.notAfter && P.evChoice[ev.notAfter] != null) return null;
  if (ev.needInvader && !G.players.some((Q) => Q.alive && Q.invasion === ev.needInvader)) return null;
  if (ev.settled && !G.players.some((Q) => Q.alive && Q.settled && Q.invasion === ev.settled)) return null;
  const wars = G.players.filter((Q) => Q.alive && atWar(G, P.idx, Q.idx));
  if (ev.war && !wars.some((Q) => !Q.invader)) return null;
  if (ev.invasionWar && !wars.some((Q) => Q.invader || Q.settled)) return null;
  const ctx = {};
  if (ev.neighbor || ev.weaker) {
    const rivals = closeRivals(G, M, P).filter((r) => r.d <= 30);
    let pick = rivals[0];
    if (ev.weaker) {
      const me = score(G, P.idx);
      pick = rivals.find((r) => !atWar(G, P.idx, r.Q.idx) && r.d <= 20 && score(G, r.Q.idx) < me * ev.weaker && !r.Q.human);
    }
    if (!pick) return null;
    ctx.neighbor = pick.Q.idx;
  }
  return ctx;
}
/** Texto del evento con sus marcas ({vecino}, {capital}, {pais}) resueltas. */
export function eventText(G, P, ev, ctx = {}) {
  const cap = cityById(G, P.capital);
  return String(ev.text)
    .replace(/\{vecino\}/g, ctx.neighbor != null ? G.players[ctx.neighbor].name : "vecinos")
    .replace(/\{capital\}/g, cap?.name || "la capital")
    .replace(/\{pais\}/g, countryName(P));
}
/** El próximo evento que le toca vivir a p este turno: {ev, ctx, text} o null. */
export function nextEvent(G, M, p) {
  const P = G.players[p];
  if (!P?.alive || P.invader) return null;
  const y = yearOf(G.turn);
  const ok = [];
  for (const ev of EVENTS) {
    const ctx = eventCtx(G, M, P, ev, y);
    if (ctx) ok.push({ ev, ctx });
  }
  if (!ok.length) return null;
  // los que se acaban este turno van primero (los recurrentes nunca obligan)
  const forced = ok.find(({ ev }) => !ev.repeat && yearOf(G.turn + 1) > ev.to);
  let pick = forced;
  if (!pick) {
    if (G.turn - (P.lastEv ?? -99) < 2) return null;
    if (rng(G) > 0.45) return null;
    const total = ok.reduce((a, { ev }) => a + (ev.chance ?? 1), 0);
    let r = rng(G) * total;
    for (const o of ok) { r -= o.ev.chance ?? 1; if (r <= 0) { pick = o; break; } }
    pick ??= ok[0];
  }
  return { ev: pick.ev, ctx: pick.ctx, text: eventText(G, P, pick.ev, pick.ctx) };
}
/** Cuánto oro, ciencia o cultura valen n turnos de la economía de p (mínimo razonable al principio). */
export function turnsOf(G, M, p, key, n) {
  const t = playerTotals(G, M, p);
  const per = key === "g" ? Math.max(6, t.g) : key === "s" ? Math.max(4, t.s) : Math.max(3, t.c);
  return Math.round(per * n);
}
function bestOfClassFor(P, spec) {
  if (!spec.startsWith("best:")) return spec;
  return bestUnitOf(P.techs, spec.slice(5), spec === "best:montada" ? "jinetes" : spec === "best:ranged" ? "honderos" : spec === "best:asedio" ? "catapulta" : "guerreros");
}
export function canAfford(G, M, p, eff) {
  if (!eff?.goldT || eff.goldT > 0) return true;
  return G.players[p].gold >= turnsOf(G, M, p, "g", -eff.goldT);
}
export function applyEffects(G, M, P, eff, ctx = {}) {
  if (!eff) return;
  const p = P.idx;
  if (eff.goldT) P.gold = Math.max(0, P.gold + Math.sign(eff.goldT) * turnsOf(G, M, p, "g", Math.abs(eff.goldT)));
  if (eff.sciT) P.science += turnsOf(G, M, p, "s", eff.sciT);
  if (eff.cultT) {
    const c = turnsOf(G, M, p, "c", eff.cultT);
    P.culture += c;
    const cap = cityById(G, P.capital);
    if (cap) cap.culture += c; // la cultura extra ensancha las fronteras de la capital
  }
  if (eff.tech && !has(P, eff.tech)) P.techs.push(eff.tech);
  for (const t of [].concat(eff.techPart || [])) if (!has(P, t)) P.techBoost[t] = Math.max(P.techBoost[t] || 0, 0.5);
  if (eff.stab) { P.stability = Math.max(0, Math.min(100, P.stability + eff.stab)); P.stabMod = (P.stabMod || 0) + eff.stab * 0.5; }
  if (eff.mods) for (const [k, v] of Object.entries(eff.mods)) P.mods[k] = (P.mods[k] || 0) + v;
  if (eff.temp) P.temp.push({ until: G.turn + eff.temp.turns, mods: eff.temp.mods });
  if (eff.plague) for (const c of playerCities(G, p)) c.pop = Math.max(1, Math.round(c.pop * (1 - eff.plague)));
  if (eff.droughtHit) {
    const hit = 0.08 * eff.droughtHit * (1 + (pmods(G, P).drought || 0));
    for (const c of playerCities(G, p)) c.pop = Math.max(1, Math.round(c.pop * (1 - hit)));
  }
  if (eff.gov) {
    const g = [].concat(eff.gov).find((x) => availableGovs(P).includes(x));
    if (g) setGov(G, P, g, { free: true });
  }
  if (eff.faith && FAITHS[eff.faith]) {
    P.faith = eff.faith;
    if (P.human) chron(G, p, `Nueva fe oficial: ${FAITHS[eff.faith].name}.`, "fe");
  }
  if (eff.convert) for (const c of playerCities(G, p)) c.faith = P.faith;
  if (eff.peaceWith) {
    const Q = G.players.find((x) => x.alive && x.invasion === eff.peaceWith);
    if (Q && atWar(G, p, Q.idx)) {
      delete P.war[Q.idx]; delete Q.war[p];
      P.peaceUntil[Q.idx] = G.turn + 40; Q.peaceUntil[p] = G.turn + 40;
      for (const u of [...G.units]) if (u.owner === Q.idx && tileOwnerPlayer(G, u.cell) === p) G.units = G.units.filter((x) => x !== u);
    }
  }
  if (eff.peaceAll) for (const Q of G.players) if (Q.alive && !Q.invader && atWar(G, p, Q.idx) && !Q.human) makePeace(G, M, p, Q.idx);
  if (eff.warNeighbor && ctx.neighbor != null && !atWar(G, p, ctx.neighbor)) declareWar(G, p, ctx.neighbor);
  if (eff.union && ctx.neighbor != null) unite(G, M, P, G.players[ctx.neighbor]);
  if (eff.rebels) for (let k = 0; k < eff.rebels; k++) revolt(G, M, P);
  const cap = cityById(G, P.capital);
  if (eff.pop && cap) cap.pop += eff.pop;
  if (eff.building && cap && !cap.buildings.includes(eff.building) && BUILDINGS[eff.building]) {
    cap.buildings.push(eff.building);
    if (eff.building === "murallas") cap.hp = cityMaxHp(cap);
  }
  if (eff.units && cap) {
    const types = [];
    for (const [spec, n] of eff.units) for (let k = 0; k < n; k++) types.push(bestOfClassFor(P, spec));
    placeUnits(G, M, P, types, [cap.cell]);
  }
  if (eff.roads) buildRoads(G, M, p);
  if (eff.tag) P.tags.push(eff.tag);
}
/** Unión de dos coronas: el pueblo Q pasa a formar parte de P (ciudades, unidades y tierras). */
function unite(G, M, P, Q) {
  if (!Q || !Q.alive || Q.human) return;
  for (const c of G.cities) if (c.owner === Q.idx) { c.owner = P.idx; c.capital = false; }
  for (const u of G.units) if (u.owner === Q.idx) u.owner = P.idx;
  for (const R of G.players) { delete R.war[Q.idx]; }
  Q.war = {};
  Q.alive = false;
  Q.annexedBy = P.idx;
  logEvent(G, `👑 Los ${Q.name} se unen a ${countryName(P)} por un matrimonio real.`, { player: P.idx, kind: "gov", all: true });
  if (P.human) chron(G, P.idx, `Los ${Q.name} se unen a vuestro país.`, "union");
}
export function resolveEvent(G, M, p, evId, choice, { name, ctx = {}, keep = false } = {}) {
  const P = G.players[p];
  const ev = EVENTS.find((e) => e.id === evId);
  if (!ev) return;
  if (ev.repeat) P.evLast[evId] = G.turn;
  else if (P.evDone.includes(evId)) return;
  else P.evDone.push(evId);
  P.lastEv = G.turn;
  if (ev.name) {
    if (keep) return;
    if (!P.original && !name) return;
    const sug = nameSuggestions(G, M, P);
    setCountry(G, P, name || sug[Math.floor(rng(G) * Math.min(3, sug.length))]);
    return;
  }
  const ch = ev.choices[choice] || ev.choices[0];
  P.evChoice[evId] = choice;
  applyEffects(G, M, P, ch.eff, ctx);
  if (P.human) chron(G, p, `${ev.title}: ${ch.label.charAt(0).toLowerCase()}${ch.label.slice(1)}.`, ev.crisis ? "crisis" : "decision");
}
export function aiEvents(G, M, p) {
  const P = G.players[p];
  // la IA bautiza su país al llegar a la Edad Media y lo rebautiza en la Edad Moderna
  const y = yearOf(G.turn);
  if (P.original && ((!P.country && y >= 600) || (P.country && !P.renamed && y >= 1750))) {
    if (P.country) P.renamed = true;
    const sug = nameSuggestions(G, M, P);
    setCountry(G, P, sug[Math.floor(rng(G) * Math.min(3, sug.length))]);
  }
  for (let k = 0; k < 2; k++) {
    const o = nextEvent(G, M, p);
    if (!o) return;
    const choices = o.ev.choices.map((c, i) => i).filter((i) => canAfford(G, M, p, o.ev.choices[i].eff));
    const pick = choices.length ? choices[Math.floor(rng(G) * choices.length)] : 0;
    resolveEvent(G, M, p, o.ev.id, pick, { ctx: o.ctx });
  }
}

/** La crónica de tu España alternativa: datos y relato. */
export function altSpain(G, M, p = 0) {
  const P = G.players[p];
  const cs = playerCities(G, p);
  const cap = cityById(G, P.capital) || cs[0];
  const share = territoryShare(G, M, p);
  const pop = cs.reduce((a, c) => a + c.pop, 0);
  const tagCount = {};
  for (const t of P.tags) tagCount[t] = (tagCount[t] || 0) + 1;
  const tags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([t]) => TAGS[t] || t);
  const pp = PEOPLE_BY_ID.get(P.people);
  const out = [];
  out.push(`${countryName(P)} nació de los ${P.name} de ${pp?.region || "la Península"}, hacia el 2000 a. C.`);
  const inv = (id) => G.players.find((Q) => Q.invasion === id);
  const roma = inv("roma");
  if (roma) out.push(roma.settled ? (roma.alive ? `Roma echó raíces y ${roma.name} sigue en pie en ${yearLabel(Math.min(G.turn, MAX_TURNS))}.` : "Roma llegó a asentarse, pero acabó cayendo.") : "Hispania nunca fue romana: las legiones fueron rechazadas.");
  const om = inv("omeyas");
  if (om) out.push(om.settled ? (om.alive ? "Al-Ándalus nació en el sur y sigue siendo una potencia." : "Al-Ándalus existió un tiempo, pero no sobrevivió.") : "El ejército omeya no logró asentarse en la Península.");
  const fr = inv("francia");
  if (fr) out.push(fr.settled ? "Napoleón logró imponer un reino en parte de la Península." : "La Grande Armée fue derrotada.");
  if (tags.length) out.push(`Fue un país ${tags.slice(0, 3).map((t) => t.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " y $1")}.`);
  const now = yearLabel(Math.min(G.turn, MAX_TURNS));
  out.push(`Su fe oficial: ${FAITHS[P.faith]?.name.toLowerCase() || "los dioses antiguos"}.`);
  out.push(`En ${now} es una ${GOVS[P.gov]?.name.toLowerCase() || "jefatura"} con ${cs.length} ciudades${cap ? ` y capital en ${cap.name}` : ""}, que ocupa el ${Math.round(share * 100)} % de la Península.`);
  const wonders = playerWonders(G, p).map((w) => WONDERS[w].name);
  if (wonders.length) out.push(`Su patrimonio incluye ${wonders.slice(0, 5).join(", ")}${wonders.length > 5 ? " y más" : ""}.`);
  const rivals = G.players.filter((Q) => Q.alive && Q.idx !== p && !Q.invader).map((Q) => countryName(Q));
  if (rivals.length) out.push(`Comparte la Península con ${rivals.slice(0, 6).join(", ")}.`);
  else out.push("Es el único Estado de la Península.");
  return { name: countryName(P), gov: GOVS[P.gov]?.name, faith: FAITHS[P.faith]?.name, capital: cap?.name, cities: cs.length, pop, share, tags, wonders, story: out, chron: G.chron };
}

const STORE = "espanaciv.hispania.v1";
export function serialize(G) {
  return JSON.stringify({ ...G, tileOwner: Array.from(G.tileOwner), explored: btoa(String.fromCharCode(...packBits(G.explored))) });
}
export function deserialize(txt, M) {
  const o = JSON.parse(txt);
  if (!o || o.v !== 1) return null;
  o.tileOwner = Int32Array.from(o.tileOwner);
  const bits = Uint8Array.from(atob(o.explored), (ch) => ch.charCodeAt(0));
  o.explored = unpackBits(bits, M.n);
  o.improv ??= {}; o.road ??= {}; o.routes ??= [];
  return o;
}
function packBits(a) {
  const out = new Uint8Array(Math.ceil(a.length / 8));
  for (let i = 0; i < a.length; i++) if (a[i]) out[i >> 3] |= 1 << (i & 7);
  return out;
}
function unpackBits(b, n) {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = (b[i >> 3] >> (i & 7)) & 1;
  return out;
}
export function saveGame(G) { try { localStorage.setItem(STORE, serialize(G)); return true; } catch { return false; } }
export function loadGame(M) { try { const t = localStorage.getItem(STORE); return t ? deserialize(t, M) : null; } catch { return null; } }
export function hasSave() { try { return !!localStorage.getItem(STORE); } catch { return false; } }
export function clearSave() { try { localStorage.removeItem(STORE); } catch { /* nada */ } }
