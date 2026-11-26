// Interfaz DOM de «Hispania»: pantalla de inicio, barra de partida, panel lateral (unidad, ciudad o resumen),
// botón de fin de turno, árbol tecnológico, diplomacia, registro, diálogos y pantalla final.
import { PEOPLES, PEOPLE_BY_ID, DIFFICULTY, RESOURCES, UNITS, BUILDINGS, WONDERS, TECHS, ERAS, YIELD_ICON, unlocksOf, yearLabel, MAX_TURNS } from "./rules.js";
import {
  K, playerCities, cityYield, growthNeed, itemCost, itemName, itemEmoji, buildOptions, buyCost, availableTechs, techCost,
  turnsTo, playerTotals, canFound, cityStrength, cityMaxHp, military, score, atWar, terrainName, tileYield, eraOf, housing, isMilitary,
} from "./sim.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (v) => (Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toString().replace(".", ","));
const signed = (v) => `${v >= 0 ? "+" : "−"}${fmt(Math.abs(v))}`;
const tt = (n) => (n === Infinity ? "—" : `${n} turno${n === 1 ? "" : "s"}`);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// --- modales ----------------------------------------------------------------------------------------------------
export function modal(game, { title = "", body = "", cls = "", closable = true, onClose } = {}) {
  closeModal(game);
  const wrap = el("div", `gm-modal ${cls}`);
  wrap.innerHTML = `<div class="gm-card panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    ${title ? `<h2 class="gm-title">${title}</h2>` : ""}${closable ? `<button class="gm-x icon-btn" data-close aria-label="Cerrar">✕</button>` : ""}
    <div class="gm-body"></div></div>`;
  const b = wrap.querySelector(".gm-body");
  if (typeof body === "string") b.innerHTML = body; else b.appendChild(body);
  wrap.addEventListener("click", (e) => {
    if (closable && (e.target === wrap || e.target.closest("[data-close]"))) closeModal(game);
  });
  document.body.appendChild(wrap);
  game.modal = { el: wrap, onClose, closable };
  wrap.querySelector("button:not([data-close])")?.focus();
  return wrap;
}
export function closeModal(game) {
  if (!game.modal) return false;
  const m = game.modal;
  game.modal = null;
  m.el.remove();
  m.onClose?.();
  return true;
}
export function ask(game, { title, text, yes = "Sí", no = "No", danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const w = modal(game, {
      title, cls: "gm-small",
      body: `<p>${text}</p><div class="gm-row gm-end"><button class="gm-btn" data-no>${esc(no)}</button><button class="gm-btn ${danger ? "gm-danger" : "gm-primary"}" data-yes>${esc(yes)}</button></div>`,
      onClose: () => { if (!done) resolve(false); },
    });
    w.querySelector("[data-yes]").addEventListener("click", () => { done = true; closeModal(game); resolve(true); });
    w.querySelector("[data-no]").addEventListener("click", () => { done = true; closeModal(game); resolve(false); });
    w.querySelector("[data-yes]").focus();
  });
}

// --- inicio -----------------------------------------------------------------------------------------------------
export function showSetup(game, { hasSave, onStart, onContinue, onExit }) {
  let people = "iberos", rivals = 5, diff = "normal";
  const body = el("div", "gm-setup");
  body.innerHTML = `
    <p class="gm-lead">Un juego de estrategia por turnos sobre el mapa real de la Península. Empiezas hacia el
    <b>1000 a. C.</b> con unos colonos y unos guerreros: funda ciudades, explora, investiga, levanta las maravillas
    en su sitio real (la Alhambra solo en Granada) y sobrevive a tus vecinos. Ganas por <b>ciencia</b> (descubrir la
    imprenta), por <b>dominio</b> (tener todas las capitales) o por <b>puntos</b> al llegar al turno ${MAX_TURNS}.</p>
    ${hasSave ? `<div class="gm-continue"><button class="gm-btn gm-primary" data-continue>▶ Continuar la partida guardada</button></div>` : ""}
    <h3>Elige tu pueblo</h3>
    <div class="gm-peoples">${PEOPLES.map((p) => `<button class="gm-people" data-p="${p.id}" style="--pc:${p.color};--pi:${p.ink}">
      <span class="gm-pname"><i></i>${esc(p.name)}</span><span class="gm-preg">${esc(p.region)}</span><span class="gm-pbon">${esc(p.bonus)}</span></button>`).join("")}</div>
    <div class="gm-opts">
      <label>Rivales <select data-rivals>${[2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}"${n === rivals ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <label>Dificultad <select data-diff>${Object.entries(DIFFICULTY).map(([k, d]) => `<option value="${k}"${k === diff ? " selected" : ""}>${d.label}</option>`).join("")}</select></label>
    </div>
    <div class="gm-row gm-end"><button class="gm-btn" data-exit>Volver al mapa de datos</button><button class="gm-btn gm-primary" data-start>Empezar partida</button></div>`;
  const sync = () => body.querySelectorAll(".gm-people").forEach((b) => b.classList.toggle("on", b.dataset.p === people));
  body.addEventListener("click", (e) => {
    const p = e.target.closest("[data-p]")?.dataset.p;
    if (p) { people = p; sync(); }
    if (e.target.closest("[data-start]")) { closeModal(game); onStart({ people, rivals, difficulty: diff }); }
    if (e.target.closest("[data-continue]")) { closeModal(game); onContinue(); }
    if (e.target.closest("[data-exit]")) { closeModal(game); onExit(); }
  });
  body.querySelector("[data-rivals]").addEventListener("change", (e) => { rivals = +e.target.value; });
  body.querySelector("[data-diff]").addEventListener("change", (e) => { diff = e.target.value; });
  sync();
  modal(game, { title: "Hispania", body, cls: "gm-wide gm-setup-modal", closable: false });
}

// --- barra superior -----------------------------------------------------------------------------------------------
export function renderHud(game) {
  const { G, M } = game;
  let bar = document.getElementById("game-bar");
  if (!bar) {
    bar = el("div", "game-bar");
    bar.id = "game-bar";
    document.querySelector("#topbar .brand")?.after(bar);
    bar.addEventListener("click", (e) => {
      const a = e.target.closest("[data-act]")?.dataset.act;
      if (a) game.action(a);
    });
  }
  if (!G) { bar.innerHTML = ""; return; }
  const P = G.players[0];
  const t = playerTotals(G, M, 0);
  const res = P.research ? TECHS[P.research] : null;
  const need = P.research ? techCost(P, P.research) : 0;
  const wars = G.players.filter((Q) => Q.alive && atWar(G, 0, Q.idx));
  bar.innerHTML = `
    <span class="gb-people" style="--pc:${P.color}"><i></i>${esc(P.name)}</span>
    <span class="gb-turn" title="Turno ${G.turn} de ${MAX_TURNS}"><b>${yearLabel(G.turn)}</b> · T${G.turn}</span>
    <button class="gb-y" data-act="economy" title="Oro: ${fmt(P.gold)} (${signed(t.net)} por turno; ${t.upkeep} de soldadas)">💰 <b>${fmt(Math.floor(P.gold))}</b> <small>${signed(t.net)}</small></button>
    <button class="gb-y gb-sci" data-act="tech" title="Investigación">🔬 ${res ? `${esc(res.name)} <small>${turnsTo(need - P.science, t.s) === Infinity ? "—" : `${turnsTo(need - P.science, t.s)} t`}</small>` : `<b class="gb-warn">Elegir</b>`} <small>${signed(t.s)}</small></button>
    <span class="gb-y" title="Cultura por turno">🎭 <small>${signed(t.c)}</small></span>
    ${wars.length ? `<button class="gb-y gb-war" data-act="diplo" title="En guerra">⚔️ ${wars.map((Q) => `<i style="background:${Q.color}"></i>`).join("")}</button>` : ""}
    <button class="gb-btn" data-act="diplo" title="Diplomacia (D)">🤝</button>
    <button class="gb-btn" data-act="log" title="Crónica de la partida">📜</button>
    <button class="gb-btn" data-act="menu" title="Partida">☰</button>`;
}

// --- botón de fin de turno -------------------------------------------------------------------------------------
export function renderEndTurn(game) {
  let b = document.getElementById("game-end");
  if (!b) {
    b = el("div", "game-end");
    b.id = "game-end";
    b.innerHTML = `<button class="ge-main" data-main></button><button class="ge-force" data-force title="Terminar el turno aunque queden cosas (Mayús+Intro)">Terminar igualmente</button>`;
    b.querySelector("[data-main]").addEventListener("click", (e) => game.endTurnButton(e.shiftKey));
    b.querySelector("[data-force]").addEventListener("click", () => game.endTurn());
    document.body.appendChild(b);
  }
  const pend = game.pending();
  const main = b.querySelector("[data-main]");
  b.querySelector("[data-force]").hidden = !pend || !!game.G?.over || game.busy;
  if (!game.G) { b.hidden = true; return; }
  b.hidden = false;
  main.disabled = game.busy || !!game.G.over;
  main.className = `ge-main${pend ? " pending" : ""}`;
  main.innerHTML = game.busy ? `<span>Los demás pueblos mueven…</span>` : game.G.over ? "<span>Partida terminada</span>"
    : pend ? `<span>${esc(pend.label)}</span><small>Intro</small>` : `<span>Terminar turno</span><small>Intro</small>`;
}

// --- panel lateral ----------------------------------------------------------------------------------------------
export function renderPanel(game) {
  const host = game.dock;
  if (!host) return;
  const { G } = game;
  if (!G) { host.innerHTML = ""; return; }
  if (game.selUnit && G.units.includes(game.selUnit)) host.innerHTML = unitPanel(game, game.selUnit);
  else if (game.selCity && G.cities.includes(game.selCity)) host.innerHTML = cityPanel(game, game.selCity);
  else host.innerHTML = summaryPanel(game);
  if (!host._wired) {
    host._wired = true;
    host.addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]");
      if (!t || t.disabled) return;
      game.action(t.dataset.act, t.dataset);
    });
  }
}

function statLine(G, u) {
  const U = UNITS[u.type];
  const bits = [];
  if (U.str) bits.push(`⚔️ ${U.str}`);
  if (U.rstr) bits.push(`🏹 ${U.rstr} <small>(alcance ${U.range})</small>`);
  bits.push(`👣 ${fmt(Math.max(0, u.mp))}/${U.mov}`);
  bits.push(`❤️ ${Math.max(0, Math.round(u.hp))}`);
  return bits.join(" · ");
}
function unitPanel(game, u) {
  const { G, M } = game;
  const U = UNITS[u.type];
  const P = G.players[u.owner];
  const mine = u.owner === 0;
  let actions = "";
  if (mine) {
    const btn = (act, label, key, dis = false, title = "") => `<button class="gm-btn" data-act="${act}"${dis ? " disabled" : ""}${title ? ` title="${esc(title)}"` : ""}>${label}${key ? ` <kbd>${key}</kbd>` : ""}</button>`;
    if (u.type === "colono") {
      const cf = canFound(G, M, u);
      const q = M.siteBase[u.cell];
      actions += btn("found", "🏛️ Fundar ciudad", "B", !cf.ok || u.mp <= 0, cf.why || "");
      actions += `<p class="gm-note">${cf.ok ? `Calidad del sitio: <b>${q >= 40 ? "excelente" : q >= 30 ? "buena" : q >= 20 ? "normal" : "pobre"}</b>${M.fresh[u.cell] ? " · agua dulce (+3 vivienda)" : M.coastal[u.cell] ? " · costa (+3 vivienda)" : ""}.` : esc(cf.why)}</p>`;
    }
    if (U.cls !== "civil") actions += btn("fortify", u.fortified ? "🛡️ Fortificada" : "🛡️ Fortificar", "F", u.fortified);
    actions += btn("skip", "⏭️ Saltar turno", "Espacio");
    actions += btn("sleep", "💤 Dormir", "");
    if (u.goto) actions += btn("cancelgo", "✋ Cancelar ruta", "");
    actions += btn("disband", "🗑️ Disolver", "", false, "Eliminar esta unidad (ahorra soldada)");
  }
  return `<div class="gp-head" style="--pc:${P.color};--pi:${P.ink}">
      <span class="gp-emoji">${U.emoji}</span><div><h3>${esc(U.name)}</h3><span class="gp-sub">${esc(P.name)}${mine ? "" : " (ajena)"}</span></div>
      <button class="icon-btn gp-close" data-act="deselect" aria-label="Cerrar">✕</button></div>
    <p class="gp-stats">${statLine(G, u)}</p>
    <p class="gm-note">${esc(U.desc)}</p>
    <p class="gm-note">📍 ${esc(terrainName(M, u.cell))}${M.river[u.cell] ? " · río" : ""}</p>
    ${mine ? `<div class="gp-actions">${actions}</div>
    <p class="gm-hint">Pulsa una casilla para mover (la línea muestra cuántos turnos). Pulsa un enemigo marcado en rojo para atacar.</p>` : ""}`;
}

function yieldRow(y) {
  return `<div class="gp-yields">
    <span title="Comida neta">${YIELD_ICON.f} <b>${signed(y.food)}</b></span>
    <span title="Producción">${YIELD_ICON.p} <b>${fmt(y.p)}</b></span>
    <span title="Oro">${YIELD_ICON.g} <b>${fmt(y.g)}</b></span>
    <span title="Ciencia">${YIELD_ICON.s} <b>${fmt(y.s)}</b></span>
    <span title="Cultura">${YIELD_ICON.c} <b>${fmt(y.c)}</b></span></div>`;
}
function cityPanel(game, c) {
  const { G, M } = game;
  const P = G.players[c.owner];
  const mine = c.owner === 0;
  const head = `<div class="gp-head" style="--pc:${P.color};--pi:${P.ink}">
      <span class="gp-pop">${c.pop}</span><div><h3>${c.capital ? "★ " : ""}${esc(c.name)}</h3><span class="gp-sub">${esc(P.name)} · fundada ${yearLabel(c.founded)}</span></div>
      <button class="icon-btn gp-close" data-act="deselect" aria-label="Cerrar">✕</button></div>`;
  const def = `🛡️ ${cityStrength(G, M, c)} · ❤️ ${Math.round(c.hp)}/${cityMaxHp(c)}`;
  if (!mine) {
    return `${head}<p class="gp-stats">${def}</p>
      <p class="gm-note">Edificios: ${c.buildings.map((b) => BUILDINGS[b].emoji).join(" ") || "—"} ${c.wonders.map((w) => WONDERS[w].emoji).join(" ")}</p>
      <p class="gm-hint">${atWar(G, 0, c.owner) ? "Estáis en guerra: rodéala, baja su vida a 0 con asedio o a distancia y entra con una unidad cuerpo a cuerpo." : "Estáis en paz con este pueblo."}</p>`;
  }
  const y = cityYield(G, M, c);
  const need = growthNeed(c.pop);
  const hcap = housing(G, M, c);
  const growTxt = c.pop >= hcap ? `Sin vivienda (${c.pop}/${hcap}): construye un granero o un acueducto`
    : y.food > 0 ? `Crece en ${tt(turnsTo(need - c.food, y.food))}` : y.food < 0 ? "¡Pasa hambre!" : "Estancada";
  const it = c.build;
  const cost = itemCost(G, it, 0);
  const bc = buyCost(G, c);
  const cur = it ? `<div class="gp-cur"><span class="gp-ci">${itemEmoji(it)}</span><div><b>${esc(itemName(it))}</b>
      <small>${it.kind === "trade" ? `Convierte la producción en oro (+${fmt(y.p * 0.5)} 💰)` : `${Math.floor(c.prod)}/${cost} · ${tt(turnsTo(cost - c.prod, y.p))}`}</small>
      ${it.kind !== "trade" ? `<span class="gp-bar"><i style="width:${Math.min(100, (100 * c.prod) / Math.max(1, cost))}%"></i></span>` : ""}</div>
      ${bc != null ? `<button class="gm-btn gm-buy" data-act="buy"${P.gold < bc ? " disabled" : ""} title="Comprar ya">💰 ${bc}</button>` : ""}</div>`
    : `<div class="gp-cur gp-none">⚠️ Elige qué construir</div>`;
  const opts = buildOptions(G, M, c);
  const group = (kind, title) => {
    const list = opts.filter((o) => o.kind === kind);
    if (!list.length) return "";
    return `<h4>${title}</h4><div class="gp-opts">${list.map((o) => {
      const def = kind === "unit" ? UNITS[o.id] : kind === "building" ? BUILDINGS[o.id] : kind === "wonder" ? WONDERS[o.id] : null;
      const turns = o.kind === "trade" ? "" : `${turnsTo(o.cost - (it && it.kind === o.kind && it.id === o.id ? c.prod : 0), y.p)} t`;
      const on = it && it.kind === o.kind && it.id === o.id;
      const title = o.ok ? def?.desc || "Convierte la producción en oro" : o.why;
      return `<button class="gp-opt${on ? " on" : ""}" data-act="build" data-kind="${o.kind}" data-id="${o.id}"${o.ok ? "" : " disabled"} title="${esc(title)}">
        <span>${o.kind === "trade" ? "💱" : def.emoji}</span><b>${esc(o.kind === "trade" ? "Comercio" : def.name)}</b><small>${o.kind === "trade" ? "→ 💰" : `${o.cost} ⚙️ · ${turns}`}</small></button>`;
    }).join("")}</div>`;
  };
  return `${head}
    ${yieldRow(y)}
    <p class="gp-stats">🌾 ${Math.floor(c.food)}/${need} · ${esc(growTxt)}<br>🏠 vivienda ${hcap} · ${def}</p>
    ${cur}
    ${group("unit", "Unidades")}${group("building", "Edificios")}${group("wonder", "Maravillas (en su sitio real)")}${group("trade", "Otros")}
    <h4>Construido</h4><p class="gm-note">${c.buildings.map((b) => `${BUILDINGS[b].emoji} ${esc(BUILDINGS[b].name)}`).join(" · ") || "Nada todavía"}${c.wonders.length ? `<br>${c.wonders.map((w) => `🏛️ ${esc(WONDERS[w].name)}`).join(" · ")}` : ""}</p>`;
}

function summaryPanel(game) {
  const { G, M } = game;
  const P = G.players[0];
  const t = playerTotals(G, M, 0);
  const cs = playerCities(G, 0);
  const recent = G.log.filter((e) => e.turn >= G.turn - 2 && (e.player === 0 || e.all || e.kind === "meet")).slice(-10).reverse();
  const pend = game.pending();
  return `<div class="gp-head" style="--pc:${P.color};--pi:${P.ink}"><span class="gp-emoji">🏛️</span><div><h3>${esc(P.name)}</h3><span class="gp-sub">${yearLabel(G.turn)} · turno ${G.turn} · puntos ${score(G, 0)}</span></div></div>
    ${yieldRow({ food: t.f, p: t.p, g: t.net, s: t.s, c: t.c })}
    <p class="gp-stats">🏙️ ${cs.length} ciudades · 👥 ${cs.reduce((a, c) => a + c.pop, 0)} población · ⚔️ ejército ${military(G, 0)}</p>
    ${pend ? `<button class="gm-btn gm-primary gp-wide" data-act="pending">${esc(pend.label)}</button>` : ""}
    <div class="gp-actions"><button class="gm-btn" data-act="tech">🔬 Tecnologías <kbd>T</kbd></button><button class="gm-btn" data-act="diplo">🤝 Diplomacia <kbd>D</kbd></button><button class="gm-btn" data-act="next">👉 Siguiente unidad <kbd>N</kbd></button></div>
    <h4>Crónica reciente</h4>
    <ul class="gp-log">${recent.map((e) => `<li${e.cell != null ? ` data-act="goto" data-cell="${e.cell}"` : ""}><small>T${e.turn}</small> ${esc(e.msg)}</li>`).join("") || "<li class='muted'>Nada por ahora.</li>"}</ul>
    <p class="gm-hint">Consejo: elige una unidad pulsándola. Los colonos fundan ciudades (B); la producción de cada ciudad se elige pulsando su nombre. El punto amarillo marca las unidades que esperan órdenes.</p>`;
}

// --- tecnologías ------------------------------------------------------------------------------------------------
export function showTech(game) {
  const { G, M } = game;
  const P = G.players[0];
  const sci = playerTotals(G, M, 0).s;
  const av = new Set(availableTechs(P));
  const body = el("div", "gm-tech");
  const goal = P.researchGoal;
  body.innerHTML = `<p class="gm-note">Ciencia: <b>${fmt(sci)}</b> 🔬 por turno · acumulada ${Math.floor(P.science)}. Pulsa una tecnología disponible para investigarla, o una bloqueada para fijarla como objetivo (se irán investigando sus requisitos).</p>
    <div class="gt-cols">${ERAS.map((era, e) => `<div class="gt-col"><h4>${esc(era)}</h4>${Object.entries(TECHS).filter(([id, T]) => T.era === e && T.cost > 0).map(([id, T]) => {
      const known = P.techs.includes(id);
      const state = known ? "known" : P.research === id ? "cur" : av.has(id) ? "av" : "lock";
      const cost = techCost(P, id);
      const turns = known ? "" : turnsTo(cost - (P.research === id ? P.science : 0), sci);
      const un = unlocksOf(id);
      return `<button class="gt-tech ${state}${goal === id ? " goal" : ""}" data-tech="${id}" ${known ? "disabled" : ""} title="${esc([T.desc, un.map((x) => `${x.emoji} ${x.name}: ${x.desc}`).join("\n"), T.req.length ? `Requiere: ${T.req.map((r) => TECHS[r].name).join(", ")}` : ""].filter(Boolean).join("\n"))}">
        <b>${esc(T.name)}</b><small>${known ? "✓ conocida" : `${cost} 🔬 · ${turns === Infinity ? "—" : `${turns} t`}`}</small>
        <span class="gt-un">${un.map((x) => x.emoji).join(" ")}</span></button>`;
    }).join("")}</div>`).join("")}</div>`;
  body.addEventListener("click", (e) => {
    const id = e.target.closest("[data-tech]")?.dataset.tech;
    if (!id) return;
    game.setResearch(id);
    closeModal(game);
  });
  modal(game, { title: "Tecnologías", body, cls: "gm-wide" });
}

// --- diplomacia -------------------------------------------------------------------------------------------------
export function showDiplo(game) {
  const { G } = game;
  const me = military(G, 0);
  const body = el("div", "gm-diplo");
  const rows = G.players.slice(1).map((Q) => {
    if (!G.players[0].met[Q.idx]) return `<div class="gd-row unknown"><span class="gd-name"><i style="background:#555"></i>Pueblo desconocido</span><span class="muted">Explora para encontrarlo.</span></div>`;
    const war = atWar(G, 0, Q.idx);
    const them = military(G, Q.idx);
    const rel = them > me * 1.3 ? "más fuerte que el tuyo" : them < me * 0.77 ? "más débil que el tuyo" : "parecido al tuyo";
    const truce = (G.players[0].peaceUntil?.[Q.idx] ?? 0) > G.turn;
    return `<div class="gd-row${Q.alive ? "" : " dead"}">
      <span class="gd-name"><i style="background:${Q.color}"></i>${esc(Q.name)}</span>
      <span>${Q.alive ? `${playerCities(G, Q.idx).length} ciudades · ${score(G, Q.idx)} puntos · ejército ${rel}` : "Desaparecidos"}</span>
      <span class="gd-st ${war ? "war" : "peace"}">${war ? "⚔️ En guerra" : truce ? `🕊️ Tregua hasta T${G.players[0].peaceUntil[Q.idx]}` : "🕊️ En paz"}</span>
      ${Q.alive ? war ? `<button class="gm-btn" data-peace="${Q.idx}">Proponer la paz</button>` : `<button class="gm-btn gm-danger" data-war="${Q.idx}"${truce ? " disabled" : ""}>Declarar la guerra</button>` : ""}
    </div>`;
  });
  body.innerHTML = `<p class="gm-note">En paz, las fronteras están cerradas: tus unidades no pueden entrar en su territorio ni atacarles. Tu ejército: ${me}.</p>${rows.join("")}`;
  body.addEventListener("click", (e) => {
    const w = e.target.closest("[data-war]")?.dataset.war;
    const p = e.target.closest("[data-peace]")?.dataset.peace;
    if (w != null) game.declareWarOn(+w);
    if (p != null) game.proposePeace(+p);
  });
  modal(game, { title: "Diplomacia", body, cls: "gm-mid" });
}

export function showLog(game) {
  const { G } = game;
  const list = G.log.filter((e) => e.player === 0 || e.all || e.kind === "meet").slice(-120).reverse();
  const body = el("div", "gm-logm", `<ul class="gp-log">${list.map((e) => `<li${e.cell != null ? ` data-cell="${e.cell}"` : ""}><small>T${e.turn} · ${yearLabel(e.turn)}</small> ${esc(e.msg)}</li>`).join("")}</ul>`);
  body.addEventListener("click", (e) => {
    const c = e.target.closest("[data-cell]")?.dataset.cell;
    if (c != null) { closeModal(game); game.focusCell(+c); }
  });
  modal(game, { title: "Crónica", body, cls: "gm-mid" });
}

export function showMenu(game) {
  const body = el("div", "gm-menu", `
    <button class="gm-btn gp-wide" data-m="save">💾 Guardar ahora <small class="muted">(se guarda sola cada turno)</small></button>
    <button class="gm-btn gp-wide" data-m="new">🆕 Nueva partida</button>
    <button class="gm-btn gp-wide" data-m="help">❓ Cómo se juega</button>
    <button class="gm-btn gp-wide" data-m="exit">🗺️ Volver al mapa de datos</button>`);
  body.addEventListener("click", (e) => {
    const m = e.target.closest("[data-m]")?.dataset.m;
    if (!m) return;
    closeModal(game);
    game.action(`menu-${m}`);
  });
  modal(game, { title: "Partida", body, cls: "gm-small" });
}

export function showHelp(game) {
  modal(game, {
    title: "Cómo se juega", cls: "gm-mid",
    body: `<ul class="gm-help">
      <li><b>Unidades</b>: púlsalas para elegirlas; luego pulsa una casilla para moverlas (la línea discontinua marca la ruta y el número, en qué turno llegan). Montañas, colinas, bosques y humedales cuestan más movimiento; las cumbres no se pueden cruzar.</li>
      <li><b>Ciudades</b>: los colonos fundan con <kbd>B</kbd> a 4 casillas o más de otra ciudad. Junto a un río, un lago o la costa tienen más vivienda. Pulsa el nombre de una ciudad para elegir qué construye.</li>
      <li><b>Rendimientos</b>: 🌾 hace crecer la ciudad, ⚙️ construye, 💰 paga las soldadas y compra, 🔬 investiga y 🎭 amplía las fronteras.</li>
      <li><b>Maravillas</b>: cada una solo se puede levantar en una ciudad cuyo territorio incluya su sitio real (Atapuerca en Burgos, la Mezquita en Córdoba…).</li>
      <li><b>Combate</b>: pulsa un enemigo marcado en rojo. Pasa el ratón por encima antes para ver el daño previsto. Colinas, montañas, bosques y fortificarse (<kbd>F</kbd>) ayudan a defender. Las ciudades se toman bajando su vida a 0 y entrando cuerpo a cuerpo.</li>
      <li><b>Mar</b>: con Navegación las unidades embarcan por la costa (Baleares, Canarias); con Cartografía, por el mar abierto.</li>
      <li><b>Teclas</b>: <kbd>Intro</kbd> turno · <kbd>Espacio</kbd> saltar · <kbd>N</kbd> siguiente · <kbd>F</kbd> fortificar · <kbd>B</kbd> fundar · <kbd>T</kbd> tecnologías · <kbd>D</kbd> diplomacia · <kbd>Esc</kbd> soltar · flechas/WASD mover el mapa.</li>
    </ul>`,
  });
}

export function showGameOver(game) {
  const { G } = game;
  const o = G.over;
  const win = o.winner === 0;
  const W = G.players[o.winner];
  const how = { ciencia: "por ciencia (la imprenta)", dominio: "por dominio (todas las capitales)", tiempo: "por puntos", conquista: "por conquista", derrota: "" }[o.how] || o.how;
  const rows = G.players.slice().sort((a, b) => score(G, b.idx) - score(G, a.idx))
    .map((P) => `<tr><td><i class="gd-dot" style="background:${P.color}"></i>${esc(P.name)}${P.alive ? "" : " †"}</td><td>${playerCities(G, P.idx).length}</td><td>${P.techs.length}</td><td><b>${score(G, P.idx)}</b></td></tr>`).join("");
  modal(game, {
    title: win ? "🏆 ¡Victoria!" : o.how === "derrota" ? "☠️ Derrota" : "Fin de la partida", cls: "gm-mid", closable: true,
    body: `<p class="gm-lead">${win ? `Los ${esc(W.name)} ganan ${how} en el ${yearLabel(o.turn)}.` : o.how === "derrota" ? "Tu pueblo ha desaparecido de la historia." : `Los ${esc(W?.name || "")} ganan ${how} en el ${yearLabel(o.turn)}.`}</p>
      <table class="gm-table"><tr><th>Pueblo</th><th>Ciudades</th><th>Tecnologías</th><th>Puntos</th></tr>${rows}</table>
      <div class="gm-row gm-end"><button class="gm-btn" data-close>Ver el mapa</button><button class="gm-btn gm-primary" data-new>Nueva partida</button></div>`,
  }).querySelector("[data-new]").addEventListener("click", () => { closeModal(game); game.action("menu-new"); });
}

// --- tooltip ----------------------------------------------------------------------------------------------------
export function tooltip(game, cell) {
  const { G, M } = game;
  if (!G || cell < 0) return null;
  if (!G.explored[cell]) return `<b>Tierra inexplorada</b>`;
  const lines = [];
  const k = M.kind[cell];
  if (k === K.VOID) return `<b>Tierras lejanas</b><br><span class="muted">Fuera del juego</span>`;
  const y = tileYield(G, M, 0, cell);
  const yl = ["f", "p", "g", "s", "c"].filter((q) => y[q]).map((q) => `${YIELD_ICON[q]}${y[q]}`).join(" ");
  lines.push(`<b>${esc(terrainName(M, cell))}</b>${M.river[cell] ? " · río" : ""}`);
  if (yl) lines.push(yl);
  const r = M.res[cell];
  if (r) lines.push(`Recurso: ${RESOURCES[r].emoji} ${esc(RESOURCES[r].name)}`);
  const real = M.names[cell];
  if (real) lines.push(`<span class="muted">Hoy: ${esc(real)}</span>`);
  const tc = G.tileOwner[cell] >= 0 ? G.cities.find((c) => c.id === G.tileOwner[cell]) : null;
  if (tc) lines.push(`Territorio de <b style="color:${G.players[tc.owner].color}">${esc(tc.name)}</b> (${esc(G.players[tc.owner].name)})`);
  for (const [wid, s] of Object.entries(M.wonderSites)) if (s.cell === cell) lines.push(`🏛️ Sitio de: ${esc(WONDERS[wid]?.name || wid)}`);
  if (game.vis[cell]) {
    for (const u of G.units) if (u.cell === cell) lines.push(`${UNITS[u.type].emoji} ${esc(UNITS[u.type].name)} · <span style="color:${G.players[u.owner].color}">${esc(G.players[u.owner].name)}</span> · ❤️${Math.round(u.hp)}`);
  }
  const su = game.selUnit;
  if (su && su.owner === 0) {
    const pv = game.attackPreview(cell);
    if (pv) {
      lines.push(`<hr>${pv.war ? "" : "<b class='gb-warn'>Hay que declarar la guerra.</b><br>"}⚔️ Tu fuerza <b>${pv.A}</b> contra <b>${pv.D}</b>`);
      lines.push(`Daño causado ≈ <b>${pv.toDef}</b> (le quedan ${Math.max(0, Math.round(pv.defHp - pv.toDef))})${pv.ranged ? " · a distancia: no recibes daño" : ` · recibido ≈ <b>${pv.toAtt}</b>`}`);
    } else if (game.pathPreview && game.pathPreview.target === cell) {
      const t = game.pathPreview.turns.at(-1) + 1;
      lines.push(`<hr>👣 Llega en ${t} turno${t > 1 ? "s" : ""}`);
    } else if (cell !== su.cell && !game.pathPreview) lines.push(`<hr><span class="muted">No puede llegar ahí.</span>`);
  }
  return lines.join("<br>");
}
