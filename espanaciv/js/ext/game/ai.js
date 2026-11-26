// IA de los pueblos rivales de «Hispania»: sencilla pero completa. Investiga, elige qué construir, funda ciudades en
// los mejores sitios que encuentra, guarnece sus ciudades, declara guerras cuando se ve fuerte y ataca con cabeza
// (solo cuando el combate le sale a cuenta). Usa toda la información del mapa (no tiene niebla).
import { UNITS, BUILDINGS, TECHS, DIFFICULTY } from "./rules.js";
import {
  rng, K, dist, within, neighbours, has, atWar, cityAt, isMilitary, playerCities, playerUnits, tileOwnerPlayer,
  buildOptions, setBuild, canFound, foundCity, availableTechs, techCost, findPath, moveAlong, canAttack, preview, attack,
  declareWar, makePeace, military, cityYield, housing, fullMp, enterCost,
} from "./sim.js";

const FLAVOR = {
  celtiberos: { war: 1.4, tech: ["bronce", "hierro", "doma"] },
  vascones: { war: 1.1, tech: ["bronce", "albanileria"] },
  punicos: { war: 0.8, tech: ["moneda", "cartografia", "navegacion"] },
  iberos: { war: 1.0, tech: ["escritura", "misticismo", "drama"] },
  tartesios: { war: 0.8, tech: ["moneda", "mineria", "banca"] },
  galaicos: { war: 0.9, tech: ["navegacion", "albanileria"] },
  ilergetes: { war: 1.1, tech: ["bronce", "doma", "hierro"] },
  vettones: { war: 1.0, tech: ["doma", "ganaderia", "hierro"] },
  carpetanos: { war: 0.9, tech: ["escritura", "filosofia", "matematicas"] },
};
const BUILD_ORDER = ["dolmen", "granero", "murallas", "biblioteca", "templo", "mercado", "forja", "puerto", "acueducto", "termas", "teatro", "molino", "universidad", "catedral", "lonja", "castillo", "imprenta"];

export function runAI(G, M, p) {
  const P = G.players[p];
  if (!P.alive || G.over) return;
  P.aiTargetCities ??= 6 + Math.floor(rng(G) * 5);
  chooseResearch(G, P);
  diplomacy(G, M, p);
  for (const city of playerCities(G, p)) if (!city.build) chooseBuild(G, M, city);
  // primero los colonos (fundan donde estén si es buen sitio), luego los militares
  const us = playerUnits(G, p).sort((a, b) => (a.type === "colono" ? 0 : 1) - (b.type === "colono" ? 0 : 1));
  for (const u of us) {
    if (!G.units.includes(u) || G.over) continue;
    try { actUnit(G, M, u); } catch (err) { console.error("IA: unidad", u, err); }
  }
}

function chooseResearch(G, P) {
  if (P.research) return;
  const av = availableTechs(P);
  if (!av.length) return;
  const fl = FLAVOR[P.people]?.tech || [];
  let best = null, bs = -Infinity;
  for (const t of av) {
    const s = -techCost(P, t) / 40 + (fl.includes(t) ? 1.5 : 0) + rng(G) * 1.2 + (t === "alfareria" || t === "bronce" ? 0.5 : 0);
    if (s > bs) { bs = s; best = t; }
  }
  P.research = best;
}

function closeness(G, M, a, b) {
  let best = Infinity;
  const ca = playerCities(G, a), cb = playerCities(G, b);
  for (const x of ca) for (const y of cb) best = Math.min(best, dist(M, x.cell, y.cell));
  return best;
}

function diplomacy(G, M, p) {
  const P = G.players[p];
  const mine = military(G, p);
  const k = DIFFICULTY[G.difficulty]?.aiWar ?? 1;
  let wars = 0;
  for (const Q of G.players) if (Q.alive && atWar(G, p, Q.idx)) wars++;
  for (const Q of G.players) {
    if (!Q.alive || Q.idx === p) continue;
    const q = Q.idx;
    if (atWar(G, p, q)) {
      const since = P.warSince?.[q] ?? G.turn;
      const theirs = military(G, q);
      const losing = mine < theirs * 0.7 || playerCities(G, p).length < 2;
      if (G.turn - since >= 12 && (losing || rng(G) < 0.06)) {
        if (Q.human) { if (!G.peaceOffer && rng(G) < 0.5) G.peaceOffer = { from: p, turn: G.turn }; }
        else makePeace(G, M, p, q);
      }
      continue;
    }
    if (G.turn < 25 || wars >= 1) continue;
    if ((P.peaceUntil?.[q] ?? 0) > G.turn) continue;
    if (Q.human && !P.met[q]) continue;
    const near = closeness(G, M, p, q);
    if (near > 14) continue;
    const theirs = military(G, q);
    const fl = FLAVOR[P.people]?.war ?? 1;
    if (mine > theirs * 1.3 + 15 && rng(G) < 0.05 * fl * k) {
      declareWar(G, p, q);
      wars++;
    }
  }
}

function bestUnit(G, P, filter) {
  let best = null;
  for (const [id, U] of Object.entries(UNITS)) {
    if (U.tech && !has(P, U.tech)) continue;
    if (!filter(U, id)) continue;
    if (!best || (U.rstr || U.str) > (UNITS[best].rstr || UNITS[best].str)) best = id;
  }
  return best;
}

function chooseBuild(G, M, city) {
  const P = G.players[city.owner];
  const p = P.idx;
  const opts = buildOptions(G, M, city).filter((o) => o.ok);
  const can = (kind, id) => opts.find((o) => o.kind === kind && o.id === id);
  const set = (kind, id) => { setBuild(G, city, { kind, id }); return true; };
  const cities = playerCities(G, p);
  const mil = G.units.filter((u) => u.owner === p && isMilitary(u) && UNITS[u.type].cls !== "explorador").length;
  const atWarAny = G.players.some((Q) => Q.alive && atWar(G, p, Q.idx));
  const garrisoned = G.units.some((u) => u.owner === p && u.cell === city.cell && isMilitary(u) && UNITS[u.type].cls !== "explorador");
  const inProd = (id) => cities.filter((c) => c.build?.kind === "unit" && c.build.id === id).length;
  const defender = bestUnit(G, P, (U) => U.cls === "melee");
  if (!garrisoned && defender && cities.filter((c) => c.build?.kind === "unit" && isDefBuild(c.build.id)).length < cities.length) return set("unit", defender);
  if (atWarAny && mil < cities.length * 2 + 2) {
    const r = rng(G);
    const siege = bestUnit(G, P, (U) => U.cls === "asedio");
    const ranged = bestUnit(G, P, (U) => U.cls === "ranged");
    const mounted = bestUnit(G, P, (U) => U.cls === "montada");
    const pick = r < 0.15 && siege ? siege : r < 0.4 && ranged ? ranged : r < 0.6 && mounted ? mounted : defender;
    if (pick) return set("unit", pick);
  }
  const settlers = G.units.filter((u) => u.owner === p && u.type === "colono").length + inProd("colono");
  if (cities.length < P.aiTargetCities && can("unit", "colono") && settlers < 1 + Math.floor(cities.length / 4) && G.turn < 200) {
    if (cities.length <= 1 || rng(G) < 0.7) return set("unit", "colono");
  }
  const y = cityYield(G, M, city);
  const wonders = opts.filter((o) => o.kind === "wonder");
  if (wonders.length && y.p >= 4 && rng(G) < 0.45) return set("wonder", wonders[Math.floor(rng(G) * wonders.length)].id);
  if (mil < cities.length * 1.2 + 1 && defender) return set("unit", defender);
  for (const b of BUILD_ORDER) {
    if (!can("building", b)) continue;
    if (b === "acueducto" && city.pop < housing(G, M, city) - 1) continue;
    if (b === "murallas" && !atWarAny && G.turn < 40 && rng(G) < 0.5) continue;
    return set("building", b);
  }
  if (mil < cities.length * 2 && defender && rng(G) < 0.5) return set("unit", defender);
  return set("trade", "comercio");
}
const isDefBuild = (id) => UNITS[id]?.cls === "melee";

// --- unidades ---------------------------------------------------------------------------------------------------
function actUnit(G, M, u) {
  const U = UNITS[u.type];
  if (U.cls === "civil") return actSettler(G, M, u);
  if (U.cls === "explorador") return actExplorer(G, M, u);
  return actMilitary(G, M, u);
}

function siteScore(G, M, p, c, from) {
  if (M.siteBase[c] < 0) return -Infinity;
  for (const x of G.cities) if (dist(M, x.cell, c) < 4) return -Infinity;
  const own = tileOwnerPlayer(G, c);
  if (own >= 0 && own !== p) return -Infinity;
  for (const e of G.units) if (e.owner !== p && isMilitary(e) && atWar(G, p, e.owner) && dist(M, e.cell, c) <= 3) return -Infinity;
  let s = M.siteBase[c] - 1.3 * dist(M, from, c);
  // más cerca de las propias ciudades = imperio compacto
  const mine = playerCities(G, p);
  if (mine.length) {
    let d = Infinity;
    for (const x of mine) d = Math.min(d, dist(M, x.cell, c));
    s -= Math.max(0, d - 6) * 1.5;
  }
  return s;
}
function pickSite(G, M, u) {
  const taken = new Set(G.units.filter((x) => x !== u && x.type === "colono" && x.owner === u.owner && x.aiTarget != null).map((x) => x.aiTarget));
  M.siteOrder ??= Array.from(M.siteBase.keys()).filter((i) => M.siteBase[i] >= 0).sort((a, b) => M.siteBase[b] - M.siteBase[a]);
  const cands = [];
  for (const c of M.siteOrder) {
    if (dist(M, c, u.cell) > 20 || taken.has(c)) continue;
    let near = false;
    for (const t of taken) if (dist(M, t, c) < 4) { near = true; break; }
    if (near) continue;
    const s = siteScore(G, M, u.owner, c, u.cell);
    if (s > -Infinity) cands.push([s, c]);
  }
  cands.sort((a, b) => b[0] - a[0]);
  for (const [, c] of cands.slice(0, 6)) {
    const path = findPath(G, M, u, c, { maxTurns: 14 });
    if (path) return { cell: c, path: path.path };
  }
  return null;
}
function actSettler(G, M, u) {
  const p = u.owner;
  const first = playerCities(G, p).length === 0;
  if (first && canFound(G, M, u).ok) { foundCity(G, M, u); return; }
  if (u.aiTarget != null && siteScore(G, M, p, u.aiTarget, u.cell) === -Infinity) { u.aiTarget = null; u.goto = null; }
  if (u.aiTarget == null) {
    const s = pickSite(G, M, u);
    if (!s) {
      if (canFound(G, M, u).ok) foundCity(G, M, u);
      return;
    }
    u.aiTarget = s.cell;
    u.goto = s.path;
  }
  if (u.cell === u.aiTarget) {
    if (canFound(G, M, u).ok) foundCity(G, M, u);
    else u.aiTarget = null;
    return;
  }
  stepTowards(G, M, u, u.aiTarget);
  if (u.cell === u.aiTarget && u.mp >= 0 && canFound(G, M, u).ok) foundCity(G, M, u);
}
function stepTowards(G, M, u, target, { attack: atk = false } = {}) {
  if (!u.goto || !u.goto.length || u.goto[u.goto.length - 1] !== target) {
    const pth = findPath(G, M, u, target, { attack: atk, maxTurns: 25 });
    if (!pth) { u.goto = null; return false; }
    u.goto = pth.path;
  }
  let path = u.goto;
  if (atk && path.length && path[path.length - 1] === target) path = path.slice(0, -1);
  const before = u.cell;
  moveAlong(G, M, u, path);
  if (u.cell === before && path.length) {
    // bloqueado: recalcular la próxima vez
    u.goto = null;
    return false;
  }
  if (atk && u.goto == null) u.goto = [target];
  return true;
}

function actExplorer(G, M, u) {
  if (u.aiTarget == null || u.cell === u.aiTarget || rng(G) < 0.1) {
    for (let k = 0; k < 20; k++) {
      const c = Math.floor(rng(G) * M.n);
      if (M.kind[c] === K.LAND && dist(M, c, u.cell) < 25 && dist(M, c, u.cell) > 6) { u.aiTarget = c; u.goto = null; break; }
    }
  }
  if (u.aiTarget != null && !stepTowards(G, M, u, u.aiTarget)) u.aiTarget = null;
}

function enemiesNear(G, M, u, r) {
  const out = [];
  for (const e of G.units) if (e.owner !== u.owner && atWar(G, u.owner, e.owner) && dist(M, e.cell, u.cell) <= r) out.push(e.cell);
  for (const c of G.cities) if (c.owner !== u.owner && atWar(G, u.owner, c.owner) && dist(M, c.cell, u.cell) <= r) out.push(c.cell);
  return [...new Set(out)];
}
function tryAttack(G, M, u, { cityOnly = false } = {}) {
  const U = UNITS[u.type];
  let best = null, bs = -Infinity;
  for (const cell of enemiesNear(G, M, u, U.range || 1)) {
    if (!canAttack(G, M, u, cell)) continue;
    const pv = preview(G, M, u, cell);
    if (!pv || (cityOnly && !pv.city)) continue;
    const kill = pv.toDef >= pv.defHp;
    let s = pv.toDef - pv.toAtt * 1.1 + (kill ? 40 : 0) + (pv.city ? 10 : 0);
    if (!pv.ranged && pv.toAtt >= u.hp) s = -Infinity; // suicidio
    if (pv.capture) s = 50;
    if (s > bs) { bs = s; best = cell; }
  }
  if (best != null && bs > (UNITS[u.type].rstr ? -5 : 4)) {
    attack(G, M, u, best);
    return true;
  }
  return false;
}
function actMilitary(G, M, u) {
  const p = u.owner;
  const U = UNITS[u.type];
  const cities = playerCities(G, p);
  const here = cityAt(G, u.cell);
  const garrisonHere = here && here.owner === p && !G.units.some((o) => o !== u && o.owner === p && o.cell === u.cell && isMilitary(o) && UNITS[o.type].cls !== "explorador");
  // 1) aprovechar ataques buenos a mano
  if (u.mp > 0 && tryAttack(G, M, u)) return;
  // 2) guarnición: si es la única defensa de su ciudad, se queda
  if (garrisonHere) { u.fortified = true; return; }
  // 3) curarse
  if (u.hp < 40 && cities.length) {
    const home = cities.slice().sort((a, b) => dist(M, a.cell, u.cell) - dist(M, b.cell, u.cell))[0];
    if (home.cell !== u.cell) stepTowards(G, M, u, home.cell);
    else u.fortified = true;
    return;
  }
  // 4) ciudades propias sin defensa
  const empty = cities.filter((c) => !G.units.some((o) => o.owner === p && o.cell === c.cell && isMilitary(o) && UNITS[o.type].cls !== "explorador"));
  if (empty.length) {
    const tgt = empty.sort((a, b) => dist(M, a.cell, u.cell) - dist(M, b.cell, u.cell))[0];
    const claimed = G.units.some((o) => o !== u && o.owner === p && o.aiRole === `def:${tgt.id}`);
    if (!claimed && dist(M, tgt.cell, u.cell) <= 12) {
      u.aiRole = `def:${tgt.id}`;
      stepTowards(G, M, u, tgt.cell);
      return;
    }
  }
  // 5) en guerra: a por la ciudad enemiga más cercana
  const enemyCities = G.cities.filter((c) => atWar(G, p, c.owner));
  if (enemyCities.length) {
    const tgt = enemyCities.sort((a, b) => dist(M, a.cell, u.cell) - dist(M, b.cell, u.cell))[0];
    const d = dist(M, tgt.cell, u.cell);
    if (d <= 30) {
      const reach = U.rstr ? U.range : 1;
      if (d > reach) stepTowards(G, M, u, tgt.cell, { attack: true });
      if (u.mp > 0 && tryAttack(G, M, u)) return;
      if (u.mp > 0 && dist(M, tgt.cell, u.cell) <= reach && canAttack(G, M, u, tgt.cell)) {
        const pv = preview(G, M, u, tgt.cell);
        if (pv && (pv.ranged || pv.toAtt < u.hp - 15)) attack(G, M, u, tgt.cell);
      }
      return;
    }
  }
  // 6) en paz: reforzar la ciudad propia con menos defensa (hasta 2 por ciudad) y fortificarse
  if (cities.length) {
    const weak = cities
      .map((c) => ({ c, n: G.units.filter((o) => o.owner === p && o.cell === c.cell && isMilitary(o)).length }))
      .filter((x) => x.n < 1)
      .sort((a, b) => dist(M, a.c.cell, u.cell) - dist(M, b.c.cell, u.cell))[0];
    if (weak && weak.c.cell !== u.cell) { stepTowards(G, M, u, weak.c.cell); return; }
    // si no, quedarse cerca de una ciudad propia, en una casilla defensiva
    const home = cities.slice().sort((a, b) => dist(M, a.cell, u.cell) - dist(M, b.cell, u.cell))[0];
    if (dist(M, home.cell, u.cell) > 2) { stepTowards(G, M, u, home.cell); return; }
  }
  u.fortified = true;
}
