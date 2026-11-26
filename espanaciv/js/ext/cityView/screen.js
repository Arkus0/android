// The city screen: a docked dashboard (a bottom sheet on phones) with the header (and its city-type badge),
// Citizens (figure rows from citizens.json), Districts (districts.json + military.json), Economy, Workforce,
// Resources and Compare. Plain HTML strings + inline SVG charts; render(el, model, handlers) fills `el`. The
// citizens and districts files load on demand (h.loadData) and fill their sections when they arrive.
import { dollars, esc, int, num1, pct } from "../../format.js";
import { compact, money, popShort, yieldValue } from "../../format.js";
import { icon, glyph } from "../../ui/icon.js";
import { css } from "../../color.js";
import { isCapital } from "../../world.js";
import { sparkline, meter, bar } from "./charts.js";
import { popSeries, rankCount, resourceValue, LAND } from "./model.js";
import { citizensHtml, mountCitizens } from "./citizens.js";
import { badgeHtml, cityDistricts, districtsHtml } from "./districts.js";

const TABS = [
  ["citizens", "Ciudadanos", "pop"],
  ["districts", "Distritos", "l-developed"],
  ["economy", "Economía", "y-gold"],
  ["workforce", "Trabajo", "y-production"],
  ["resources", "Recursos", "resources"],
  ["compare", "Comparar", "layers"],
];

const signed = (g, d = 1) => (g == null ? "–" : `${g >= 0 ? "+" : "−"}${Math.abs(g * 100).toFixed(d).replace(".", ",")}%`);
const rankCache = new WeakMap();
function countOf(cities, key) {
  let m = rankCache.get(cities);
  if (!m) rankCache.set(cities, (m = new Map()));
  if (!m.has(key)) m.set(key, rankCount(cities, key));
  return m.get(key);
}

function rankBadge(rank, of, label, tip) {
  if (rank == null) return "";
  const tier = rank <= 10 ? "gold" : rank <= 50 ? "silver" : "bronze";
  return `<div class="cv-rank ${tier}" title="${esc(tip || `${label}: puesto ${rank} de ${of} ciudades (1 = la mayor)`)}">
    <span class="cv-medal">nº ${rank}</span><span class="cv-rank-l">${esc(label)}</span></div>`;
}

function lqBadge(lq) {
  if (lq == null) return "";
  const tip = `Cociente de localización: este peso es ${lq.toFixed(2).replace(".", ",")}× el de España`;
  const cls = lq >= 1.25 ? "hi" : lq <= 0.75 ? "lo" : "mid";
  return `<span class="cv-lq ${cls}" title="${esc(tip)}">×${lq.toFixed(1).replace(".", ",")}</span>`;
}

function medallion(id, fallback, bg, size = 18) {
  return `<span class="cv-med" style="--bg:${esc(bg)}">${icon(id, fallback, { size })}</span>`;
}

// --- header --------------------------------------------------------------------------------------------------------
function header(m) {
  const c = m.city, n = m.nation.nation;
  const cities = m.cityList;
  const col = css(m.stateRGB);
  const chips = m.states.map((s) => (s.index >= 0
    ? `<button class="chip" data-state="${s.index}" title="Abrir la provincia de ${esc(s.name)}">${esc(s.name)}</button>`
    : `<span class="chip">${esc(s.abbr)}</span>`)).join("");
  const g = Number.isFinite(c.growth) ? c.growth : null;
  const yrs = Array.isArray(c.growth_years) ? c.growth_years : null;
  const growth = g == null ? "" : `<span class="cv-growth ${g >= 0 ? "good" : "bad"}" title="Cambio de población ${yrs ? `${yrs[0]}–${yrs[1]}` : ""}, Padrón municipal. España: ${signed(n.growth)}">${g >= 0 ? "▲" : "▼"} ${Math.abs(g * 100).toFixed(1).replace(".", ",")}%${yrs ? ` <small>desde ${yrs[0]}</small>` : ""}</span>`;
  const perCap = c.gdp != null && c.population ? c.gdp / c.population : null;
  const r = c.ranks || {};
  const N = (k) => countOf(cities, k);
  return `
  <div class="sheet-grip cv-grip" aria-hidden="true"></div>
  <header class="cv-head" style="--sc:${col}">
    <div class="cv-ribbon" aria-hidden="true"></div>
    <button class="icon-btn cv-close" data-close aria-label="Cerrar la vista de ciudad (Esc)" title="Volver al mapa (Esc)">${icon("close", "✕", { size: 13 })}</button>
    <div class="cv-kind">Vista de ciudad · ${c.capital ? "Capital de España" : c.provincial_capital ? "Capital de provincia" : "Municipio"}</div>
    <div class="cv-title">
      <div class="cv-crest" aria-hidden="true"><span>${esc(popShort(c.population))}</span></div>
      <div class="cv-tt">
        <h2 class="cv-name" tabindex="-1">${isCapital(c) ? `<span class="cv-cap" title="Capital de España">★</span> ` : ""}${esc(c.name)}</h2>
        <div class="cv-full">${esc(c.full || "")}</div>
        <div class="cv-typeslot" data-ctype></div>
        ${chips ? `<div class="chips">${chips}</div>` : ""}
      </div>
    </div>
    <div class="cv-headline">
      <div class="cv-big"><span class="lbl">${icon("pop", "👥", { size: 13 })} Población</span><b>${int(c.population)}</b>${growth}</div>
      <div class="cv-big"><span class="lbl">${icon("y-gold", "💰", { size: 13 })} PIB${c.gdp_year ? ` ${c.gdp_year}` : ""} ≈</span><b>${money(c.gdp)}</b>${
        perCap != null ? `<span class="cv-sub">${money(perCap)} por persona</span>` : ""}</div>
    </div>
    <div class="cv-ranks" aria-label="Puestos entre ${cities.length} ciudades">
      ${rankBadge(r.population, N("population"), "Población")}
      ${rankBadge(r.gdp, N("gdp"), "PIB")}
      ${rankBadge(r.gdp_per_capita, N("gdp_per_capita"), "PIB / persona")}
      ${rankBadge(r.growth, N("growth"), "Crecimiento", r.growth != null ? `Crecimiento: puesto ${r.growth} de ${N("growth")} (1 = la que más crece)` : "")}
    </div>
  </header>
  <nav class="cv-tabs" aria-label="Secciones de la vista de ciudad">
    ${TABS.map(([id, label, ic]) => `<button type="button" data-tab="${id}">${icon(ic, "•", { size: 14 })}<span>${label}</span></button>`).join("")}
  </nav>`;
}

// --- citizens ------------------------------------------------------------------------------------------------------
function citizens(m) {
  const c = m.city, n = m.nation.nation;
  const series = popSeries(c);
  const ch = series.length >= 2 ? series.at(-1).value / series[0].value - 1 : null;
  // sub: the small line beside the value; by default the U.S. value, left out when there is none.
  const row = (ic, fb, label, v, us, fmt, better, max, sub = us != null ? `España ${fmt(us)}` : "", tick = us) => v == null ? "" : `
    <div class="cv-stat">
      <div class="cv-stat-top"><span class="sl">${icon(ic, fb, { size: 14 })}${esc(label)}</span>
        <span class="sv"><b>${v == null ? "–" : fmt(v)}</b>${sub ? `<small>${sub}</small>` : ""}</span></div>
      ${meter(v, tick, max ?? Math.max(v || 0, us || 0) * 1.35, better)}
    </div>`;
  // Employed residents: no U.S. figure to set beside a count, so the share of residents (and the U.S. share).
  const empShare = c.employed != null && c.population > 0 ? c.employed / c.population : null;
  const usEmpShare = n.employed != null && n.population > 0 ? n.employed / n.population : null;
  const empSub = empShare == null ? ""
    : `${pct(empShare)} de los residentes${usEmpShare != null ? ` · España ${pct(usEmpShare)}` : ""}`;
  const multi = m.tiles.length > 1;
  const tilesNote = multi
    ? `En el mapa, cada hexágono del municipio muestra sus <b>≈ habitantes</b> (densidad × superficie del hexágono, una estimación) y su
       <b>uso del suelo principal</b>${m.residentsSum > 0
        ? `. Entre los ${m.tiles.length} hexágonos suman unos ${compact(m.residentsSum)} habitantes según esa estimación` : ""}.`
    : `Este municipio cabe en un solo hexágono del mapa (unos ${compact(m.hexArea)} km²), dibujado con su ciudad.`;
  return `
  <section class="cv-sec" id="cv-citizens" data-sec="citizens" aria-labelledby="cv-h-citizens">
    <h3 id="cv-h-citizens">${icon("pop", "👥", { size: 15 })}Ciudadanos</h3>
    <div class="cv-citizens" data-citizens>${citizensHtml(m, undefined)}</div>
    <h4 class="cv-h4">Población</h4>
    <div class="cv-card">
      <div class="cv-card-h"><span>Población ${series.length ? `${series[0].year}–${series.at(-1).year}` : ""}</span>${
        ch != null ? `<span class="${ch >= 0 ? "good" : "bad"}">${signed(ch)}</span>` : ""}</div>
      ${sparkline(series, { fmt: (v) => popShort(v), title: `Población de ${c.name} por año` })}
      <p class="cv-note">Padrón municipal a 1 de enero, cifras oficiales del INE.</p>
    </div>
    <div class="cv-stats">
      ${row("pop", "👥", "Ocupados residentes", c.employed, null, int, null, c.population, empSub, usEmpShare != null ? usEmpShare * c.population : null)}
      ${row("unemployment", "😐", "Paro (Censo)", c.unemployment, n.unemployment, (x) => pct(x), "low")}
      ${row("l-income", "💶", "Renta neta media por persona", c.renta_persona, n.renta_persona, dollars, "high")}
      ${row("l-income", "💶", "Renta mediana por unidad de consumo", c.median_income, n.median_income, dollars, "high")}
      ${row("l-poverty", "🥣", "Bajo el 60 % de la renta mediana", c.pobreza, n.pobreza, (x) => pct(x), "low")}
      ${row("l-age", "🎂", "Edad media", c.edad_media, n.edad_media, (x) => `${num1(x)} años`, null, 70)}
    </div>
    <div class="cv-legend-tiles">${tileLegend(m)}<p>${tilesNote}</p></div>
    <h4 class="cv-h4">El municipio y su provincia</h4>
    <div class="cv-counties" data-counties><p class="muted cv-note">Cargando municipios…</p></div>
  </section>`;
}

function tileLegend(m) {
  const counts = new Map();
  for (const t of m.tiles) if (t.land) counts.set(t.land.key, (counts.get(t.land.key) || 0) + 1);
  return `<div class="cv-tl">${LAND.filter((g) => counts.has(g.key)).map((g) =>
    `<span class="cv-tl-i"><i style="background:${esc(m.landColor(g.key))}"></i>${esc(g.label)} <small>${counts.get(g.key)}</small></span>`).join("")}</div>`;
}

export function countiesTable(m, data) {
  // España: la ciudad es un municipio. Se muestra junto a los mayores municipios de su provincia.
  const c = m.city;
  if (!data || !Array.isArray(data.rows)) return `<p class="muted cv-note">La tabla de municipios no está disponible.</p>`;
  const col = Object.fromEntries(data.columns.map((k, j) => [k, j]));
  const prov = (c.states || [])[0];
  const all = data.rows.filter((r) => r[col.state] === prov).sort((a, b) => (b[col.population] || 0) - (a[col.population] || 0));
  if (!all.length) return `<p class="muted cv-note">Sin municipios para esta provincia.</p>`;
  let show = all.slice(0, 7);
  const me = all.find((r) => r[col.geoid] === c.id);
  if (me && !show.includes(me)) show = [...show.slice(0, 6), me];
  const maxPop = all[0][col.population] || 1;
  const provPop = all.reduce((a, r) => a + (r[col.population] || 0), 0);
  const share = me && provPop ? me[col.population] / provPop : null;
  return `${share != null ? `<p class="cv-lead">${esc(c.name)} reúne el ${pct(share)} de la población de su provincia (${int(all.length)} municipios).</p>` : ""}
  <div class="cv-ctable" role="table" aria-label="Mayores municipios de la provincia">
    <div class="cv-cr cv-cr-h" role="row"><span role="columnheader">Municipio</span><span role="columnheader">Hab.</span><span role="columnheader">/km²</span><span role="columnheader">Renta</span></div>
    ${show.map((r) => `<div class="cv-cr${r === me ? " me" : ""}" role="row">
      <span role="cell" class="cv-cn">${r === me ? "<b>" : ""}${esc(r[col.name])}${r === me ? "</b>" : ""}${bar(r[col.population] / maxPop, "var(--sc, #c9a45c)")}</span>
      <span role="cell">${compact(r[col.population])}</span><span role="cell">${r[col.density] != null ? int(r[col.density]) : "–"}</span>
      <span role="cell">${money(r[col.income])}</span></div>`).join("")}
    <p class="cv-note">Padrón y Atlas de Distribución de Renta del INE${data.vintage ? ` (${esc(data.vintage)})` : ""}. Renta neta media por persona.</p>
  </div>`;
}

// --- districts -----------------------------------------------------------------------------------------------------
function districts(m) {
  return `
  <section class="cv-sec" id="cv-districts" data-sec="districts" aria-labelledby="cv-h-districts">
    <h3 id="cv-h-districts">${icon("l-developed", "🏙", { size: 15 })}Distritos</h3>
    <div data-districts>${districtsHtml(m, undefined, null)}</div>
  </section>`;
}

// --- economy -------------------------------------------------------------------------------------------------------
function economy(m) {
  const c = m.city, nat = m.nation, n = nat.nation;
  const r = c.ranks || {};
  const cities = m.cityList;
  const perCap = c.gdp != null && c.population ? c.gdp / c.population : null;
  const usPerCap = n.gdp && n.population ? n.gdp / n.population : null;
  const yields = nat.yields.map((y) => {
    const v = c.yields?.[y.key];
    const rk = r[y.key];
    return `<div class="cv-yield" style="--yc:${esc(y.color)}" title="${esc(y.label)}: ${esc(y.description || "")}">
      <div class="ico">${glyph(y, 20)}</div><div class="val">${yieldValue(y, v)}</div>
      <div class="lbl">${esc(y.key === "gold" ? "PIB" : y.label)}</div>
      ${rk != null ? `<div class="rk">nº ${rk} <small>de ${countOf(cities, y.key)}</small></div>` : ""}</div>`;
  }).join("");
  const gi = m.gdpInds;
  const maxShare = gi.length ? Math.max(...gi.map((d) => Math.max(d.share, d.natShare))) : 1;
  const gdpRow = (d) => d.undisclosed
    ? `<div class="cv-ind und" title="Parte del PIB sin desglose: ${esc(d.missing.map((k) => nat.industries?.[k] || k).join(", ") || "varias ramas")}.">
      <span class="cv-ind-ic" style="--bg:${esc(d.color)}">${icon(d.icon, "?", { size: 13 })}</span>
      <span class="cv-ind-n">${esc(d.short)}</span>
      <span class="cv-ind-v">${money(d.value)} <small>${pct(d.share, 0)}</small></span>
      ${bar(d.share / maxShare, "#7c8494", 0)}
    </div>`
    : `<div class="cv-ind" title="${esc(d.label)}: ${money(d.value)} (${pct(d.share)} del PIB de la ciudad; España ${pct(d.natShare)})${d.estimated ? ". Estimación a partir de la provincia." : ""}">
      <span class="cv-ind-ic" style="--bg:${esc(d.color)}">${icon(d.icon, "•", { size: 13 })}</span>
      <span class="cv-ind-n">${esc(d.short)}${lqBadge(d.lq)}</span>
      <span class="cv-ind-v">${d.estimated ? "≈" : ""}${money(d.value)} <small>${pct(d.share, 0)}</small></span>
      ${bar(d.share / maxShare, d.lq != null && d.lq >= 1.25 ? "#9fd76a" : "#c9a45c", d.natShare / maxShare)}
    </div>`;
  return `
  <section class="cv-sec" id="cv-economy" data-sec="economy" aria-labelledby="cv-h-economy">
    <h3 id="cv-h-economy">${icon("y-gold", "💰", { size: 15 })}Economía</h3>
    <div class="cv-gdp">
      <div><span class="lbl">PIB ≈${c.gdp_year ? ` (${c.gdp_year})` : ""}</span><b>${money(c.gdp)}</b>${r.gdp != null ? `<small>nº ${r.gdp} de ${countOf(cities, "gdp")}</small>` : ""}</div>
      <div><span class="lbl">PIB por persona ≈</span><b>${money(perCap)}</b>${
        usPerCap ? `<small class="${perCap >= usPerCap ? "good" : "bad"}">España ${money(usPerCap)}</small>` : ""}</div>
      <div><span class="lbl">Parte del PIB de España</span><b>${c.gdp != null && n.gdp ? pct(c.gdp / n.gdp, 2) : "–"}</b><small>${pct(c.population / n.population, 2)} de la población</small></div>
    </div>
    <h4 class="cv-h4">Rendimientos <span class="muted">puesto entre ciudades</span></h4>
    <div class="cv-yields">${yields}</div>
    <h4 class="cv-h4">PIB por ramas ≈ <span class="muted">marca = peso en España</span></h4>
    ${gi.length ? `<div class="cv-inds">${gi.slice(0, 8).map(gdpRow).join("")}</div>
      ${gi.length > 8 ? `<details class="cv-more"><summary>Las ${gi.length} ramas</summary><div class="cv-inds">${gi.slice(8).map(gdpRow).join("")}</div></details>` : ""}`
      : `<p class="muted cv-note">Sin desglose por ramas para esta ciudad.</p>`}
    <p class="cv-note">${esc(nat.gdp_vintage || "Eurostat/INE")}, euros corrientes. El INE no publica el PIB municipal: el de la ciudad es una
      estimación (≈) que reparte el valor añadido de su provincia rama a rama según los ocupados que viven en la ciudad. ×N = el peso de la rama
      en el PIB de la ciudad frente a su peso en el de España.</p>
  </section>`;
}

// --- workforce -----------------------------------------------------------------------------------------------------
function workforce(m) {
  const cards = m.inds.map((d) => {
    const spec = d.lq != null && d.lq >= 1.25;
    return `<div class="cv-bld${spec ? " spec" : ""}" title="${esc(d.label)}: ${int(d.jobs)} vecinos trabajan en esta rama (${pct(d.share)}; España ${pct(d.natShare)})">
      ${medallion(d.icon, "•", d.color, 17)}
      <div class="cv-bld-t"><span class="cv-bld-n">${esc(d.short)}</span>
        <span class="cv-bld-v">${compact(d.jobs)} <small>${pct(d.share, 1)}</small></span></div>
      ${lqBadge(d.lq)}
    </div>`;
  }).join("");
  return `
  <section class="cv-sec" id="cv-workforce" data-sec="workforce" aria-labelledby="cv-h-workforce">
    <h3 id="cv-h-workforce">${icon("y-production", "⚙️", { size: 15 })}Trabajo</h3>
    <p class="cv-lead">En qué ramas trabajan los ${int(m.city.employed)} ocupados que viven en la ciudad. <span class="cv-lq hi">×N</span> compara el peso de cada rama con el que tiene en España.</p>
    <div class="cv-blds">${cards || `<p class="muted cv-note">Sin datos por rama.</p>`}</div>
    <p class="cv-note">INE, ${esc(m.nation.vintage)}: ocupados de 16 y más años por actividad (CNAE), contados donde viven.</p>
  </section>`;
}

// --- resources -----------------------------------------------------------------------------------------------------
function resources(m) {
  const list = m.sites.map((s, k) => {
    const t = s.type;
    const val = resourceValue(s.item, t, compact);
    return `<button type="button" class="cv-site" data-site="${k}" title="Ir a ${esc(s.item.name)}">
      <span class="cv-med" style="--bg:${esc(t?.color || "#3a4a5e")}">${glyph(t, 16)}</span>
      <span class="cv-site-t"><b>${esc(s.item.name)}</b><small>${esc(t?.name || s.item.type)}${s.item.state ? ` · ${esc(s.item.state)}` : ""}</small>
        ${s.item.detail ? `<small class="cv-site-d">${esc(s.item.detail)}</small>` : ""}</span>
      <span class="cv-site-v">${esc(val)}<i aria-hidden="true">›</i></span>
    </button>`;
  }).join("");
  const cats = {};
  for (const s of m.sites) cats[s.type?.category || "other"] = (cats[s.type?.category || "other"] || 0) + 1;
  const mw = m.sites.filter((s) => s.type?.unit === "MW").reduce((a, s) => a + (s.item.value || 0), 0);
  const summary = m.sites.length
    ? `<p class="cv-lead">${m.sites.length} sitio${m.sites.length === 1 ? "" : "s"} en el mapa${
      mw ? ` · ${mw >= 1000 ? `${(mw / 1000).toFixed(1).replace(".", ",")} GW` : `${Math.round(mw)} MW`} de potencia dibujada` : ""}. Pulsa uno para ir allí.</p>`
    : `<p class="muted cv-note">No hay recursos dibujados cerca. Solo se dibujan los sitios grandes (cada tipo tiene un umbral).</p>`;
  return `
  <section class="cv-sec" id="cv-resources" data-sec="resources" aria-labelledby="cv-h-resources">
    <h3 id="cv-h-resources">${icon("resources", "⛏️", { size: 15 })}Recursos</h3>
    ${summary}
    <div class="cv-sites">${list}</div>
    ${m.sites.length ? `<p class="cv-note">Sitios a menos de tres hexágonos de la ciudad. Solo los dibujados en el mapa, no toda la potencia de la zona.</p>` : ""}
  </section>`;
}

// --- compare -------------------------------------------------------------------------------------------------------
const COMPARE = {
  size: [
    ["Población", (c) => c.population, (v) => popShort(v)],
    ["PIB / pers. ≈", (c) => (c.gdp != null && c.population ? c.gdp / c.population : null), money],
    ["Renta / pers.", (c) => c.renta_persona, money],
    ["Crecimiento", (c) => (Number.isFinite(c.growth) ? c.growth : null), (v) => signed(v)],
  ],
  housing: [
    ["Paro", (c) => c.unemployment, (v) => pct(v)],
    ["Edad media", (c) => c.edad_media, (v) => num1(v)],
    ["Nacidos fuera", (c) => c.nacidos_fuera, (v) => pct(v, 0)],
    ["Estudios sup.", (c) => c.estudios_sup, (v) => pct(v, 0)],
  ],
};

export function compareTable(m, set = "size") {
  const rows = [m.city, ...m.peers];
  const cols = COMPARE[set] || COMPARE.size;
  const max = cols.map(([, f]) => Math.max(...rows.map((c) => Math.abs(f(c) ?? 0))) || 1);
  return `<div class="cv-cmp" role="table" aria-label="${esc(m.city.name)} and its peers">
    <div class="cv-cmp-r cv-cmp-h" role="row"><span role="columnheader">Ciudad</span>${cols.map(([l]) => `<span role="columnheader">${esc(l)}</span>`).join("")}</div>
    ${rows.map((c, k) => `<div class="cv-cmp-r${k === 0 ? " me" : ""}" role="row">
      <span role="cell">${k === 0 ? `<b class="cv-cmp-n">${esc(c.name)}</b>` : `<button type="button" class="cv-cmp-n" data-peer="${esc(c.id)}" title="Abrir ${esc(c.full || c.name)} en la vista de ciudad">${esc(c.name)}</button>`}<small>${esc(c.full?.split(" · ")[1]?.replace(/^provincia de /, "") || "")}</small></span>
      ${cols.map(([, f, fmt], j) => {
        const v = f(c);
        const col = v != null && v < 0 ? "#f08a6a" : k === 0 ? "#ecd08e" : "#8fa6bd";
        return `<span role="cell"><em>${v == null ? "–" : esc(fmt(v))}</em>${bar(v == null ? 0 : Math.abs(v) / max[j], col)}</span>`;
      }).join("")}
    </div>`).join("")}
  </div>`;
}

function compare(m) {
  return `
  <section class="cv-sec" id="cv-compare" data-sec="compare" aria-labelledby="cv-h-compare">
    <h3 id="cv-h-compare">${icon("layers", "⚖️", { size: 15 })}Comparar</h3>
    <p class="cv-lead">Las ${m.peers.length} ciudades más parecidas en población. Pulsa una para abrirla.</p>
    <div class="cv-seg" role="group" aria-label="Medidas">
      <button type="button" data-set="size" aria-pressed="true">Tamaño y riqueza</button>
      <button type="button" data-set="housing" aria-pressed="false">Vida y trabajo</button>
    </div>
    <div data-compare>${compareTable(m, "size")}</div>
  </section>`;
}

function footer(m) {
  const nat = m.nation;
  return `<div class="cv-foot">Fuentes: INE, ${esc(nat.vintage)}${nat.gdp_vintage ? `; PIB: ${esc(nat.gdp_vintage)}` : ""}; Atlas de Distribución
    de Renta de los Hogares; centrales de la Global Power Plant Database. Los puestos son entre las ${m.cityList.length} ciudades del mapa.
    <a href="#" data-pedia>Almanaque ›</a></div>`;
}

/**
 * Fill the dock. handlers: {onClose, onState(idx), onPeer(id), onSite(site), onSiteHover(site|null), onPedia,
 * loadCounties() → Promise<counties.json|null>, loadData(name) → Promise<data|null>, onDistricts(list)} (the
 * metro's districts once districts.json is in, for the map plaques).
 */
/**
 * Scrolls the dock to a section (its tab id, e.g. "districts"). Citizens and districts arrive later and change the
 * heights above, so the section is re-aligned as they do, for up to 4 s or until the user scrolls themselves.
 */
export function goToSection(el, id) {
  const sec = el?.querySelector(`[data-sec="${id}"]`);
  if (!sec) return false;
  const align = () => {
    const nav = el.querySelector(".cv-tabs");
    el.scrollTop = Math.max(0, sec.offsetTop - (nav?.offsetHeight || 0) - 4);
    el.onscroll?.(); // the tab spy (a scroll event is not always sent for a programmatic jump)
  };
  align();
  let ro = null;
  const stop = () => {
    ro?.disconnect();
    ro = null;
    for (const t of ["wheel", "touchstart", "keydown", "pointerdown"]) el.removeEventListener(t, stop);
  };
  for (const t of ["wheel", "touchstart", "keydown", "pointerdown"]) el.addEventListener(t, stop, { passive: true });
  if (typeof ResizeObserver === "function") {
    ro = new ResizeObserver(() => { if (sec.isConnected) align(); else stop(); });
    for (const c of el.children) ro.observe(c);
  }
  setTimeout(stop, 4000);
  return true;
}

export function render(el, m, h) {
  el.classList.add("cv-dock");
  el.style.setProperty("--sc", css(m.stateRGB));
  el.innerHTML = header(m) + citizens(m) + districts(m) + economy(m) + workforce(m) + resources(m) + compare(m) + footer(m);
  el.scrollTop = 0;

  el.querySelector("[data-close]").onclick = () => h.onClose();
  el.querySelectorAll("[data-state]").forEach((b) => (b.onclick = () => h.onState(+b.dataset.state)));
  el.querySelector("[data-pedia]").onclick = (e) => { e.preventDefault(); h.onPedia(); };

  // Sites: hover lights the hex on the map, click flies there.
  el.querySelectorAll("[data-site]").forEach((b) => {
    const s = m.sites[+b.dataset.site];
    b.onclick = () => h.onSite(s);
    b.onmouseenter = b.onfocus = () => h.onSiteHover(s);
    b.onmouseleave = b.onblur = () => h.onSiteHover(null);
  });

  // Compare: metric sets and peer links (delegated, the table is re-rendered).
  const cmp = el.querySelector("[data-compare]");
  el.querySelectorAll("[data-set]").forEach((b) => (b.onclick = () => {
    el.querySelectorAll("[data-set]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    cmp.innerHTML = compareTable(m, b.dataset.set);
  }));
  cmp.addEventListener("click", (e) => {
    const b = e.target.closest("[data-peer]");
    if (b) h.onPeer(b.dataset.peer);
  });

  // Tabs scroll to their section; the active tab follows the scroll position.
  const nav = el.querySelector(".cv-tabs");
  const tabs = [...el.querySelectorAll("[data-tab]")];
  const secs = tabs.map((t) => el.querySelector(`[data-sec="${t.dataset.tab}"]`));
  tabs.forEach((t, k) => (t.onclick = () => {
    const top = secs[k].offsetTop - nav.offsetHeight - 4;
    el.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }));
  const spy = () => {
    const y = el.scrollTop + nav.offsetHeight + 24;
    let k = 0;
    secs.forEach((s, j) => { if (s.offsetTop <= y) k = j; });
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) k = secs.length - 1;
    tabs.forEach((t, j) => t.classList.toggle("on", j === k));
  };
  el.onscroll = spy;
  spy();

  // Citizens and districts arrive with their files (each loaded once, on demand).
  const czHost = el.querySelector("[data-citizens]");
  Promise.resolve(h.loadData?.("citizens")).then((data) => {
    if (!czHost.isConnected) return;
    czHost.innerHTML = citizensHtml(m, data ?? null);
    mountCitizens(czHost, m, data);
  }, () => { if (czHost.isConnected) czHost.innerHTML = citizensHtml(m, null); });
  const dHost = el.querySelector("[data-districts]");
  const typeSlot = el.querySelector("[data-ctype]");
  Promise.all([h.loadData?.("districts"), Promise.resolve(null)]).then(([dd, mil]) => {
    if (!dHost.isConnected) return;
    dHost.innerHTML = districtsHtml(m, dd ?? null, mil ?? null);
    typeSlot.innerHTML = badgeHtml(m, dd ?? null);
    h.onDistricts?.(dd ? cityDistricts(dd, mil, m.city.id) : []);
  }, () => { if (dHost.isConnected) dHost.innerHTML = districtsHtml(m, null, null); });

  // Member counties arrive with counties.json (loaded once, on demand).
  const host = el.querySelector("[data-counties]");
  Promise.resolve(h.loadCounties()).then((data) => {
    if (host.isConnected) host.innerHTML = countiesTable(m, data);
  }, () => { if (host.isConnected) host.innerHTML = `<p class="muted cv-note">La tabla de municipios no está disponible.</p>`; });
}
