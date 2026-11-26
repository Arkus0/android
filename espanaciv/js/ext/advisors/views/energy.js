// Consejero de Energía: las centrales eléctricas dibujadas en el mapa (España: GPPD del WRI; sin minas ni yacimientos).
import { esc, fin } from "../core/util.js";
import { fmtValue, mw, int, count3 } from "../core/fmt.js";
import { barList, shareBar, stackedBars, sizeLegend } from "../core/charts.js";
import { createTable } from "../core/table.js";
import { section, tiles, chips, sourcesHtml } from "../core/view.js";
import { frameBox, focusPoint } from "../core/frame.js";
import { glyph } from "../../../ui/icon.js";

const GROUPS = [
  { id: "thermal", label: "Térmicas y nucleares", types: ["nuclear", "coal_plant", "gas_plant", "oil_plant", "geothermal"] },
  { id: "water", label: "Agua", types: ["hydro", "pumped_storage"] },
  { id: "renew", label: "Viento y sol", types: ["wind", "solar", "battery"] },
];
const RENEW = ["hydro", "wind", "solar"];

export function mount(ctx) {
  const { app, data, el, link } = ctx;
  const res = app.data.resources;
  if (!res) {
    el.innerHTML = `<p class="adv-empty pad">Falta resources.json, así que no hay nada que enseñar.</p>`;
    return {};
  }
  const types = res.types;
  const typeById = new Map(types.map((t) => [t.id, t]));
  const items = res.items.map((it, i) => ({ ...it, idx: i, key: String(i) }));
  const nat = res.summary?.national || {};
  const isMW = (t) => typeById.get(t)?.unit === "MW";
  const mwTypes = types.filter((t) => t.unit === "MW");
  const states = app.data.states || [];
  const stateIdx = new Map(states.map((s, i) => [s.abbr, i]));
  // Draw groups in GROUPS order, plus any type the groups do not list.
  const listed = new Set(GROUPS.flatMap((g) => g.types));
  const groups = GROUPS.map((g) => ({ ...g, types: g.types.filter((t) => typeById.has(t)) })).filter((g) => g.types.length);
  const extra = types.filter((t) => !listed.has(t.id)).map((t) => t.id);
  if (extra.length) groups.push({ id: "other", label: "Otras", types: extra });

  const st = { on: new Set(types.map((t) => t.id)), min: 0, state: null };
  ctx.setShowResources(true);

  // --- headline -------------------------------------------------------------------------------------------------
  const totalMW = mwTypes.reduce((a, t) => a + (nat[t.id]?.value || 0), 0);
  const sites = mwTypes.reduce((a, t) => a + (nat[t.id]?.count || 0), 0);
  const top = el.appendChild(document.createElement("div"));
  top.innerHTML = tiles([
    { label: "Potencia dibujada", value: mw(totalMW), sub: `${int(sites)} centrales` },
    { label: "Renovable", value: totalMW ? `${Math.round(100 * RENEW.reduce((a, t) => a + (nat[t]?.value || 0), 0) / totalMW)} %` : "–", sub: "agua, viento y sol (sin bombeo)" },
    { label: "Nucleares", value: int(nat.nuclear?.count || 0), sub: nat.nuclear?.value ? mw(nat.nuclear.value) : "" },
  ]) + `<p class="adv-callout">${esc(res.summary?.note || "Solo se suman las centrales dibujadas.")}</p>`;

  // --- national mix ---------------------------------------------------------------------------------------------
  const mixBody = section(el, { title: "El mix eléctrico", kicker: "Centrales dibujadas", note: "Potencia de las centrales del mapa, por tipo. Las pequeñas no se dibujan, así que <b>no</b> es la potencia total del país: enseña dónde están las grandes y con qué funcionan." });
  const mixParts = mwTypes.map((t) => ({ key: t.id, label: t.name, value: nat[t.id]?.value || 0, color: t.color, text: mw(nat[t.id]?.value), icon: glyph(t, 14) })).sort((a, b) => b.value - a.value);
  const mixHover = (p) => {
    if (!p) { link.hover(null); bubbles.setSelected(null); return; }
    const set = new Set(visible().filter((it) => it.type === p.key).map((it) => it.idx));
    link.hover({ resources: set, dimOthers: true });
    bubbles.setSelected(new Set(visible().filter((it) => it.type === p.key).map((it) => it.key)));
  };
  const solo = (typeId) => {
    const only = st.on.size === 1 && st.on.has(typeId);
    st.on = only ? new Set(types.map((t) => t.id)) : new Set([typeId]);
    typeChips.set(st.on);
    apply();
  };
  shareBar(mixBody, { parts: mixParts, legend: false, onHover: mixHover, onClick: (p) => solo(p.key) });
  const mixBars = barList(mixBody, {
    rows: mixParts.map((p) => ({ ...p, sub: `${int(nat[p.key]?.count || 0)} centrales` })),
    onHover: mixHover, onClick: (p) => solo(p.key), ariaLabel: "Potencia dibujada por tipo",
  });

  // --- filters --------------------------------------------------------------------------------------------------
  const fBody = section(el, { title: "Filtrar el mapa", note: "Enciende o apaga tipos (Alt+clic para ver solo uno). El mapa atenúa el terreno y dibuja cada central como un círculo del tamaño de su potencia." });
  const typeChips = chips(fBody, {
    label: "Tipos de recurso",
    items: groups.flatMap((g) => g.types.map((t) => {
      const ty = typeById.get(t);
      return { key: t, label: ty.name, color: ty.color, icon: glyph(ty, 13), count: nat[t]?.count ?? null };
    })),
    onChange: (on) => { st.on = on; apply(); },
  });
  const quick = document.createElement("div");
  quick.className = "adv-row";
  quick.innerHTML = groups.map((g) => `<button type="button" class="adv-mini" data-g="${g.id}">${esc(g.label)}</button>`).join("") +
    `<button type="button" class="adv-mini" data-g="all">Todas</button><button type="button" class="adv-mini" data-g="none">Ninguna</button>`;
  fBody.appendChild(quick);
  quick.addEventListener("click", (e) => {
    const g = e.target.closest("[data-g]")?.dataset.g;
    if (!g) return;
    st.on = g === "all" ? new Set(types.map((t) => t.id)) : g === "none" ? new Set() : new Set(groups.find((x) => x.id === g).types);
    typeChips.set(st.on);
    apply();
  });
  const slider = document.createElement("div");
  slider.className = "adv-slider";
  slider.innerHTML = `<label><span>Tamaño mínimo</span><input type="range" min="0" max="3000" step="100" value="0" aria-label="Potencia mínima de la central en MW"><b>Cualquiera</b></label>
    <p class="adv-note adv-min-note" hidden>Los recursos que no se miden en MW se ocultan mientras hay un mínimo.</p>`;
  fBody.appendChild(slider);
  const range = slider.querySelector("input");
  range.addEventListener("input", () => {
    st.min = +range.value;
    slider.querySelector("b").textContent = st.min ? `≥ ${int(st.min)} MW` : "Cualquiera";
    slider.querySelector(".adv-min-note").hidden = !st.min;
    apply();
  });
  const stateChip = document.createElement("div");
  stateChip.className = "adv-row adv-filterbar";
  fBody.appendChild(stateChip);
  stateChip.addEventListener("click", (e) => { if (e.target.closest("[data-clear-state]")) setState(null); });
  const legendBox = document.createElement("div");
  fBody.appendChild(legendBox);

  // --- top sites ------------------------------------------------------------------------------------------------
  const tBody = section(el, { title: "Centrales", note: "Todas las centrales dibujadas que pasan los filtros. Pasa por una para encontrarla en el mapa; púlsala para volar allí." });
  const sizeSort = (r) => (isMW(r.type) && fin(r.value) ? r.value : null);
  const table = createTable(tBody, {
    caption: "Centrales del mapa",
    search: "Buscar centrales, provincias, empresas",
    searchText: (r) => `${r.name} ${r.state || ""} ${r.detail || ""} ${typeById.get(r.type)?.name || ""}`,
    rank: true,
    columns: [
      { key: "name", label: "Central", align: "l", width: "minmax(0,1.7fr)", value: (r) => r.name, html: (r) => `<span class="ic">${glyph(typeById.get(r.type), 13)}</span>${esc(r.name)}` },
      { key: "type", label: "Tipo", align: "l", width: "minmax(0,1fr)", value: (r) => typeById.get(r.type)?.name, text: (r) => typeById.get(r.type)?.name || r.type },
      { key: "state", label: "Prov.", align: "l", width: "46px", value: (r) => r.state, text: (r) => r.state || "–" },
      { key: "value", label: "Potencia", width: "minmax(0,.95fr)", value: sizeSort, text: (r) => sizeText(r), title: "Ordenar por potencia (MW)" },
    ],
    rows: [],
    sort: { key: "value", dir: "desc" },
    maxHeight: 300,
    onHover: (r) => {
      link.hover(r ? { resources: new Set([r.idx]), dimOthers: true, label: r.name } : null);
      bubbles.setHot(r ? r.key : null);
    },
    onClick: (r) => flyTo(r),
  });
  function sizeText(r) {
    const t = typeById.get(r.type);
    if (!fin(r.value)) return "–";
    if (t?.unit === "MW") return mw(r.value);
    if (t?.unit === "employees") return `${int(r.value)} empleados`;
    if (/tons/.test(t?.unit || "")) return `${count3(r.value)} t/año`;
    if (/km/.test(t?.unit || "")) return `${count3(r.value)} km²`;
    return fmtValue("float", r.value);
  }
  function flyTo(r) {
    focusPoint(app, r.x, r.y, Math.min(app.cam.maxScale, Math.max(app.cam.scale, (app.cam.fitScale || 1) * 3.2)));
  }

  // --- per state ------------------------------------------------------------------------------------------------
  const sBody = section(el, { title: "Potencia por provincia", note: "Potencia dibujada en cada provincia, por tipo. Pulsa una provincia para filtrarlo todo a ella; púlsala otra vez para quitar el filtro." });
  const stateRows = states
    .map((s, i) => ({ key: s.abbr, label: s.name, idx: i, parts: s.energy?.by_type || {}, total: s.energy?.total || 0, text: mw(s.energy?.total) }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
  const stacks = stackedBars(sBody, {
    rows: stateRows, keys: mwTypes.map((t) => ({ key: t.id, label: t.name, color: t.color })), fmt: (v) => mw(v),
    ariaLabel: "Potencia dibujada por provincia",
    onHover: (x) => {
      if (!x) return link.hover(null);
      const sIdx = x.row.idx;
      const set = x.part ? new Set(items.filter((it) => it.state === x.row.key && it.type === x.part).map((it) => it.idx)) : undefined;
      link.hover({ states: new Set([sIdx]), resources: set, dimOthers: true, label: x.part ? `${x.row.label}: ${typeById.get(x.part)?.name || x.part}` : x.row.label });
    },
    onClick: (x) => setState(st.state === x.row.key ? null : x.row.key, true),
  });
  const noPower = states.filter((s) => !(s.energy?.total > 0)).map((s) => s.abbr);
  if (noPower.length) sBody.insertAdjacentHTML("beforeend", `<p class="adv-note">Sin centrales dibujadas: ${esc(noPower.map((a) => states[stateIdx.get(a)]?.name || a).join(", "))}.</p>`);

  // --- explainer ------------------------------------------------------------------------------------------------
  const eBody = section(el, { title: "Qué significa cada símbolo", note: "Cada tipo de recurso, el umbral que debe pasar una central para dibujarse y de dónde salen los datos." });
  eBody.innerHTML = groups.map((g) => `<h4 class="adv-h4">${esc(g.label)}</h4>${g.types.map((t) => {
    const ty = typeById.get(t);
    const s = nat[t] || {};
    const src = data.source(ty.source);
    const total = fin(s.value) ? (ty.unit === "MW" ? mw(s.value) : `${count3(s.value)} ${ty.unit}`) : "";
    return `<div class="adv-explain" style="--cc:${esc(ty.color)}"><span class="ic">${glyph(ty, 22)}</span><div>
      <b>${esc(ty.name)}</b> <span class="sub">${int(s.count || 0)} dibujadas${total ? ` · ${esc(total)}` : ""} · se mide en ${esc(ty.unit)}</span>
      <p>${esc(ty.description)}</p><span class="src">Fuente: ${esc(src ? `${src.title} (${src.vintage || src.publisher})` : ty.source)}</span></div></div>`;
  }).join("")}`).join("");

  el.insertAdjacentHTML("beforeend", sourcesHtml(data, ["wri_gppd"], [
    "Solo se dibujan las centrales por encima del umbral de cada tipo (y los parques eólicos y solares agrupados por hexágono), así que los totales <b>no</b> son la potencia de la provincia ni del país.",
    "La base de datos (Global Power Plant Database, WRI) es de 2021: faltan los parques solares y eólicos de los últimos años, que han crecido mucho, y sobran centrales de carbón ya cerradas (por eso no se dibujan).",
    "Potencia no es producción: 1.000 MW solares generan en un año mucho menos que 1.000 MW nucleares.",
    "Cada central cuenta en la provincia donde está su hexágono.",
  ]));

  // --- map ------------------------------------------------------------------------------------------------------
  const bubbles = ctx.bubbles("sites", {
    rMax: 24,
    tip: (b) => {
      const it = b.it, t = typeById.get(it.type);
      return `<b>${esc(it.name)}</b><br>${esc(t.name)} · <b>${esc(mw(it.value))}</b>${it.state ? ` · ${esc(it.state)}` : ""}${it.detail ? `<br><span class="sub">${esc(it.detail)}</span>` : ""}`;
    },
    onHover: (b) => table.setHot(b ? b.key : null),
    onClick: (b) => { table.setHot(b.key); flyTo(b.it); },
  });

  function visible() {
    return items.filter((it) => st.on.has(it.type) && (!st.min || (isMW(it.type) && fin(it.value) && it.value >= st.min)) && (!st.state || it.state === st.state));
  }

  function setState(abbr, fly = false) {
    st.state = abbr;
    stacks.setSelected(abbr);
    apply();
    if (abbr && fly) {
      const b = app.highlightBounds({ states: new Set([stateIdx.get(abbr)]) });
      if (b) frameBox(app, b, { pad: 30, maxScale: 2.6 });
    }
  }

  function apply() {
    const typesOn = st.min ? new Set([...st.on].filter(isMW)) : st.on;
    const all = typesOn.size === types.length && !st.min;
    ctx.setResourceFilter(all ? null : { types: new Set(typesOn), minValue: st.min || undefined });
    const vis = visible();
    table.setRows(vis);
    const mwVis = vis.filter((it) => isMW(it.type) && fin(it.value));
    const vMax = Math.max(1, ...items.filter((it) => isMW(it.type) && fin(it.value)).map((it) => it.value));
    bubbles.set(mwVis.map((it) => ({ key: it.key, x: it.x, y: it.y, value: it.value, color: typeById.get(it.type).color, it })), { vMax });
    const sIdx = st.state ? stateIdx.get(st.state) : null;
    link.base({ dimOthers: true, states: sIdx != null ? new Set([sIdx]) : undefined });
    stateChip.innerHTML = st.state
      ? `<span class="adv-fchip">Provincia: <b>${esc(states[sIdx]?.name || st.state)}</b> · ${int(vis.length)} centrales<button type="button" data-clear-state aria-label="Quitar el filtro de provincia">✕</button></span>`
      : "";
    const r = (v) => 24 * Math.sqrt(v / vMax);
    legendBox.innerHTML = sizeLegend([250, 1000, 4000].filter((v) => v <= vMax * 1.2), r, (v) => `${int(v)} MW`, "Área del círculo = potencia");
    mixBars.setSelected(st.on.size === 1 ? [...st.on][0] : null);
  }
  apply();

  return {
    onMapHover(h) {
      if (h.resource) {
        const it = items[res.items.indexOf(h.resource)];
        if (it) table.setHot(it.key);
      }
    },
    onEscape() {
      if (st.state) { setState(null); return true; }
      return false;
    },
    destroy() {},
  };
}
