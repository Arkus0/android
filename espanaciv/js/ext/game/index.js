// «Hispania»: el modo de juego de España Civ. Un 4X por turnos original sobre el mapa real de la Península.
// Este módulo es el controlador: registra el modo "game", el botón «Jugar», los overlays de dibujo, el tooltip, los
// clics y las teclas, y lleva el ciclo de turnos (tú → los demás pueblos → final de ronda).
import { UNITS, TECHS, RESOURCES, GOVS } from "./rules.js";
import * as S from "./sim.js";
import { runAI, suggestBuild, suggestResearch } from "./ai.js";
import { createRenderer } from "./render.js";
import * as UI from "./ui.js";

const MODE = "game";

function injectCss() {
  if (document.getElementById("game-css")) return;
  const l = document.createElement("link");
  l.id = "game-css";
  l.rel = "stylesheet";
  l.href = new URL("../../../css/game.css", import.meta.url).href;
  document.head.appendChild(l);
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export function install(app) {
  injectCss();
  const game = {
    app, G: null, M: null, vis: null, rev: 0, dock: null, modal: null, busy: false, RES: RESOURCES,
    selUnit: null, selCity: null, reach: null, targets: [], pathPreview: null, hoverCell: -1,
  };
  let renderer = null;
  let offs = [];
  let saved = null;

  async function ensureMap() {
    if (game.M) return true;
    const gd = await app.loadData("game");
    if (!gd) { app.ui.toast?.("Falta data/game.json: no se puede jugar."); return false; }
    game.M = S.buildMap(app.w, gd);
    return true;
  }

  // --- estado y refresco ------------------------------------------------------------------------------------------
  game.changed = (full = true) => {
    const { G, M } = game;
    if (!G) return;
    game.vis = S.updateExplored(G, M);
    game.rev++;
    if (game.selUnit && !G.units.includes(game.selUnit)) game.selUnit = null;
    if (game.selCity && !G.cities.includes(game.selCity)) game.selCity = null;
    refreshSelection();
    if (full) { UI.renderHud(game); UI.renderPanel(game); UI.renderActionBar(game); }
    app.requestDraw();
    hints();
  };
  function refreshSelection() {
    const { G, M } = game;
    const u = game.selUnit;
    game.reach = null; game.targets = []; game.pathPreview = null;
    if (u && u.owner === 0 && u.mp > 0) {
      game.reach = S.reachable(G, M, u);
      const r = UNITS[u.type].range || 1;
      for (const c of S.within(M, u.cell, r)) if (c !== u.cell && S.canAttack(G, M, u, c)) game.targets.push(c);
    }
  }
  game.select = (thing) => {
    game.selUnit = thing && thing.type ? thing : null;
    game.selCity = thing && thing.pop != null ? thing : null;
    game.target = null;
    refreshSelection();
    setPeek(!!game.selUnit);
    UI.renderPanel(game);
    UI.renderActionBar(game);
    app.requestDraw();
    hints();
  };
  function setPeek(on) {
    game.peek = on;
    game.dock?.classList.toggle("peek", !!on && app.isMobile());
  }
  // sugerencias (lo que haría la IA), con caché por turno
  const sugCache = new Map();
  game.suggestBuild = (c) => {
    const k = `${game.G.turn}:${c.id}:${c.pop}:${c.buildings.length}:${game.G.players[0].techs.length}`;
    if (!sugCache.has(k)) { if (sugCache.size > 200) sugCache.clear(); sugCache.set(k, suggestBuild(game.G, game.M, c)); }
    return sugCache.get(k);
  };
  game.suggestResearch = () => {
    const P = game.G.players[0];
    const k = `r:${game.G.turn}:${P.techs.length}`;
    if (!sugCache.has(k)) sugCache.set(k, suggestResearch(game.G, P));
    return sugCache.get(k);
  };
  // consejos según lo que está pasando (cada uno sale una sola vez)
  function hints() {
    const { G } = game;
    if (!G || game.busy || game.modal || G.over) return;
    const u = game.selUnit;
    const P = G.players[0];
    if (u && u.owner === 0) {
      if (u.type === "colono") return UI.tip(game, "start");
      if (UNITS[u.type].worker) return UI.tip(game, "worker");
      if (UNITS[u.type].trade) return UI.tip(game, "trade");
      if (S.isMilitary(u)) { if (game.targets?.length) return UI.tip(game, "enemy"); return UI.tip(game, "move"); }
    }
    const pa = game.pendingAll();
    if (pa.cities.length) return UI.tip(game, "city");
    if (pa.research) return UI.tip(game, "research");
    if (G.units.some((x) => x.owner !== 0 && game.vis?.[x.cell] && S.atWar(G, 0, x.owner))) return UI.tip(game, "enemy");
    if (!pa.units.length && G.turn >= 2) return UI.tip(game, "endturn");
  }
  game.focusCell = (cell, scale) => {
    const grid = app.w.grid;
    const s = Math.max(app.cam.scale, scale ?? 0.9);
    let y = grid.cy(cell);
    if (app.isMobile()) {
      // en el móvil, centrar en el hueco que dejan la barra de arriba y el panel de abajo
      const top = document.getElementById("game-act")?.getBoundingClientRect().bottom ?? 40;
      // (la altura final del panel, no la de su animación: 22 % plegado, 50 % desplegado)
      const bottom = game.dock && !game.dock.hidden ? innerHeight * (game.peek ? 0.78 : 0.5) : innerHeight;
      const want = (top + bottom) / 2;
      y += (innerHeight / 2 - want) / s;
      app.cam.flyTo ? app.cam.flyTo(grid.cx(cell), y, s, 450) : app.flyTo(grid.cx(cell), y, s, 450);
      app.requestDraw();
      return;
    }
    app.flyTo(grid.cx(cell), y, s, 450);
  };
  const needsOrders = (u) => u.owner === 0 && u.mp > 0 && !u.fortified && !u.sleep && !u.skip && !u.task && !(u.goto && u.goto.length);
  game.pending = () => {
    const { G } = game;
    if (!G || G.over) return null;
    const P = G.players[0];
    if (!P.research && S.availableTechs(P).length) return { kind: "tech", label: "Elegir investigación" };
    const c = S.playerCities(G, 0).find((x) => !x.build);
    if (c) return { kind: "city", city: c, label: `Producción en ${c.name}` };
    const u = G.units.find(needsOrders);
    if (u) return { kind: "unit", unit: u, label: "Hay unidades esperando órdenes" };
    return null;
  };
  game.pendingAll = () => {
    const { G } = game;
    const out = { research: false, cities: [], units: [] };
    if (!G || G.over) return out;
    const P = G.players[0];
    out.research = !P.research && S.availableTechs(P).length > 0 && S.playerCities(G, 0).length > 0;
    out.cities = S.playerCities(G, 0).filter((x) => !x.build);
    out.units = G.units.filter(needsOrders);
    return out;
  };
  game.nextUnit = () => {
    const { G } = game;
    const list = G.units.filter(needsOrders);
    if (!list.length) { game.select(null); return false; }
    const i = game.selUnit ? list.indexOf(game.selUnit) : -1;
    const u = list[(i + 1) % list.length];
    game.select(u);
    game.focusCell(u.cell);
    return true;
  };
  game.endTurnButton = (force) => {
    if (force) return game.endTurn();
    const p = game.pending();
    if (!p) return game.endTurn();
    if (p.kind === "tech") return UI.showTech(game);
    if (p.kind === "city") { game.select(p.city); game.focusCell(p.city.cell); return; }
    if (p.kind === "unit") { game.select(p.unit); game.focusCell(p.unit.cell); }
  };

  // --- acciones del jugador ---------------------------------------------------------------------------------------
  game.setResearch = (id) => {
    const P = game.G.players[0];
    if (P.techs.includes(id)) return;
    if (S.availableTechs(P).includes(id)) { P.research = id; P.researchGoal = null; }
    else { P.researchGoal = id; P.research = nextStep(P, id); }
    UI.renderHud(game); UI.renderPanel(game); UI.renderActionBar(game);
  };
  function nextStep(P, goal) {
    // la tecnología disponible más barata en el camino hacia el objetivo
    const need = new Set();
    const walk = (t) => { if (P.techs.includes(t) || need.has(t)) return; need.add(t); TECHS[t].req.forEach(walk); };
    walk(goal);
    const av = S.availableTechs(P).filter((t) => need.has(t)).sort((a, b) => TECHS[a].cost - TECHS[b].cost);
    return av[0] || null;
  }
  async function doAttack(u, cell) {
    const { G, M } = game;
    const t = S.targetAt(G, 0, cell);
    if (!t) return;
    if (!S.atWar(G, 0, t.owner)) {
      if ((G.players[0].peaceUntil?.[t.owner] ?? 0) > G.turn) { app.ui.toast?.(`Hay una tregua con los ${G.players[t.owner].name} hasta el turno ${G.players[0].peaceUntil[t.owner]}.`); return; }
      const ok = await UI.ask(game, { title: "¿Declarar la guerra?", text: `Atacar a los <b>${UI.esc(G.players[t.owner].name)}</b> es declararles la guerra.`, yes: "Declarar la guerra", no: "Mejor no", danger: true });
      if (!ok) return;
      S.declareWar(G, 0, t.owner);
    }
    const res = S.attack(G, M, u, cell);
    if (!res.ok) return;
    if (res.toDef) renderer.float(cell, `−${res.toDef}`, "#ff7a5c");
    if (res.toAtt) renderer.float(u.cell === cell ? cell : u.cell, `−${res.toAtt}`, "#ffd35c", 14);
    if (res.cityTaken) { app.ui.toast?.(`⚔️ ¡Habéis conquistado ${res.cityTaken.name}!`); }
    else if (res.killed) app.ui.toast?.("Unidad enemiga destruida.");
    if (res.died) app.ui.toast?.(`Tus ${UNITS[u.type].name} han caído.`);
    if (res.captured) app.ui.toast?.("Civiles capturados.");
    S.checkVictory(G, M);
    game.changed();
    if (G.over) UI.showGameOver(game);
    else autoAdvance(u);
  }
  function doMove(u, path) {
    const { G, M } = game;
    S.moveAlong(G, M, u, path);
    u.skip = false; u.sleep = false;
    game.changed();
    autoAdvance(u);
  }
  let advTimer = null;
  function autoAdvance(u) {
    clearTimeout(advTimer);
    if (G_alive(u) && u.mp > 0) return;
    advTimer = setTimeout(() => { if (game.G && !game.busy && !game.modal && (!game.selUnit || game.selUnit.mp <= 0 || !game.G.units.includes(game.selUnit))) game.nextUnit(); }, 350);
  }
  const G_alive = (u) => game.G.units.includes(u);

  game.declareWarOn = async (q) => {
    const { G } = game;
    UI.closeModal(game);
    const ok = await UI.ask(game, { title: "¿Declarar la guerra?", text: `Se acabará la paz con los <b>${UI.esc(G.players[q].name)}</b>.`, yes: "Declarar la guerra", no: "Cancelar", danger: true });
    if (!ok) return;
    S.declareWar(G, 0, q);
    game.changed();
  };
  game.changeGov = async (id) => {
    const { G } = game;
    const ok = await UI.ask(game, { title: "¿Cambiar de régimen?", text: `Pasaréis a una <b>${UI.esc(GOVS[id].name)}</b>. La transición cuesta 10 de estabilidad.`, yes: "Cambiar", no: "Cancelar" });
    if (!ok) return;
    S.setGov(G, G.players[0], id);
    game.changed();
  };
  game.proposePeace = (q) => {
    const { G, M } = game;
    if (G.players[q].invader) { app.ui.toast?.("Los invasores no negocian."); return; }
    const since = G.players[0].warSince?.[q] ?? 0;
    const theirs = S.military(G, q), mine = S.military(G, 0);
    UI.closeModal(game);
    if (G.turn - since < 8) { app.ui.toast?.(`Los ${G.players[q].name} no quieren hablar todavía (llevan ${G.turn - since} turnos de guerra).`); return; }
    const accept = theirs < mine * 1.1 || S.playerCities(G, q).length <= 2 || S.rng(G) < 0.3;
    if (accept) { S.makePeace(G, M, 0, q); app.ui.toast?.(`🕊️ Paz con los ${G.players[q].name}.`); }
    else app.ui.toast?.(`Los ${G.players[q].name} rechazan la paz: se creen más fuertes.`);
    game.changed();
  };

  game.action = (a, data = {}) => {
    const { G, M } = game;
    if (!G && !a.startsWith("menu")) return;
    const u = game.selUnit;
    switch (a) {
      case "tech": return UI.showTech(game);
      case "diplo": return UI.showDiplo(game);
      case "log": return UI.showLog(game);
      case "menu": return UI.showMenu(game);
      case "gov": return UI.showGov(game);
      case "history": case "menu-history": return UI.showHistory(game);
      case "economy": return game.select(null);
      case "pending": return game.endTurnButton(false);
      case "endturn": return game.endTurn();
      case "confirm": return game.confirmTarget();
      case "cancel": game.target = null; UI.renderActionBar(game); app.requestDraw(); return;
      case "summary": return game.select(null);
      case "peek": setPeek(!game.peek); return;
      case "next": return game.nextUnit();
      case "deselect": return game.select(null);
      case "goto": return game.focusCell(+data.cell);
      case "found":
        if (u && u.owner === 0 && S.canFound(G, M, u).ok && u.mp > 0) {
          const c = S.foundCity(G, M, u);
          game.changed();
          if (c) { game.select(c); renderer.ping(c.cell, "#ffd65a"); app.ui.toast?.(`🏛️ Fundada ${c.name}. Elige qué construir.`); }
        }
        return;
      case "fortify": if (u && u.owner === 0 && S.isMilitary(u)) { u.fortified = true; u.goto = null; game.changed(); autoAdvance({ mp: 0 }); } return;
      case "skip": if (u && u.owner === 0) { u.skip = true; game.changed(); game.nextUnit(); } return;
      case "sleep": if (u && u.owner === 0) { u.sleep = true; u.goto = null; game.changed(); game.nextUnit(); } return;
      case "cancelgo": if (u) { u.goto = null; game.changed(); } return;
      case "disband":
        if (u && u.owner === 0) {
          UI.ask(game, { title: "¿Disolver la unidad?", text: `Se perderán tus ${UI.esc(UNITS[u.type].name)}.`, yes: "Disolver", no: "Cancelar", danger: true }).then((ok) => {
            if (!ok) return;
            G.units = G.units.filter((x) => x !== u);
            game.changed();
            game.nextUnit();
          });
        }
        return;
      case "work":
        if (u && u.owner === 0 && S.startWork(G, M, u, data.id)) { game.changed(); autoAdvance(u); }
        return;
      case "trade":
        if (u && u.owner === 0 && S.openRoute(G, M, u, +data.city)) { app.ui.toast?.("🧳 Ruta comercial abierta."); game.changed(); game.nextUnit(); }
        return;
      case "build": {
        const c = game.selCity;
        if (!c || c.owner !== 0) return;
        const item = data.kind === "trade" ? { kind: "trade", id: "comercio" } : { kind: data.kind, id: data.id };
        if (!(c.build && c.build.kind === item.kind && c.build.id === item.id)) {
          if (c.build && c.build.kind !== item.kind) c.prod = Math.min(c.prod, 0.5 * c.prod + 10); // cambiar de tipo de obra cuesta
          S.setBuild(G, c, item);
        }
        game.changed();
        return;
      }
      case "buy": {
        const c = game.selCity;
        if (c && S.buy(G, M, c)) { app.ui.toast?.(`Comprado: se termina el próximo turno.`); game.changed(); }
        return;
      }
      case "menu-save": S.saveGame(G) ? app.ui.toast?.("Partida guardada.") : app.ui.toast?.("No se pudo guardar (almacenamiento lleno o bloqueado)."); return;
      case "menu-new":
        UI.ask(game, { title: "¿Nueva partida?", text: "Se perderá la partida actual.", yes: "Empezar otra", no: "Cancelar", danger: true }).then((ok) => { if (ok) { S.clearSave(); game.G = null; setup(); } });
        return;
      case "menu-help": return UI.showHelp(game);
      case "menu-tips": UI.resetTips(); app.ui.toast?.("Los consejos volverán a salir."); hints(); return;
      case "menu-exit": return app.setMode(null);
    }
  };

  // --- fin de turno ----------------------------------------------------------------------------------------------
  game.endTurn = async () => {
    const { G, M } = game;
    if (!G || game.busy || G.over) return;
    UI.closeModal(game);
    game.busy = true;
    game.select(null);
    UI.renderActionBar(game);
    await nextFrame();
    const myUnits = new Map(G.units.filter((u) => u.owner === 0).map((u) => [u, u.hp]));
    const myCities = new Set(S.playerCities(G, 0).map((c) => c.id));
    const pops = new Map(S.playerCities(G, 0).map((c) => [c.id, c.pop]));
    const myRoutes = S.routesOf(G, 0).length;
    const lastCell = new Map([...myUnits.keys()].map((u) => [u, u.cell]));
    const logFrom = G.log.length;
    try {
      for (const st of S.cityStrikes(G, M, 0)) renderer.float(st.unit.cell, `−${st.dmg}`, "#ff7a5c");
      for (const P of G.players) {
        if (P.human || !P.alive || G.over) continue;
        S.startTurn(G, M, P.idx);
        runAI(G, M, P.idx);
        for (const st of S.cityStrikes(G, M, P.idx)) if (st.unit.owner === 0) renderer.float(st.unit.cell, `−${st.dmg}`, "#ffd35c");
      }
      S.endRound(G, M);
      S.startTurn(G, M, 0);
      const P = G.players[0];
      if (!P.research && P.researchGoal && !P.techs.includes(P.researchGoal)) P.research = nextStep(P, P.researchGoal);
      if (P.researchGoal && P.techs.includes(P.researchGoal)) P.researchGoal = null;
      for (const u of G.units) if (u.owner === 0) { u.skip = false; if (u.goto && u.goto.length) S.moveAlong(G, M, u, u.goto); }
    } catch (err) {
      console.error("Hispania: error al pasar el turno", err);
    }
    // daños y pérdidas propias
    for (const [u, hp] of myUnits) {
      if (!G.units.includes(u)) continue;
      if (u.hp < hp) renderer.float(u.cell, `−${Math.round(hp - u.hp)}`, "#ffd35c");
    }
    const lostUnits = [...myUnits.keys()].filter((u) => !G.units.includes(u) || u.owner !== 0);
    const lostCities = [...myCities].filter((id) => S.cityById(G, id)?.owner !== 0);
    game.busy = false;
    game.changed();
    S.saveGame(G);
    // novedades de la ronda (en el panel, con «Ver»), y avisos en el mapa
    const ICON = { war: "⚔️", peace: "🕊️", tech: "🔬", city: "🏙️", unit: "🪖", build: "🏗️", wonder: "🏛️", meet: "🤝", gov: "👑", trade: "🧳", bad: "⚠️", grow: "🌾", win: "🏆" };
    const strip = (m) => String(m).replace(/^(\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+/u, "");
    const report = [];
    for (const id of lostCities) report.push({ icon: "🏚️", text: `Has perdido ${S.cityById(G, id)?.name || "una ciudad"}.`, tone: "bad", cell: S.cityById(G, id)?.cell });
    if (lostUnits.length) report.push({ icon: "💀", text: `Has perdido: ${lostUnits.map((u) => UNITS[u.type].name).join(", ")}.`, tone: "bad", cell: lastCell.get(lostUnits[0]) });
    for (const [u, hp] of myUnits) if (G.units.includes(u) && u.owner === 0 && u.hp < hp) report.push({ icon: "🩸", text: `Atacan a tus ${UNITS[u.type].name} (−${Math.round(hp - u.hp)} de vida).`, tone: "bad", cell: u.cell });
    for (const e of G.log.slice(logFrom)) {
      if (!(e.player === 0 || e.all || e.kind === "meet")) continue;
      const tone = e.kind === "war" || e.kind === "bad" ? "bad" : e.player === 0 && ["tech", "city", "unit", "build", "wonder", "trade", "gov"].includes(e.kind) ? "good" : "";
      report.push({ icon: ICON[e.kind] || "•", text: strip(e.msg), tone, cell: e.cell ?? undefined });
    }
    for (const c of S.playerCities(G, 0)) if (pops.has(c.id) && c.pop > pops.get(c.id)) report.push({ icon: "🌾", text: `${c.name} crece a ${c.pop}.`, tone: "good", cell: c.cell });
    if (S.routesOf(G, 0).length < myRoutes) report.push({ icon: "🧳", text: "Se ha cortado una ruta comercial (guerra o ciudad perdida).", tone: "bad" });
    game.rumorSeen ??= new Set();
    for (const r of S.rumors(G, M)) if (!game.rumorSeen.has(r.inv.id)) {
      game.rumorSeen.add(r.inv.id);
      report.push({ icon: "🚩", text: `Rumores: ${r.inv.name} prepara una invasión por ${r.places.join(" o ") || "la frontera"} (en ~${r.turns} turno${r.turns === 1 ? "" : "s"}).`, tone: "bad", cell: r.cell });
    }
    report.sort((a, b) => (b.tone === "bad") - (a.tone === "bad"));
    game.report = report.slice(0, 16);
    for (const x of game.report) if (x.cell != null) renderer.ping(x.cell, x.tone === "bad" ? "#ff5a45" : x.tone === "good" ? "#7fe07f" : "#ffd65a");
    game.select(null);
    setPeek(false);
    if (G.over) { UI.showGameOver(game); return; }
    // invasiones, revueltas y decisiones de la ronda
    const alerts = (G.alerts || []).splice(0);
    for (const a of alerts) { await UI.alertBox(game, a); game.changed(); }
    for (let k = 0; k < 2; k++) {
      const o = S.nextEvent(G, M, 0);
      if (!o) break;
      const r = await UI.decide(game, o);
      S.resolveEvent(G, M, 0, o.ev.id, r.choice, { name: r.name, ctx: o.ctx, keep: r.keep });
      if (!o.ev.name) game.report.unshift({ icon: o.ev.crisis ? "⚠️" : "📜", text: `${o.ev.title}: ${o.ev.choices[r.choice]?.label || ""}.`, tone: "" });
      game.changed();
      UI.tip(game, "event");
    }
    S.saveGame(G);
    if (G.peaceOffer) {
      const q = G.peaceOffer.from;
      G.peaceOffer = null;
      if (S.atWar(G, 0, q)) {
        const ok = await UI.ask(game, { title: "Oferta de paz", text: `Los <b>${UI.esc(G.players[q].name)}</b> proponen la paz.`, yes: "Aceptar la paz", no: "Seguir la guerra" });
        if (ok) { S.makePeace(G, M, 0, q); game.changed(); }
      }
    }
    game.changed();
    if (game.report.length) UI.tip(game, "report");
  };

  // --- entrada ---------------------------------------------------------------------------------------------------
  game.attackPreview = (cell) => {
    const { G, M } = game;
    const u = game.selUnit;
    if (!u || u.owner !== 0 || cell < 0 || !game.vis?.[cell]) return null;
    if (!S.canAttack(G, M, u, cell)) return null;
    const pv = S.preview(G, M, u, cell);
    return pv ? { ...pv, war: S.atWar(G, 0, pv.owner) } : null;
  };
  function hover(cell) {
    if (!game.G) return null;
    if (cell !== game.hoverCell) {
      game.hoverCell = cell;
      const u = game.selUnit;
      game.pathPreview = null;
      if (u && u.owner === 0 && cell >= 0 && cell !== u.cell && game.M.kind[cell] !== S.K.VOID && !game.attackPreview(cell)) {
        const enemy = S.targetAt(game.G, 0, cell);
        const p = S.findPath(game.G, game.M, u, cell, { attack: !!enemy && game.vis[cell], maxTurns: 25 });
        if (p && p.path.length) game.pathPreview = { ...p, target: cell, attack: !!enemy };
      }
      app.requestDraw();
    }
    return UI.tooltip(game, cell);
  }
  /** Qué pasaría si la unidad elegida va a `cell`: {cell, attack, path, turns, pv} o null. */
  function planFor(u, cell) {
    const { G, M } = game;
    if (S.canAttack(G, M, u, cell)) return { cell, attack: true, path: [], turns: [], pv: game.attackPreview(cell), now: true };
    if (M.kind[cell] === S.K.VOID) return null;
    const enemy = game.vis[cell] ? S.targetAt(G, 0, cell) : null;
    const p = S.findPath(G, M, u, cell, { attack: !!enemy, maxTurns: 25 });
    if (!p || !p.path.length) return null;
    return { cell, attack: !!enemy, path: p.path, turns: p.turns, pv: null };
  }
  async function execute(u, plan) {
    const { G, M } = game;
    game.target = null;
    if (plan.now) return doAttack(u, plan.cell);
    const path = plan.attack ? plan.path.slice(0, -1) : plan.path;
    if (path.length) doMove(u, path);
    if (plan.attack && G.units.includes(u) && u.mp > 0 && S.canAttack(G, M, u, plan.cell)) await doAttack(u, plan.cell);
  }
  game.confirmTarget = () => {
    const u = game.selUnit, t = game.target;
    if (!u || !t) return;
    execute(u, t);
  };
  function click(ev) {
    const { G, M } = game;
    if (!G || game.busy) return true;
    game.touch = !!ev.pointerType && ev.pointerType !== "mouse";
    const cell = ev.cell;
    const u = game.selUnit;
    // 1) segundo toque sobre el destino elegido: confirmar
    if (game.target && u && cell === game.target.cell) { game.confirmTarget(); return true; }
    // 2) fichas propias bajo el dedo (aunque el zoom sea pequeño)
    const tokens = renderer.unitsAt(ev.x, ev.y, game.touch ? 12 : 4).filter((x) => x.owner === 0);
    if (tokens.length && !(u && game.target)) {
      const i = tokens.indexOf(u);
      game.select(tokens[(i + 1) % tokens.length]);
      return true;
    }
    const b = renderer.bannerAt(ev.x, ev.y);
    if (b) { game.select(b); return true; }
    if (cell < 0) { game.select(null); return true; }
    // 3) con una unidad propia elegida: mover o atacar
    if (u && u.owner === 0 && cell !== u.cell && !G.over && u.mp > 0) {
      const plan = planFor(u, cell);
      if (plan) {
        if (plan.attack && !plan.pv) plan.pv = null;
        if (game.touch) {
          // primer toque: enseñar qué pasará (camino, turnos o resultado del combate)
          game.target = plan;
          game.pathPreview = null;
          setPeek(true);
          UI.renderActionBar(game);
          app.requestDraw();
          return true;
        }
        const od = plan.pv ? S.odds(plan.pv) : null;
        if (od && od.label === "Tu unidad morirá") {
          UI.ask(game, { title: "¿Atacar de todos modos?", text: `Lo más probable es que <b>tu unidad muera</b> (daño recibido ≈ ${plan.pv.toAtt}, le quedan ${Math.round(u.hp)} de vida).`, yes: "Atacar", no: "Mejor no", danger: true })
            .then((ok) => { if (ok) execute(u, plan); });
          return true;
        }
        execute(u, plan);
        return true;
      }
    }
    // 4) elegir lo que haya en la casilla
    const mine = G.units.filter((x) => x.cell === cell && x.owner === 0).sort((a, b2) => Number(S.isMilitary(b2)) - Number(S.isMilitary(a)));
    const city = S.cityAt(G, cell);
    if (mine.length) {
      const i = mine.indexOf(game.selUnit);
      if (i >= 0 && i === mine.length - 1 && city && G.explored[cell]) { game.select(city); return true; }
      game.select(mine[(i + 1) % mine.length]);
      return true;
    }
    if (city && G.explored[cell]) { game.select(city); return true; }
    if (game.vis[cell]) {
      const other = G.units.find((x) => x.cell === cell);
      if (other) { game.select(other); return true; }
    }
    game.select(null);
    return true;
  }
  function onKey(e) {
    if (app.mode !== MODE || !game.G) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (game.modal) {
      if (k === "Enter" && t?.tagName === "BUTTON") return;
      if (k !== "Escape" && !["l", "r"].includes(k)) return;
      if (k === "Escape") return; // lo gestiona onEscape del modo
    }
    const take = () => { e.preventDefault(); e.stopPropagation(); };
    switch (k) {
      case "Enter": take(); if (game.busy) break; if (game.target) game.confirmTarget(); else game.endTurnButton(e.shiftKey); break;
      case " ": take(); game.action("skip"); break;
      case "f": take(); game.action("fortify"); break;
      case "b": take(); game.action("found"); break;
      case "n": case "Tab": take(); game.nextUnit(); break;
      case "t": take(); UI.showTech(game); break;
      case "h": take(); if (game.selUnit) game.focusCell(game.selUnit.cell); else if (game.selCity) game.focusCell(game.selCity.cell); break;
      case "l": case "r": take(); break; // sin lentes ni recursos reales durante la partida
      case "d": if (e.shiftKey) { take(); UI.showDiplo(game); } break;
      case "g": take(); UI.showGov(game); break;
      default:
    }
  }

  // --- empezar / continuar --------------------------------------------------------------------------------------
  function startNew(opts) {
    game.G = S.createGame(game.M, opts);
    begin(true);
  }
  function begin(fresh) {
    const { G, M } = game;
    S.startTurn(G, M, 0);
    if (fresh) for (const P of G.players) if (!P.human) S.startTurn(G, M, P.idx);
    game.changed();
    const P = G.players[0];
    const c = S.playerCities(G, 0)[0];
    const at = c ? c.cell : G.units.find((u) => u.owner === 0)?.cell ?? P.start;
    game.focusCell(at, 1.05);
    setTimeout(() => {
      game.nextUnit();
      if (fresh) { game.report = [{ icon: "🛖", text: `Tus colonos esperan en ${M.names[at] || "su tierra"}: funda tu capital (B).`, tone: "good", cell: at }]; game.changed(); }
    }, 500);
  }
  function setup() {
    UI.renderHud(game); UI.renderActionBar(game); UI.renderPanel(game);
    UI.showSetup(game, {
      hasSave: S.hasSave(),
      onStart: (o) => startNew(o),
      onContinue: () => {
        const G = S.loadGame(game.M);
        if (!G) { app.ui.toast?.("No se pudo leer la partida guardada."); return setup(); }
        game.G = G;
        begin(false);
      },
      onExit: () => app.setMode(null),
    });
  }

  // --- el modo ---------------------------------------------------------------------------------------------------
  app.registerMode(MODE, {
    enter() {
      document.body.classList.add("game-on");
      saved = { showResources: app.state.showResources };
      app.clearSelection?.();
      app.setLens(null);
      app.setShowResources(false);
      app.state.plainMap = true;
      app.invalidate();
      game.dock = app.ui.dock("left", { width: 360, label: "Hispania" });
      game.dock.classList.add("game-dock");
      renderer = createRenderer(app, game);
      offs = renderer.overlays.map((o) => app.registerOverlay(o));
      app.hoverHook = (cell) => (app.mode === MODE ? hover(cell) : undefined);
      offs.push(app.on("mapclick", (ev) => (app.mode === MODE ? click(ev) : false)));
      window.addEventListener("keydown", onKey, true);
      offs.push(() => window.removeEventListener("keydown", onKey, true));
      ensureMap().then((ok) => {
        if (!ok || app.mode !== MODE) return;
        if (game.G) { game.changed(); game.focusCell(game.selUnit?.cell ?? S.playerCities(game.G, 0)[0]?.cell ?? game.G.players[0].start, 1.0); }
        else setup();
      });
    },
    exit() {
      if (game.G) S.saveGame(game.G);
      UI.closeModal(game);
      for (const off of offs) { try { off?.(); } catch { /* nada */ } }
      offs = [];
      app.hoverHook = null;
      app.state.plainMap = false;
      document.body.classList.remove("game-on");
      app.ui.undock("left");
      game.dock?.classList.remove("game-dock");
      game.dock = null;
      document.getElementById("game-bar")?.remove();
      document.getElementById("game-end")?.remove();
      document.getElementById("game-act")?.remove();
      document.getElementById("game-tip")?.remove();
      if (saved) app.setShowResources(saved.showResources);
      app.invalidate();
    },
    onEscape() {
      if (UI.closeModal(game)) return true;
      if (game.target) { game.target = null; UI.renderActionBar(game); app.requestDraw(); return true; }
      if (game.selUnit || game.selCity) { game.select(null); return true; }
      return true; // Esc no saca de la partida (para eso, el menú ☰ o el botón Jugar)
    },
  });

  const btn = app.ui.addTopButton({
    id: "btn-game", label: "Jugar", title: "Hispania: juega una partida de estrategia sobre el mapa real",
    onClick: () => (app.mode === MODE ? app.setMode(null) : app.setMode(MODE)),
  });
  if (btn) {
    // dos espadas cruzadas (el emoji ⚔️ no se ve bien en todas partes)
    btn.innerHTML = `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l11 11M20 4L9 15"/><path d="M13 17l4 4M11 17l-4 4M15 15l3-3M9 15l-3-3" /></svg><span class="lbl">Jugar</span>`;
    btn.setAttribute("aria-pressed", "false");
  }
  app.on("mode", ({ name }) => document.getElementById("btn-game")?.setAttribute("aria-pressed", String(name === MODE)));
  game.S = S;
  game.runAI = runAI;
  window.__hispania = game; // para depurar desde la consola (y las pruebas)
}
