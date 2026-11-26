// Interfaz DOM de «Hispania»: pantalla de inicio, barra de partida, panel lateral (unidad, ciudad o resumen),
// botón de fin de turno, árbol tecnológico, diplomacia, registro, diálogos y pantalla final.
import { PEOPLES, PEOPLE_BY_ID, DIFFICULTY, RESOURCES, UNITS, BUILDINGS, WONDERS, TECHS, ERAS, YIELD_ICON, GOVS, TAGS, FAITHS, INVASIONS, IMPROVEMENTS, ROAD, unlocksOf, yearLabel, yearOf, MAX_TURNS } from "./rules.js";
import {
  K, playerCities, cityYield, growthNeed, itemCost, itemName, itemEmoji, buildOptions, buyCost, availableTechs, techCost,
  turnsTo, playerTotals, canFound, cityStrength, cityMaxHp, military, score, atWar, terrainName, tileYield, eraOf, housing, isMilitary,
  countryName, availableGovs, stabilityTarget, nameSuggestions, altSpain, pmods, GOV_COOLDOWN, territoryShare, turnsOf, canAfford,
  workOptions, tradeTargets, routesOf, routeYield, maxRoutes, cityById, forecast, rumors, odds,
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
    <p class="gm-lead">De la <b>Edad del Bronce</b> (2000 a. C.) a <b>2050</b>, sobre el mapa real de la Península.
    Funda ciudades, explora, investiga y levanta las maravillas en su sitio real (la Alhambra solo en Granada).
    Resiste las <b>invasiones de la historia</b> —celtas, Cartago, Roma, visigodos, omeyas, Napoleón…, que si toman una
    ciudad se quedan— y toma las <b>decisiones</b> que irán haciendo tu país: su gobierno, su nombre, si es foral o
    centralista, tolerante o confesional, atlántico o europeísta. Al final, la crónica de <b>tu España alternativa</b>.
    Ganas por <b>ciencia</b> (la fusión nuclear), por <b>dominio</b> (todas las capitales) o por <b>puntos</b> en 2050.</p>
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
  const stab = Math.round(P.stability);
  const sTone = stab >= 70 ? "good" : stab >= 40 ? "" : stab >= 20 ? "warn" : "bad";
  bar.innerHTML = `
    <button class="gb-people" data-act="history" style="--pc:${P.color}" title="Tu país: ${esc(countryName(P))}. Pulsa para ver su historia"><i></i>${esc(countryName(P))}</button>
    <button class="gb-y gb-gov" data-act="gov" title="Gobierno: ${esc(GOVS[P.gov]?.name)} (G) · Fe: ${esc(FAITHS[P.faith]?.name || "")}">👑 <small>${esc(GOVS[P.gov]?.name || "")}</small> ${FAITHS[P.faith]?.emoji || ""}</button>
    <span class="gb-y gb-stab ${sTone}" title="Estabilidad ${stab}/100 (tiende a ${stabilityTarget(G, M, 0)}). Por encima de 70: +10 % de rendimiento; por debajo de 40: −15 %; por debajo de 20: −30 % y revueltas.">⚖️ <b>${stab}</b></span>
    <span class="gb-turn" title="Turno ${G.turn} de ${MAX_TURNS}"><b>${yearLabel(G.turn)}</b> · T${G.turn}</span>
    <button class="gb-y" data-act="economy" title="Oro: ${fmt(P.gold)} (${signed(t.net)} por turno; ${t.upkeep} de soldadas)">💰 <b>${fmt(Math.floor(P.gold))}</b> <small>${signed(t.net)}</small></button>
    <button class="gb-y gb-sci" data-act="tech" title="Investigación">🔬 ${res ? `${esc(res.name)} <small>${turnsTo(need - P.science, t.s) === Infinity ? "—" : `${turnsTo(need - P.science, t.s)} t`}</small>` : `<b class="gb-warn">Elegir</b>`} <small>${signed(t.s)}</small></button>
    <span class="gb-y" title="Cultura por turno">🎭 <small>${signed(t.c)}</small></span>
    ${wars.length ? `<button class="gb-y gb-war" data-act="diplo" title="En guerra">⚔️ ${wars.map((Q) => `<i style="background:${Q.color}"></i>`).join("")}</button>` : ""}
    <button class="gb-btn" data-act="diplo" title="Diplomacia (D)">🤝</button>
    <button class="gb-btn" data-act="log" title="Crónica de la partida">📜</button>
    <button class="gb-btn" data-act="menu" title="Partida">☰</button>`;
}

// --- botón de fin de turno (sustituido por la barra de siguiente paso; se conserva por compatibilidad) -------------
export function renderEndTurnOld(game) {
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
    if (U.worker) {
      if (u.task) {
        const name = u.task.id === "camino" ? ROAD.name : IMPROVEMENTS[u.task.id]?.name;
        actions += `<p class="gm-note">🔨 Trabajando: <b>${esc(name)}</b> · faltan ${u.task.left} turno${u.task.left === 1 ? "" : "s"}.</p>`;
      } else {
        const opts = workOptions(G, M, u);
        actions += opts.length ? `<div class="gp-opts">${opts.map((o) => `<button class="gp-opt" data-act="work" data-id="${o.id}"${o.ok && u.mp > 0 ? "" : " disabled"} title="${esc(o.ok ? (o.road ? ROAD.desc : "") : o.why)}"><span>${o.emoji}</span><b>${esc(o.name)}</b><small>${o.turns} turnos${o.ok ? "" : ` · ${esc(o.why)}`}</small></button>`).join("")}</div>`
          : `<p class="gm-note">Aquí no hay nada que construir. Llévalos a una casilla de tu territorio.</p>`;
      }
    }
    if (U.trade) {
      const ts = tradeTargets(G, M, u);
      const P0 = G.players[0];
      const used = routesOf(G, 0).length, max = maxRoutes(G, P0);
      actions += `<p class="gm-note">Rutas comerciales: ${used}/${max}. Origen: ${esc(cityById(G, u.home)?.name || "tu capital")}.</p>`;
      actions += ts.length ? ts.map((t) => `<button class="gm-btn" data-act="trade" data-city="${t.city.id}"${t.full ? " disabled title='Has llegado al máximo de rutas'" : ""}>🧳 Ruta con ${esc(t.city.name)}${t.city.owner !== 0 ? ` (${esc(G.players[t.city.owner].name)})` : ""} · +${t.yield.g} 💰${t.yield.s ? ` +${t.yield.s} 🔬` : ""}</button>`).join("")
        : `<p class="gm-hint">Llévalos junto a otra ciudad (tuya o de un pueblo en paz contigo). Las rutas con extranjeros rinden más y traen ciencia.</p>`;
    }
    if (U.cls !== "civil") actions += btn("fortify", u.fortified ? "🛡️ Fortificada" : "🛡️ Fortificar", "F", u.fortified);
    actions += btn("skip", "⏭️ Saltar turno", "Espacio");
    actions += btn("sleep", "💤 Dormir", "");
    if (u.goto) actions += btn("cancelgo", "✋ Cancelar ruta", "");
    actions += btn("disband", "🗑️ Disolver", "", false, "Eliminar esta unidad (ahorra soldada)");
  }
  return `<div class="gp-head" style="--pc:${P.color};--pi:${P.ink}">
      <span class="gp-emoji">${U.emoji}</span><div><h3>${esc(U.name)}</h3><span class="gp-sub">${esc(P.name)}${mine ? "" : " (ajena)"}</span></div>
      <button class="icon-btn gp-peek" data-act="peek" aria-label="Plegar o desplegar el panel">⇕</button><button class="icon-btn gp-close" data-act="deselect" aria-label="Cerrar">✕</button></div>
    <p class="gp-stats">${statLine(G, u)}</p>
    ${mine ? `<p class="gp-status">${esc(unitStatus(G, M, u))}</p>` : ""}
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
      <button class="icon-btn gp-peek" data-act="peek" aria-label="Plegar o desplegar el panel">⇕</button><button class="icon-btn gp-close" data-act="deselect" aria-label="Cerrar">✕</button></div>`;
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
  const sug = game.suggestBuild?.(c);
  const it = c.build;
  const cost = itemCost(G, it, 0);
  const bc = buyCost(G, c);
  const cur = it ? `<div class="gp-cur"><span class="gp-ci">${itemEmoji(it)}</span><div><b>${esc(itemName(it))}</b>
      <small>${it.kind === "trade" ? `Convierte la producción en oro (+${fmt(y.p * 0.5)} 💰)` : `${Math.floor(c.prod)}/${cost} · ${tt(turnsTo(cost - c.prod, y.p))}`}</small>
      ${it.kind !== "trade" ? `<span class="gp-bar"><i style="width:${Math.min(100, (100 * c.prod) / Math.max(1, cost))}%"></i></span>` : ""}</div>
      ${bc != null ? `<button class="gm-btn gm-buy" data-act="buy"${P.gold < bc ? " disabled" : ""} title="Comprar ya">💰 ${bc}</button>` : ""}</div>`
    : `<div class="gp-cur gp-none">⚠️ Elige qué construir${sug ? ` · ⭐ sugerencia: <b>${esc(itemName(sug))}</b>` : ""}</div>`;
  const opts = buildOptions(G, M, c);
  const group = (kind, title) => {
    const list = opts.filter((o) => o.kind === kind);
    if (!list.length) return "";
    return `<h4>${title}</h4><div class="gp-opts">${list.map((o) => {
      const def = kind === "unit" ? UNITS[o.id] : kind === "building" ? BUILDINGS[o.id] : kind === "wonder" ? WONDERS[o.id] : null;
      const turns = o.kind === "trade" ? "" : `${turnsTo(o.cost - (it && it.kind === o.kind && it.id === o.id ? c.prod : 0), y.p)} t`;
      const on = it && it.kind === o.kind && it.id === o.id;
      const title = o.ok ? def?.desc || "Convierte la producción en oro" : o.why;
      const isSug = sug && sug.kind === o.kind && sug.id === o.id;
      return `<button class="gp-opt${on ? " on" : ""}${isSug ? " sug" : ""}" data-act="build" data-kind="${o.kind}" data-id="${o.id}"${o.ok ? "" : " disabled"} title="${esc(title)}">
        <span>${o.kind === "trade" ? "💱" : def.emoji}</span><b>${isSug ? "⭐ " : ""}${esc(o.kind === "trade" ? "Comercio" : def.name)}</b><small>${o.kind === "trade" ? "→ 💰" : `${o.cost} ⚙️ · ${turns}`}${isSug ? " · sugerido" : ""}</small></button>`;
    }).join("")}</div>`;
  };
  return `${head}
    ${yieldRow(y)}
    <p class="gp-stats">🌾 ${Math.floor(c.food)}/${need} · ${esc(growTxt)}<br>🏠 vivienda ${hcap} · ${def} · ${FAITHS[c.faith]?.emoji || ""} ${esc(FAITHS[c.faith]?.name || "")}${c.faith && c.faith !== P.faith ? " <span class='gb-warn'>(otra fe que el Estado)</span>" : ""}</p>
    ${cur}
    ${group("unit", "Unidades")}${group("building", "Edificios")}${group("wonder", "Maravillas (en su sitio real)")}${group("trade", "Otros")}
    ${(() => {
      const rs = (G.routes || []).filter((r) => r.from === c.id || r.to === c.id);
      if (!rs.length) return "";
      return `<h4>Rutas comerciales</h4><p class="gm-note">${rs.map((r) => {
        const other = cityById(G, r.from === c.id ? r.to : r.from);
        return r.from === c.id ? `🧳 → ${esc(other?.name || "?")} (+${routeYield(G, M, r).g} 💰)` : `🧳 ← ${esc(other?.name || "?")} (+1 💰)`;
      }).join(" · ")}</p>`;
    })()}
    <h4>Construido</h4><p class="gm-note">${c.buildings.map((b) => `${BUILDINGS[b].emoji} ${esc(BUILDINGS[b].name)}`).join(" · ") || "Nada todavía"}${c.wonders.length ? `<br>${c.wonders.map((w) => `🏛️ ${esc(WONDERS[w].name)}`).join(" · ")}` : ""}</p>`;
}

function itemList(list, empty) {
  if (!list.length) return `<p class="gm-note">${esc(empty)}</p>`;
  return `<ul class="gp-news">${list.map((x) => `<li class="${x.tone || ""}"><span class="ic">${x.icon || "•"}</span><span class="tx">${esc(x.text)}</span>${x.cell != null ? `<button class="gm-mini" data-act="goto" data-cell="${x.cell}">Ver</button>` : ""}</li>`).join("")}</ul>`;
}
function summaryPanel(game) {
  const { G, M } = game;
  const P = G.players[0];
  const t = playerTotals(G, M, 0);
  const cs = playerCities(G, 0);
  const fc = forecast(G, M, 0);
  const rep = game.report || [];
  return `<div class="gp-head" style="--pc:${P.color};--pi:${P.ink}"><span class="gp-emoji">🏛️</span><div><h3>${esc(countryName(P))}</h3><span class="gp-sub">${yearLabel(G.turn)} · turno ${G.turn} · ${esc(GOVS[P.gov]?.name || "")} · puntos ${score(G, 0)}</span></div><button class="icon-btn gp-peek" data-act="peek" aria-label="Plegar o desplegar el panel">⇕</button></div>
    ${yieldRow({ food: t.food, p: t.p, g: t.net, s: t.s, c: t.c })}
    <p class="gp-stats">🏙️ ${cs.length} ciudades · 👥 ${cs.reduce((a, c) => a + c.pop, 0)} · ⚖️ ${Math.round(P.stability)} · ${FAITHS[P.faith]?.emoji || ""} · 🗺️ ${Math.round(territoryShare(G, M, 0) * 100)} %</p>
    ${rep.length ? `<h4>📰 Novedades de este turno</h4>${itemList(rep, "")}` : ""}
    <h4>🔮 Lo que viene</h4>${itemList(fc, "Nada especial a la vista.")}
    <div class="gp-actions"><button class="gm-btn" data-act="tech">🔬 Tecnologías <kbd>T</kbd></button><button class="gm-btn" data-act="gov">👑 Gobierno <kbd>G</kbd></button><button class="gm-btn" data-act="diplo">🤝 Diplomacia</button><button class="gm-btn" data-act="history">📖 Tu historia</button><button class="gm-btn" data-act="log">📜 Crónica</button><button class="gm-btn" data-act="menu-help">❓ Cómo se juega</button></div>`;
}

/** En qué está una unidad propia, en una frase. */
function unitStatus(G, M, u) {
  const U = UNITS[u.type];
  if (u.task) return `Trabajando: faltan ${u.task.left} turno${u.task.left === 1 ? "" : "s"}.`;
  if (u.goto && u.goto.length) return "En camino: seguirá su ruta al terminar el turno.";
  if (u.fortified) return "Fortificada: +4 de defensa. Toca una casilla para moverla.";
  if (u.sleep) return "Durmiendo: no pedirá órdenes. Muévela para despertarla.";
  if (u.mp <= 0) return "Ya ha actuado este turno.";
  if (U.worker) return "Elige abajo qué construir aquí, o toca otra casilla de tu territorio para moverla.";
  if (U.trade) return "Llévala junto a otra ciudad para abrir una ruta comercial.";
  if (u.type === "colono") return "Busca un buen sitio y funda una ciudad (B). Junto a ríos y costa crece más.";
  return `Le quedan ${fmt(u.mp)} movimientos. Toca una casilla iluminada para moverla, o un enemigo con borde rojo para atacar.`;
}

// --- barra de siguiente paso --------------------------------------------------------------------------------------
export function renderActionBar(game) {
  let bar = document.getElementById("game-act");
  if (!bar) {
    bar = el("div", "game-act panel");
    bar.id = "game-act";
    bar.addEventListener("click", (e) => {
      const t = e.target.closest("[data-act]");
      if (!t || t.disabled) return;
      game.action(t.dataset.act, t.dataset);
    });
    document.body.appendChild(bar);
  }
  document.getElementById("game-end")?.remove();
  const { G, M } = game;
  if (!G) { bar.hidden = true; return; }
  bar.hidden = false;
  const P = G.players[0];
  let msg = "", hint = "", btns = "";
  const pend = game.pendingAll();
  const nPend = pend.units.length + pend.cities.length + (pend.research ? 1 : 0);
  if (game.busy) {
    msg = `<span class="ga-spin"></span> Los demás pueblos están moviendo…`;
  } else if (G.over) {
    msg = "🏁 La partida ha terminado.";
    btns = `<button class="gm-btn gm-primary" data-act="history">📖 Tu historia</button>`;
  } else if (game.target) {
    const tg = game.target, u = game.selUnit;
    if (tg.attack && tg.pv) {
      const od = odds(tg.pv);
      msg = `<b class="odds ${od.tone}">⚔️ ${esc(od.label)}</b>`;
      hint = `${esc(UNITS[u.type].name)} contra ${esc(tg.pv.city ? tg.pv.city.name : UNITS[tg.pv.unit.type].name)}: daño causado ≈ ${tg.pv.toDef}${tg.pv.ranged ? " · a distancia, sin riesgo" : ` · recibido ≈ ${tg.pv.toAtt}`}${tg.pv.war ? "" : " · <b class='gb-warn'>declararás la guerra</b>"}`;
      btns = `<button class="gm-btn gm-danger" data-act="confirm">⚔️ Atacar</button><button class="gm-btn" data-act="cancel">✖</button>`;
    } else {
      const n = (tg.turns?.at(-1) ?? 0) + 1;
      msg = `👣 ${esc(UNITS[u.type].name)}: ${tg.attack ? "acercarse y atacar" : "mover aquí"}`;
      hint = `Llega en ${n} turno${n === 1 ? "" : "s"}${n > 1 ? " (seguirá la ruta sola)" : ""} · ${esc(terrainName(M, tg.cell))}`;
      btns = `<button class="gm-btn gm-primary" data-act="confirm">✔ Mover</button><button class="gm-btn" data-act="cancel">✖</button>`;
    }
  } else if (game.selUnit && game.selUnit.owner === 0 && pend.units.includes(game.selUnit)) {
    const u = game.selUnit;
    msg = `👉 ${esc(UNITS[u.type].name)}${pend.units.length > 1 ? ` <small>(${pend.units.indexOf(u) + 1} de ${pend.units.length} esperando)</small>` : ""}`;
    hint = esc(unitStatus(G, M, u));
    btns = `<button class="gm-btn" data-act="skip" title="Espacio">⏭️ Saltar</button>${pend.units.length > 1 ? `<button class="gm-btn" data-act="next" title="N">👉 Siguiente</button>` : ""}`;
  } else if (pend.research) {
    msg = "🔬 Elige qué investigar";
    const sg = game.suggestResearch?.();
    hint = sg ? `Sugerencia: ${esc(TECHS[sg].name)}` : "";
    btns = `<button class="gm-btn gm-primary" data-act="tech">Elegir</button>`;
  } else if (pend.cities.length) {
    const c = pend.cities[0];
    msg = `⚙️ ${esc(c.name)} no está construyendo nada`;
    const sg = game.suggestBuild?.(c);
    hint = sg ? `Sugerencia: ${esc(itemName(sg))}` : "";
    btns = `<button class="gm-btn gm-primary" data-act="pending">Elegir producción</button>`;
  } else if (pend.units.length) {
    msg = `👉 ${pend.units.length} unidad${pend.units.length === 1 ? "" : "es"} esperan órdenes`;
    hint = "Puedes moverlas, fortificarlas (F) o saltar su turno (Espacio).";
    btns = `<button class="gm-btn gm-primary" data-act="next">Ir a la siguiente</button>`;
  } else {
    msg = "✅ Todo listo";
    hint = "Termina el turno para que el tiempo avance.";
  }
  const rm = rumors(G, M);
  const chips = [
    ...rm.map((r) => `<button class="ga-chip bad" data-act="goto" data-cell="${r.cell}" title="${esc(r.inv.text)}">🚩 ${esc(r.inv.short)} en ~${r.turns} t</button>`),
    (game.report || []).length ? `<button class="ga-chip" data-act="summary">📰 ${game.report.length} novedad${game.report.length === 1 ? "" : "es"}</button>` : "",
  ].join("");
  const endLbl = nPend ? `Terminar turno <small>(quedan ${nPend})</small>` : "Terminar turno";
  bar.innerHTML = `<div class="ga-main"><div class="ga-msg">${msg}</div>${hint ? `<div class="ga-hint">${hint}</div>` : ""}${chips ? `<div class="ga-chips">${chips}</div>` : ""}</div>
    <div class="ga-btns">${btns}${game.busy || G.over ? "" : `<button class="gm-btn ga-end${nPend ? "" : " ready"}" data-act="endturn" title="Intro">${endLbl} ▶</button>`}</div>`;
}

// --- consejos (la primera vez que pasa algo) ----------------------------------------------------------------------
const TIPS = {
  start: "Tus colonos pueden fundar la capital aquí mismo: pulsa «Fundar ciudad» (o B). Junto a un río, un lago o la costa, las ciudades crecen más.",
  city: "Ahora elige qué construye tu ciudad. ⭐ marca la sugerencia: al principio, unos guerreros para defenderla y luego colonos para expandirte.",
  research: "Elige qué investigar: cada tecnología desbloquea unidades, edificios o gobiernos. ⭐ marca una buena opción.",
  move: "Toca una casilla para ver el camino y en cuántos turnos llega; toca otra vez (o pulsa «Mover») para confirmar. Con ratón, un clic basta. Las casillas iluminadas son las que alcanza este turno.",
  enemy: "Las fichas con borde rojo son enemigos en guerra contigo; las casillas marcadas en rojo, los que puedes atacar ya. Antes de atacar verás el resultado probable.",
  endturn: "No queda nada por hacer: pulsa «Terminar turno» (o Intro). Luego verás las novedades del turno en el panel.",
  report: "Estas son las novedades del turno y lo que viene después. Pulsa «Ver» para ir a cada sitio del mapa.",
  event: "Las decisiones cambian tu país: cada opción muestra sus efectos (en verde lo bueno, en rojo lo malo) y la identidad que aporta.",
  rumor: "Se acerca una invasión histórica (🚩 arriba). Refuerza las ciudades cercanas con murallas y tropas: si toman una ciudad, se quedarán para siempre.",
  worker: "Los obreros mejoran las casillas de tu territorio: granjas para crecer, minas para producir, caminos para moverte más rápido. Elige abajo qué construir.",
  trade: "Lleva a los mercaderes junto a otra ciudad (tuya o de un vecino en paz) para abrir una ruta comercial. Las rutas con extranjeros rinden más.",
};
const TIP_STORE = "espanaciv.hispania.tips";
function tipsSeen() { try { return JSON.parse(localStorage.getItem(TIP_STORE) || "{}"); } catch { return {}; } }
export function tip(game, id) {
  const seen = tipsSeen();
  if (seen.off || seen[id] || !TIPS[id] || document.getElementById("game-tip")) return;
  seen[id] = 1;
  try { localStorage.setItem(TIP_STORE, JSON.stringify(seen)); } catch { /* nada */ }
  const box = el("div", "game-tip panel", `<span class="gt-ico">💡</span><p>${esc(TIPS[id])}</p>
    <div class="gm-row gm-end"><button class="gm-btn gm-mini" data-off>No más consejos</button><button class="gm-btn gm-primary gm-mini" data-ok>Entendido</button></div>`);
  box.id = "game-tip";
  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-off]")) { const s2 = tipsSeen(); s2.off = 1; try { localStorage.setItem(TIP_STORE, JSON.stringify(s2)); } catch { /* nada */ } box.remove(); }
    if (e.target.closest("[data-ok]")) box.remove();
  });
  document.body.appendChild(box);
}
export function resetTips() { try { localStorage.removeItem(TIP_STORE); } catch { /* nada */ } }

// --- tecnologías ------------------------------------------------------------------------------------------------
export function showTech(game) {
  const { G, M } = game;
  const P = G.players[0];
  const sci = playerTotals(G, M, 0).s;
  const av = new Set(availableTechs(P));
  const body = el("div", "gm-tech");
  const goal = P.researchGoal;
  const sugT = game.suggestResearch?.();
  body.innerHTML = `<p class="gm-note">Ciencia: <b>${fmt(sci)}</b> 🔬 por turno · acumulada ${Math.floor(P.science)}. Pulsa una tecnología disponible para investigarla, o una bloqueada para fijarla como objetivo (se irán investigando sus requisitos).</p>
    <div class="gt-cols" style="--n:${ERAS.length}">${ERAS.map((era, e) => `<div class="gt-col"><h4>${esc(era)}</h4>${Object.entries(TECHS).filter(([id, T]) => T.era === e && T.cost > 0).map(([id, T]) => {
      const known = P.techs.includes(id);
      const state = known ? "known" : P.research === id ? "cur" : av.has(id) ? "av" : "lock";
      const cost = techCost(P, id);
      const turns = known ? "" : turnsTo(cost - (P.research === id ? P.science : 0), sci);
      const un = unlocksOf(id);
      return `<button class="gt-tech ${state}${goal === id ? " goal" : ""}${sugT === id && state === "av" ? " sug" : ""}" data-tech="${id}" ${known ? "disabled" : ""} title="${esc([T.desc, un.map((x) => `${x.emoji} ${x.name}: ${x.desc}`).join("\n"), T.req.length ? `Requiere: ${T.req.map((r) => TECHS[r].name).join(", ")}` : ""].filter(Boolean).join("\n"))}">
        <b>${sugT === id && state === "av" ? "⭐ " : ""}${esc(T.name)}</b><small>${known ? "✓ conocida" : `${cost} 🔬 · ${turns === Infinity ? "—" : `${turns} t`}`}${sugT === id && state === "av" ? " · sugerida" : ""}</small>
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
    if (Q.invader && Q.alive) return `<div class="gd-row"><span class="gd-name"><i style="background:${Q.color}"></i>${esc(Q.name)}</span><span>${Q.rebel ? "Rebeldes" : "Invasores"}: no negocian hasta tener una ciudad.</span><span class="gd-st war">⚔️ En guerra</span></div>`;
    if (Q.invader && !Q.alive) return "";
    if (!G.players[0].met[Q.idx]) return `<div class="gd-row unknown"><span class="gd-name"><i style="background:#555"></i>Pueblo desconocido</span><span class="muted">Explora para encontrarlo.</span></div>`;
    const war = atWar(G, 0, Q.idx);
    const them = military(G, Q.idx);
    const rel = them > me * 1.3 ? "más fuerte que el tuyo" : them < me * 0.77 ? "más débil que el tuyo" : "parecido al tuyo";
    const truce = (G.players[0].peaceUntil?.[Q.idx] ?? 0) > G.turn;
    return `<div class="gd-row${Q.alive ? "" : " dead"}">
      <span class="gd-name"><i style="background:${Q.color}"></i>${esc(countryName(Q))}</span>
      <span>${Q.alive ? `${playerCities(G, Q.idx).length} ciudades · ${score(G, Q.idx)} puntos · ejército ${rel} · ${FAITHS[Q.faith]?.emoji || ""}` : Q.annexedBy != null ? `Unidos a ${esc(countryName(G.players[Q.annexedBy]))}` : "Desaparecidos"}</span>
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
    <button class="gm-btn gp-wide" data-m="history">📖 Tu España alternativa</button>
    <button class="gm-btn gp-wide" data-m="save">💾 Guardar ahora <small class="muted">(se guarda sola cada turno)</small></button>
    <button class="gm-btn gp-wide" data-m="new">🆕 Nueva partida</button>
    <button class="gm-btn gp-wide" data-m="help">❓ Cómo se juega</button>
    <button class="gm-btn gp-wide" data-m="tips">💡 Volver a ver los consejos</button>
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
      <li><b>La barra de abajo</b> (arriba en el móvil) te dice siempre qué toca: elegir investigación, elegir qué construye una ciudad o dar órdenes a una unidad, con un botón para hacerlo. Cuando todo está listo, «Terminar turno» (o Intro).</li>
      <li><b>Novedades y lo que viene</b>: al pasar el turno, el panel lista lo que ha pasado (con «Ver» para ir al sitio) y lo que va a pasar: qué ciudad crece o termina algo, cuándo descubrirás la siguiente tecnología y los rumores de invasión (🚩) unos turnos antes de que llegue.</li>
      <li><b>Unidades</b>: tócalas o púlsalas para elegirlas (las tuyas tienen borde blanco y un anillo dorado si esperan órdenes; las enemigas en guerra, borde rojo). Luego toca una casilla: verás la ruta y en qué turno llega. Con ratón, un clic mueve; en el móvil, el primer toque enseña y el segundo (o «✔ Mover») confirma. Montañas, colinas, bosques y humedales cuestan más; las cumbres no se cruzan.</li>
      <li><b>Sugerencias</b>: ⭐ marca lo que te conviene construir o investigar (lo que haría un buen gobernante en tu lugar).</li>
      <li><b>Ciudades</b>: los colonos fundan con <kbd>B</kbd> a 4 casillas o más de otra ciudad. Junto a un río, un lago o la costa tienen más vivienda. Pulsa el nombre de una ciudad para elegir qué construye.</li>
      <li><b>Rendimientos</b>: 🌾 hace crecer la ciudad, ⚙️ construye, 💰 paga las soldadas y compra, 🔬 investiga y 🎭 amplía las fronteras.</li>
      <li><b>Maravillas</b>: cada una solo se puede levantar en una ciudad cuyo territorio incluya su sitio real (Atapuerca en Burgos, la Mezquita en Córdoba…).</li>
      <li><b>Combate</b>: pulsa un enemigo marcado en rojo. Antes verás el resultado probable en palabras («Ventaja clara», «Igualado», «Tu unidad morirá») y el daño previsto. Colinas, montañas, bosques y fortificarse (<kbd>F</kbd>) ayudan a defender. Las ciudades se toman bajando su vida a 0 y entrando cuerpo a cuerpo.</li>
      <li><b>Mar</b>: con Navegación las unidades embarcan por la costa (Baleares, Canarias); con Cartografía, por el mar abierto.</li>
      <li><b>Obreros</b>: construyen granjas, minas, aserraderos, viñedos y olivares, dehesas y caminos en tu territorio. Por los caminos se va al doble de rápido (al cuádruple con el ferrocarril).</li>
      <li><b>Comercio</b>: los mercaderes abren rutas desde su ciudad de origen hasta otra ciudad tuya o de un vecino en paz. Las rutas con extranjeros rinden más y traen ciencia; una guerra las corta.</li>
      <li><b>Marina</b>: galeras, carabelas, galeones, navíos, acorazados, submarinos y fragatas solo navegan; las que tienen cañones bombardean costas y barcos a distancia.</li>
      <li><b>Invasiones</b>: llegan cuando llegaron en la historia (celtas, Cartago, Roma, germanos, omeyas, vikingos, almorávides, Napoleón…) por los pasos del Pirineo, el Estrecho o la costa. Si toman una ciudad, se quedan como un pueblo nuevo; si aguantas, la historia cambia.</li>
      <li><b>Decisiones</b>: a lo largo de los siglos tendrás que elegir (fenicios, una nueva fe, fueros, la imprenta, una constitución, Europa, la energía…). Cada elección deja huella en tu país y en su crónica.</li>
      <li><b>Gobierno y estabilidad</b> (<kbd>G</kbd>): cada régimen tiene ventajas. La estabilidad baja con las guerras y con un imperio demasiado grande; por debajo de 20 hay revueltas.</li>
      <li><b>Teclas</b>: <kbd>Intro</kbd> turno · <kbd>Espacio</kbd> saltar · <kbd>N</kbd> siguiente · <kbd>F</kbd> fortificar · <kbd>B</kbd> fundar · <kbd>T</kbd> tecnologías · <kbd>G</kbd> gobierno · <kbd>Mayús+D</kbd> diplomacia · <kbd>Esc</kbd> soltar · flechas/WASD mover el mapa.</li>
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
    .filter((P) => !P.invader).map((P) => `<tr><td><i class="gd-dot" style="background:${P.color}"></i>${esc(countryName(P))}${P.alive ? "" : " †"}</td><td>${playerCities(G, P.idx).length}</td><td>${P.techs.length}</td><td><b>${score(G, P.idx)}</b></td></tr>`).join("");
  modal(game, {
    title: win ? "🏆 ¡Victoria!" : o.how === "derrota" ? "☠️ Derrota" : "Fin de la partida", cls: "gm-mid", closable: true,
    body: `<p class="gm-lead">${win ? `Los ${esc(W.name)} ganan ${how} en el ${yearLabel(o.turn)}.` : o.how === "derrota" ? "Tu pueblo ha desaparecido de la historia." : `Los ${esc(W?.name || "")} ganan ${how} en el ${yearLabel(o.turn)}.`}</p>
      <table class="gm-table"><tr><th>Pueblo</th><th>Ciudades</th><th>Tecnologías</th><th>Puntos</th></tr>${rows}</table>
      ${historyHtml(game)}
      <div class="gm-row gm-end"><button class="gm-btn" data-close>Ver el mapa</button><button class="gm-btn gm-primary" data-new>Nueva partida</button></div>`,
  }).querySelector("[data-new]").addEventListener("click", () => { closeModal(game); game.action("menu-new"); });
}

// --- tooltip ----------------------------------------------------------------------------------------------------
export function tooltip(game, cell) {
  const { G, M } = game;
  if (!G || cell < 0) return null;
  if (!G.explored[cell]) {
    const pp = game.pathPreview && game.pathPreview.target === cell ? game.pathPreview : null;
    return `<b>Tierra inexplorada</b>${pp ? `<br>👣 Llega en ${pp.turns.at(-1) + 1} turno${pp.turns.at(-1) ? "s" : ""}` : ""}`;
  }
  const lines = [];
  const k = M.kind[cell];
  if (k === K.VOID) return `<b>Tierras lejanas</b><br><span class="muted">Fuera del juego</span>`;
  const y = tileYield(G, M, 0, cell);
  const yl = ["f", "p", "g", "s", "c"].filter((q) => y[q]).map((q) => `${YIELD_ICON[q]}${y[q]}`).join(" ");
  lines.push(`<b>${esc(terrainName(M, cell))}</b>${M.river[cell] ? " · río" : ""}`);
  if (yl) lines.push(yl);
  const r = M.res[cell];
  if (r) lines.push(`Recurso: ${RESOURCES[r].emoji} ${esc(RESOURCES[r].name)}`);
  if (G.improv[cell]) lines.push(`${IMPROVEMENTS[G.improv[cell]]?.emoji} ${esc(IMPROVEMENTS[G.improv[cell]]?.name || "")}`);
  if (G.road[cell]) lines.push(`🛤️ Camino`);
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
      const od = odds(pv);
      lines.push(`<hr>${pv.war ? "" : "<b class='gb-warn'>Hay que declarar la guerra.</b><br>"}<b class="odds ${od.tone}">⚔️ ${esc(od.label)}</b><br>Tu fuerza <b>${pv.A}</b> contra <b>${pv.D}</b>`);
      lines.push(`Daño causado ≈ <b>${pv.toDef}</b> (le quedan ${Math.max(0, Math.round(pv.defHp - pv.toDef))})${pv.ranged ? " · a distancia: no recibes daño" : ` · recibido ≈ <b>${pv.toAtt}</b>`}`);
    } else if (game.pathPreview && game.pathPreview.target === cell) {
      const t = game.pathPreview.turns.at(-1) + 1;
      lines.push(`<hr>👣 Llega en ${t} turno${t > 1 ? "s" : ""}`);
    } else if (cell !== su.cell && !game.pathPreview) lines.push(`<hr><span class="muted">No puede llegar ahí.</span>`);
  }
  return lines.join("<br>");
}


// --- decisiones, avisos, gobierno y crónica -----------------------------------------------------------------------
const pctTxt = (v) => `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)} %`;
const num = (v) => `${v > 0 ? "+" : "−"}${fmt(Math.abs(v))}`;
const MOD_TXT = {
  pPct: (v) => `${pctTxt(v)} ⚙️`, gPct: (v) => `${pctTxt(v)} 💰`, sPct: (v) => `${pctTxt(v)} 🔬`, cPct: (v) => `${pctTxt(v)} 🎭`,
  capP: (v) => `${num(v)} ⚙️ en la capital`, att: (v) => `${num(v)} ⚔️ al atacar`, def: (v) => `${num(v)} 🛡️ en tus ciudades`,
  defPct: (v) => `${pctTxt(v)} de defensa en tus ciudades`, cityF: (v) => `${num(v)} 🌾 por ciudad`, cityS: (v) => `${num(v)} 🔬 por ciudad`,
  cityC: (v) => `${num(v)} 🎭 por ciudad`, cityG: (v) => `${num(v)} 💰 por ciudad`, coastG: (v) => `${num(v)} 💰 por ciudad costera`,
  stab: (v) => `${num(v)} de estabilidad`,
  routes: (v) => `${num(v)} ruta${Math.abs(v) === 1 ? "" : "s"} comercial${Math.abs(v) === 1 ? "" : "es"} máxima${Math.abs(v) === 1 ? "" : "s"}`,
  drought: (v) => (v > 0 ? "la sequía te golpeará más" : "resistirás mejor la sequía"),
  sprawl: (v) => (v < 0 ? `${Math.round(-v * 100)} % menos de penalización por extensión` : `${Math.round(v * 100)} % más de penalización por extensión`),
};
/** Efectos de una opción, en palabras (calculados con la economía actual del jugador). */
export function effectChips(game, eff, ctx = {}) {
  const { G, M } = game;
  const P = G.players[0];
  const out = [];
  if (!eff) return out;
  if (eff.goldT) out.push({ t: `${eff.goldT > 0 ? "+" : "−"}${turnsOf(G, M, 0, "g", Math.abs(eff.goldT))} 💰`, good: eff.goldT > 0 });
  if (eff.sciT) out.push({ t: `+${turnsOf(G, M, 0, "s", eff.sciT)} 🔬`, good: true });
  if (eff.cultT) out.push({ t: `+${turnsOf(G, M, 0, "c", eff.cultT)} 🎭`, good: true });
  if (eff.tech) out.push({ t: `Descubres ${TECHS[eff.tech].name}`, good: true });
  if (eff.techPart) out.push({ t: `Mitad de coste: ${[].concat(eff.techPart).filter((t) => !P.techs.includes(t)).map((t) => TECHS[t].name).join(", ") || "(ya conocida)"}`, good: true });
  if (eff.stab) out.push({ t: `${num(eff.stab)} de estabilidad`, good: eff.stab > 0 });
  for (const [k, v] of Object.entries(eff.mods || {})) if (MOD_TXT[k]) out.push({ t: `${MOD_TXT[k](v)} (permanente)`, good: k === "drought" || k === "sprawl" ? v < 0 : v > 0 });
  if (eff.temp) for (const [k, v] of Object.entries(eff.temp.mods)) if (MOD_TXT[k]) out.push({ t: `${MOD_TXT[k](v)} durante ${eff.temp.turns} turnos`, good: v > 0 });
  if (eff.units) for (const [spec, n] of eff.units) {
    const cls = spec.startsWith("best:") ? { melee: "infantería", montada: "caballería", ranged: "tropas a distancia", asedio: "asedio" }[spec.slice(5)] : UNITS[spec]?.name;
    out.push({ t: `Recibes ${n} unidad${n > 1 ? "es" : ""} de ${cls}`, good: true });
  }
  if (eff.plague) out.push({ t: `Pierdes el ${Math.round(eff.plague * 100)} % de la población`, good: false });
  if (eff.droughtHit) out.push({ t: "Pierdes población por la sequía", good: false });
  if (eff.gov) {
    const g = [].concat(eff.gov).find((x) => availableGovs(P).includes(x));
    out.push({ t: g ? `Pasas a ${GOVS[g].name.toLowerCase()}` : `Cambio de régimen (cuando conozcas ${[].concat(eff.gov).map((x) => GOVS[x].name.toLowerCase()).join(" o ")})`, good: null });
  }
  if (eff.faith) out.push({ t: `Fe oficial: ${FAITHS[eff.faith].name}`, good: null });
  if (eff.convert) out.push({ t: "Todas tus ciudades adoptan tu fe", good: null });
  if (eff.peaceWith) out.push({ t: `Paz con ${INVASIONS.find((i) => i.id === eff.peaceWith)?.short || "los invasores"}`, good: true });
  if (eff.peaceAll) out.push({ t: "Paz con los vecinos en guerra contigo", good: true });
  if (eff.warNeighbor) out.push({ t: `Guerra con los ${ctx.neighbor != null ? G.players[ctx.neighbor].name : "vecinos"}`, good: false });
  if (eff.union) out.push({ t: `Los ${ctx.neighbor != null ? G.players[ctx.neighbor].name : "vecinos"} se unen a tu país`, good: true });
  if (eff.rebels) out.push({ t: `Revuelta armada en ${eff.rebels} ciudad${eff.rebels > 1 ? "es" : ""}`, good: false });
  if (eff.pop) out.push({ t: `+${eff.pop} de población en la capital`, good: true });
  if (eff.building) out.push({ t: `Gratis en la capital: ${BUILDINGS[eff.building]?.name}`, good: true });
  if (eff.roads) out.push({ t: "Caminos de la capital a todas tus ciudades", good: true });
  if (eff.tag) out.push({ t: `Identidad: ${TAGS[eff.tag] || eff.tag}`, good: null, tag: true });
  return out;
}
/** Muestra una decisión y espera la elección: {choice, name, keep}. `o` = {ev, ctx, text} de sim.nextEvent. */
export function decide(game, o) {
  const { G, M } = game;
  const P = G.players[0];
  const ev = o.ev;
  return new Promise((resolve) => {
    const body = el("div", "gm-event");
    const done = (r) => { closeModal(game); resolve(r); };
    if (ev.name) {
      const sug = nameSuggestions(G, M, P);
      body.innerHTML = `<p class="gm-year">${yearLabel(G.turn)}</p><p class="gm-lead">${esc(o.text)}</p>
        <div class="gm-names">${sug.map((n) => `<button class="gm-btn" data-name="${esc(n)}">${esc(n)}</button>`).join("")}</div>
        <label class="gm-field">O escribe el tuyo <input type="text" maxlength="48" placeholder="${esc(sug[0] || "")}" data-input></label>
        <div class="gm-row gm-end">${ev.keepable && P.country ? `<button class="gm-btn" data-keep>Conservar «${esc(P.country)}»</button>` : ""}<button class="gm-btn gm-primary" data-ok>Así se llamará</button></div>`;
      const inp = body.querySelector("[data-input]");
      body.addEventListener("click", (e) => {
        const n = e.target.closest("[data-name]")?.dataset.name;
        if (n) inp.value = n;
        if (e.target.closest("[data-keep]")) done({ choice: 0, keep: true });
        if (e.target.closest("[data-ok]")) done({ choice: 0, name: inp.value.trim() || sug[0] });
      });
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); done({ choice: 0, name: inp.value.trim() || sug[0] }); } });
    } else {
      body.innerHTML = `<p class="gm-year">${yearLabel(G.turn)}${ev.crisis ? " · <b class='gb-warn'>Crisis</b>" : ev.repeat ? " · suceso" : ""}</p><p class="gm-lead">${esc(o.text)}</p>
        <div class="gm-choices">${ev.choices.map((c, i) => {
          const ok = canAfford(G, M, 0, c.eff);
          const chips = effectChips(game, c.eff, o.ctx);
          return `<button class="gm-choice" data-c="${i}"${ok ? "" : " disabled title='No tienes oro suficiente'"}><b>${esc(c.label)}</b>
            <span class="gm-chips">${chips.map((x) => `<i class="${x.tag ? "tag" : x.good === true ? "good" : x.good === false ? "bad" : ""}">${esc(x.t)}</i>`).join("")}</span></button>`;
        }).join("")}</div>`;
      body.addEventListener("click", (e) => {
        const b = e.target.closest("[data-c]");
        if (!b || b.disabled) return;
        done({ choice: +b.dataset.c });
      });
    }
    modal(game, { title: `${ev.crisis ? "⚠️" : ev.name ? "🏷️" : "📜"} ${esc(ev.title)}`, body, cls: "gm-mid gm-decision", closable: false });
  });
}
/** Aviso de invasión o revuelta. */
export function alertBox(game, a) {
  return new Promise((resolve) => {
    const body = el("div", "gm-alert", `<p class="gm-year">${yearLabel(game.G.turn)}</p><p class="gm-lead">${esc(a.text)}</p>
      ${a.n ? `<p class="gm-note">Unos ${a.n} ejércitos han cruzado la frontera. Están en guerra con todos los pueblos de la Península.</p>` : ""}
      <div class="gm-row gm-end"><button class="gm-btn" data-see>Ver en el mapa</button><button class="gm-btn gm-primary" data-ok>Entendido</button></div>`);
    body.addEventListener("click", (e) => {
      if (e.target.closest("[data-see]")) { closeModal(game); game.focusCell(a.cell, 0.8); resolve(); }
      if (e.target.closest("[data-ok]")) { closeModal(game); resolve(); }
    });
    modal(game, { title: `${a.kind === "revolt" ? "🔥" : "🚩"} ${esc(a.title)}`, body, cls: "gm-mid gm-invasion", closable: false });
  });
}
export function showGov(game) {
  const { G } = game;
  const P = G.players[0];
  const av = new Set(availableGovs(P));
  const wait = Math.max(0, (P.govTurn || 0) + GOV_COOLDOWN - G.turn);
  const body = el("div", "gm-gov");
  body.innerHTML = `<p class="gm-note">Cambiar de régimen cuesta 10 de estabilidad${wait ? ` y aún tienes que esperar ${wait} turno${wait === 1 ? "" : "s"}` : ""}. Las decisiones de la historia también pueden cambiarlo.</p>
    <div class="gv-list">${Object.entries(GOVS).map(([id, g]) => {
      const on = P.gov === id, ok = av.has(id);
      return `<button class="gv-gov${on ? " on" : ""}" data-gov="${id}"${!ok || on || wait ? " disabled" : ""}>
        <b>${esc(g.name)}</b><small>${esc(g.desc)}</small>${g.tech && !ok ? `<small class="muted">Requiere ${esc(TECHS[g.tech].name)}</small>` : ""}${on ? "<small class='gv-cur'>Actual</small>" : ""}</button>`;
    }).join("")}</div>`;
  body.addEventListener("click", (e) => {
    const id = e.target.closest("[data-gov]")?.dataset.gov;
    if (id) { closeModal(game); game.changeGov(id); }
  });
  modal(game, { title: "Gobierno", body, cls: "gm-mid" });
}
function historyHtml(game) {
  const { G, M } = game;
  const A = altSpain(G, M, 0);
  const P = G.players[0];
  const tl = A.chron.slice(-60);
  return `<div class="gh-head" style="--pc:${P.color}"><span class="gh-flag"><i></i><i></i><i></i></span><div><h3>${esc(A.name)}</h3>
      <span class="gp-sub">${esc(A.gov || "")} · ${esc(A.faith || "")} · ${A.cities} ciudades · ${Math.round(A.share * 100)} % de la Península · ${A.pop} de población${A.capital ? ` · capital: ${esc(A.capital)}` : ""}</span></div></div>
    ${A.tags.length ? `<p class="gh-tags">${A.tags.slice(0, 8).map((t) => `<span>${esc(t)}</span>`).join("")}</p>` : ""}
    <div class="gh-story">${A.story.map((x) => `<p>${esc(x)}</p>`).join("")}</div>
    <h4>Crónica</h4><ol class="gh-tl">${tl.map((e) => `<li><small>${esc(e.year)}</small> ${esc(e.text)}</li>`).join("")}</ol>`;
}
export function showHistory(game) {
  modal(game, { title: "Tu España alternativa", body: historyHtml(game), cls: "gm-mid gm-history" });
}
