// «Hispania»: el modo de juego de España Civ. Un 4X por turnos original sobre el mapa real de la Península.
// Este módulo es el controlador: registra el modo "game", el botón «Jugar», los overlays de dibujo, el tooltip, los
// clics y las teclas, y lleva el ciclo de turnos (tú → los demás pueblos → final de ronda).
import { UNITS, TECHS, RESOURCES, GOVS } from "./rules.js";
import * as S from "./sim.js";
import { runAI } from "./ai.js";
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
    if (full) { UI.renderHud(game); UI.renderPanel(game); UI.renderEndTurn(game); }
    app.requestDraw();
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
    refreshSelection();
    UI.renderPanel(game);
    app.requestDraw();
  };
  game.focusCell = (cell, scale) => {
    const grid = app.w.grid;
    const s = Math.max(app.cam.scale, scale ?? 0.9);
    app.flyTo(grid.cx(cell), grid.cy(cell), s, 450);
  };
  const needsOrders = (u) => u.owner === 0 && u.mp > 0 && !u.fortified && !u.sleep && !u.skip && !(u.goto && u.goto.length);
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
    UI.renderHud(game); UI.renderPanel(game); UI.renderEndTurn(game);
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
      case "next": return game.nextUnit();
      case "deselect": return game.select(null);
      case "goto": return game.focusCell(+data.cell);
      case "found":
        if (u && u.owner === 0 && S.canFound(G, M, u).ok && u.mp > 0) {
          const c = S.foundCity(G, M, u);
          game.changed();
          if (c) { game.select(c); app.ui.toast?.(`🏛️ Fundada ${c.name}. Elige qué construir.`); }
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
    UI.renderEndTurn(game);
    await nextFrame();
    const myUnits = new Map(G.units.filter((u) => u.owner === 0).map((u) => [u, u.hp]));
    const myCities = new Set(S.playerCities(G, 0).map((c) => c.id));
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
    // avisos de la ronda
    const news = G.log.slice(logFrom).filter((e) => e.player === 0 || e.all || e.kind === "meet");
    const msgs = news.map((e) => e.msg);
    if (lostUnits.length) msgs.unshift(`Has perdido ${lostUnits.length} unidad${lostUnits.length > 1 ? "es" : ""}.`);
    for (const id of lostCities) msgs.unshift(`⚠️ Has perdido ${S.cityById(G, id)?.name || "una ciudad"}.`);
    msgs.slice(0, 4).forEach((m, k) => setTimeout(() => app.ui.toast?.(m), k * 1300));
    if (G.over) { UI.showGameOver(game); return; }
    // invasiones, revueltas y decisiones de la ronda
    const alerts = (G.alerts || []).splice(0);
    for (const a of alerts) { await UI.alertBox(game, a); game.changed(); }
    for (let k = 0; k < 2; k++) {
      const ev = S.nextEvent(G, M, 0);
      if (!ev) break;
      const r = await UI.decide(game, ev);
      S.resolveEvent(G, M, 0, ev.id, r.choice, { name: r.name });
      game.changed();
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
    if (!game.modal) game.nextUnit() || null;
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
  function click(ev) {
    const { G, M } = game;
    if (!G || game.busy) return true;
    const b = renderer.bannerAt(ev.x, ev.y);
    if (b) { game.select(b); return true; }
    const cell = ev.cell;
    if (cell < 0) { game.select(null); return true; }
    const u = game.selUnit;
    if (u && u.owner === 0 && cell !== u.cell && !G.over) {
      if (S.canAttack(G, M, u, cell)) { doAttack(u, cell); return true; }
      if (M.kind[cell] !== S.K.VOID) {
        const enemy = game.vis[cell] ? S.targetAt(G, 0, cell) : null;
        const p = S.findPath(G, M, u, cell, { attack: !!enemy, maxTurns: 25 });
        if (p && p.path.length) {
          const path = enemy ? p.path.slice(0, -1) : p.path;
          if (path.length) doMove(u, path);
          if (enemy && G.units.includes(u) && u.mp > 0 && S.canAttack(G, M, u, cell)) doAttack(u, cell);
          return true;
        }
      }
    }
    // elegir lo que haya en la casilla
    const mine = G.units.filter((x) => x.cell === cell && x.owner === 0).sort((a, b) => Number(S.isMilitary(b)) - Number(S.isMilitary(a)));
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
      case "Enter": take(); if (!game.busy) game.endTurnButton(e.shiftKey); break;
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
      if (fresh) app.ui.toast?.(`Tus colonos esperan en ${M.names[at] || "su tierra"}. Pulsa B para fundar la capital.`);
    }, 500);
  }
  function setup() {
    UI.renderHud(game); UI.renderEndTurn(game); UI.renderPanel(game);
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
      if (saved) app.setShowResources(saved.showResources);
      app.invalidate();
    },
    onEscape() {
      if (UI.closeModal(game)) return true;
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
