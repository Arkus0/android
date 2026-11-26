// Consejero de Prosperidad: renta, pobreza y paro (España). En usaciv era «Prosperity & Housing» (renta frente a valor
// de la vivienda y alquileres); el INE no publica precios de vivienda por municipio, así que aquí se cruza la renta con
// la pobreza relativa del Atlas de distribución de renta (ADRH) y con el paro del Censo.
import { esc, fin, colorScale, robustDomain, RAMPS } from "../core/util.js";
import { money, pct, int, count3, fmtShort } from "../core/fmt.js";
import { barList, histogram, rampLegend } from "../core/charts.js";
import { createTable } from "../core/table.js";
import { createScatter } from "../core/scatter.js";
import { section, tiles, segmented, lensButton, sourcesHtml, topBy, frameBtn } from "../core/view.js";
import { rowsHighlight } from "../core/data.js";

const METRO_MIN = 100000;
const BIG_METRO = 250000;
const euros = (v) => (fin(v) ? `${int(v)} €` : "–");

export function mount(ctx) {
  const { app, data, el, link } = ctx;
  const n = data.nat;
  const nation = data.nation.nation || {};
  const { states, metros, counties } = data.levels;

  el.insertAdjacentHTML("beforeend", tiles([
    { label: "Renta por persona", value: euros(nation.renta_persona ?? n.income), sub: "renta neta media (ADRH)" },
    { label: "Renta por hogar", value: euros(nation.renta_hogar), sub: "renta neta media (ADRH)" },
    { label: "Paro", value: pct(n.unemployment), sub: "parados ÷ activos (Censo)" },
  ]));

  // --- renta frente a pobreza ------------------------------------------------------------------------------------------
  const aBody = section(el, { title: "Renta y pobreza", note: "Renta neta media por persona frente a la parte de la población con ingresos por debajo del 60 % de la mediana española (el umbral de riesgo de pobreza). El color es el paro. Arrastra un rectángulo para seleccionar lugares; pasa por el mapa para encontrar uno aquí." });
  const aCtl = document.createElement("div");
  aCtl.className = "adv-row";
  aBody.appendChild(aCtl);
  let level = counties ? "counties" : "metros";
  segmented(aCtl, { label: "Lugares", value: level, options: [...(counties ? [{ value: "counties", label: "Municipios" }] : []), { value: "metros", label: "Ciudades" }], onChange: (v) => { level = v; drawRich(); } });
  for (const [id, label] of [["income", "Renta en el mapa"], ["poverty", "Pobreza en el mapa"], ["unemployment", "Paro en el mapa"]]) {
    const b = lensButton(app, id, label);
    if (b) aCtl.appendChild(b);
  }
  const lv = () => data.levels[level];
  const uDomain = robustDomain((counties || metros).rows.map((r) => r.v.unemployment), 0.03) || [0.04, 0.25];
  const uColor = colorScale({ type: "seq", domain: uDomain, ramp: RAMPS.heat });
  const ok = (r) => fin(r.v.income) && fin(r.v.poverty);
  const scatter = createScatter(aBody, {
    height: 310, points: [],
    x: { label: "Renta neta por persona", fmt: money, log: true },
    y: { label: "Bajo el umbral de pobreza", fmt: (v) => fmtShort("pct", v) },
    size: { label: "Población", fmt: count3, max: 14, min: 1.4 },
    color: (c) => uColor(c), colorLabel: "Paro", colorFmt: pct,
    onHover: (p) => { link.hover(p ? rowsHighlight(lv(), [p.row]) : null); richTable.setHot(p ? p.key : null, false); },
    onClick: (p) => lv().focus(p.row),
    onBrush: (set) => {
      const sel = set ? lv().rows.filter((r) => set.has(r.key)) : [];
      link.base(sel.length ? rowsHighlight(lv(), sel, { dim: true }) : null, { frame: sel.length > 1 });
      richTable.setSelected(set);
      selInfo.innerHTML = sel.length ? `<b>${int(sel.length)}</b> ${level === "counties" ? "municipios" : "ciudades"} seleccionados · ${count3(sel.reduce((a, r) => a + (r.v.population || 0), 0))} habitantes ${frameBtn()}<button type="button" class="adv-mini" data-clear>Quitar</button>` : "";
    },
  });
  aBody.insertAdjacentHTML("beforeend", rampLegend({ ramp: RAMPS.heat, domain: uDomain, fmt: (v) => fmtShort("pct", v), label: "Paro (Censo)" }));
  const selInfo = document.createElement("div");
  selInfo.className = "adv-brushinfo";
  aBody.appendChild(selInfo);
  const clearSel = () => { scatter.setSelected(null); richTable.setSelected(null); link.base(null); selInfo.innerHTML = ""; };
  selInfo.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) clearSel(); });
  aBody.insertAdjacentHTML("beforeend", `<h4 class="adv-h4">Tabla de renta</h4>`);
  const richTable = createTable(aBody, {
    caption: "Renta, pobreza y paro", rank: true, maxHeight: 260, rows: [], search: "Buscar lugares",
    columns: [
      { key: "name", label: "Lugar", align: "l", value: (r) => r.name, html: (r) => `${esc(r.name)} <span class="sub">${esc(r.sub)}</span>` },
      { key: "population", label: "Habitantes", value: (r) => r.v.population, text: (r) => count3(r.v.population) },
      { key: "income", label: "Renta", value: (r) => r.v.income, text: (r) => euros(r.v.income), bar: { max: 30000, color: "rgba(224,181,76,.35)" } },
      { key: "poverty", label: "Pobreza", value: (r) => r.v.poverty, text: (r) => pct(r.v.poverty) },
      { key: "unemployment", label: "Paro", value: (r) => r.v.unemployment, html: (r) => fin(r.v.unemployment) ? `<span class="dot" style="background:${uColor(r.v.unemployment)}"></span>${pct(r.v.unemployment)}` : "–" },
    ],
    sort: { key: "income", dir: "desc" },
    onHover: (r) => { link.hover(r ? rowsHighlight(lv(), [r]) : null); scatter.setHot(r ? r.key : null); },
    onClick: (r) => lv().focus(r),
  });
  function drawRich() {
    clearSel();
    const rows = lv().rows.filter(ok);
    scatter.update({
      points: rows.map((r) => ({ key: r.key, x: r.v.income, y: r.v.poverty, s: r.v.population, c: r.v.unemployment, label: r.name, sub: r.sub, row: r })),
      labels: topBy(rows, (r) => r.v.population, { n: 6 }).map((x) => x.r.key),
    });
    richTable.setRows(rows);
  }
  drawRich();

  // --- pobreza ---------------------------------------------------------------------------------------------------------
  let povHist = null;
  if (counties) {
    const pBody = section(el, { title: "Pobreza", note: "Municipios según la parte de sus vecinos por debajo del umbral de riesgo de pobreza (60 % de la mediana española de la renta por unidad de consumo). Pasa por una barra para marcar esos municipios; la tabla los lista todos." });
    const pCtl = document.createElement("div");
    pCtl.className = "adv-row";
    pBody.appendChild(pCtl);
    const lb = lensButton(app, "poverty", "Pobreza en el mapa");
    if (lb) pCtl.appendChild(lb);
    const pHost = document.createElement("div");
    pBody.appendChild(pHost);
    const esPov = (() => {
      let a = 0, w = 0;
      for (const r of counties.rows) if (fin(r.v.poverty) && fin(r.v.population)) { a += r.v.poverty * r.v.population; w += r.v.population; }
      return w ? a / w : null;
    })();
    povHist = histogram(pHost, {
      values: counties.rows.map((r) => ({ key: r.key, v: r.v.poverty, w: r.v.population })), bins: 30, domain: [0, 0.6], height: 120,
      fmt: (v) => fmtShort("pct", v), unitLabel: "municipios", label: "Histograma de la pobreza de los municipios",
      colorOf: (_, t) => colorScale({ type: "seq", domain: [0, 1], ramp: RAMPS.heat })(t),
      markers: fin(esPov) ? [{ v: esPov, label: `España ${pct(esPov)}` }] : [],
      onHover: (bin) => link.hover(bin ? rowsHighlight(counties, bin.keys.map((k) => counties.byKey.get(k)), { dim: true }) : null),
    });
    const povTable = createTable(pBody, {
      caption: "Pobreza por municipio", rank: true, maxHeight: 240, rows: counties.rows.filter((r) => fin(r.v.poverty)), search: "Buscar municipios",
      columns: [
        { key: "name", label: "Municipio", align: "l", value: (r) => r.name, html: (r) => `${esc(r.name)} <span class="sub">${esc(r.sub)}</span>` },
        { key: "population", label: "Habitantes", value: (r) => r.v.population, text: (r) => count3(r.v.population) },
        { key: "poverty", label: "Pobreza", value: (r) => r.v.poverty, text: (r) => pct(r.v.poverty), bar: { max: 0.6, color: "rgba(232,119,74,.4)" } },
        { key: "income", label: "Renta", value: (r) => r.v.income, text: (r) => euros(r.v.income) },
      ],
      sort: { key: "poverty", dir: "desc" },
      onHover: (r) => link.hover(r ? rowsHighlight(counties, [r]) : null),
      onClick: (r) => counties.focus(r),
    });
    ctx.cleanup(() => povTable.destroy());
  }

  // --- renta por ciudad ------------------------------------------------------------------------------------------------
  const rBody = section(el, { title: "Las ciudades más ricas y las más pobres", note: `Renta neta media por persona, ciudades de ${count3(METRO_MIN)}+ habitantes. Es renta declarada tras impuestos y cotizaciones, no PIB: mide lo que tienen los vecinos, no lo que se produce en la ciudad.` });
  const rentaRows = (list) => list.map((x) => ({ key: x.r.key, label: x.r.name, sub: fin(x.r.v.poverty) ? `pobreza ${pct(x.r.v.poverty)}` : "", value: x.v, text: euros(x.v), row: x.r }));
  const rOpts = { onHover: (r) => link.hover(r ? rowsHighlight(metros, [r.row]) : null), onClick: (r) => metros.focus(r.row) };
  const hi = topBy(metros.rows, (r) => r.v.income, { n: 10, min: METRO_MIN });
  const lo = topBy(metros.rows, (r) => r.v.income, { n: 8, min: METRO_MIN, asc: true });
  const rmax = Math.max(...hi.map((x) => x.v));
  rBody.insertAdjacentHTML("beforeend", `<h4 class="adv-h4">Más renta</h4>`);
  barList(rBody, { ...rOpts, rows: rentaRows(hi), max: rmax, ariaLabel: "Ciudades con más renta" });
  rBody.insertAdjacentHTML("beforeend", `<h4 class="adv-h4">Menos renta</h4>`);
  barList(rBody, { ...rOpts, rows: rentaRows(lo), max: rmax, ariaLabel: "Ciudades con menos renta" });

  // --- paro ------------------------------------------------------------------------------------------------------------
  const uBody = section(el, { title: "Paro", note: `Parados ÷ población activa según el Censo anual (${esc(data.vintage)}), que se declara en el propio censo y suele salir más alto que la EPA. Ciudades de ${count3(BIG_METRO)}+ habitantes.` });
  const uHost = document.createElement("div");
  let uLevel = "states";
  segmented(uBody, { label: "Zonas", value: uLevel, options: [{ value: "states", label: "Provincias" }, { value: "metros", label: "Grandes ciudades" }], onChange: (v) => { uLevel = v; drawU(); } });
  uBody.appendChild(uHost);
  function drawU() {
    uHost.innerHTML = "";
    const lvU = uLevel === "states" ? states : metros;
    const min = uLevel === "states" ? 0 : BIG_METRO;
    const high = topBy(lvU.rows, (r) => r.v.unemployment, { n: 8, min });
    const low = topBy(lvU.rows, (r) => r.v.unemployment, { n: 8, min, asc: true });
    const max = Math.max(...high.map((x) => x.v));
    const mk = (list) => list.map((x) => ({ key: x.r.key, label: x.r.name, sub: uLevel === "metros" ? x.r.sub : "", value: x.v, text: pct(x.v), tone: x.v > n.unemployment * 1.03 ? "bad" : x.v < n.unemployment * 0.97 ? "good" : null, row: x.r }));
    const o = { max, onHover: (r) => link.hover(r ? rowsHighlight(lvU, [r.row]) : null), onClick: (r) => lvU.focus(r.row) };
    uHost.insertAdjacentHTML("beforeend", `<h4 class="adv-h4">Más paro</h4>`);
    barList(uHost, { ...o, rows: mk(high), ariaLabel: "Más paro" });
    uHost.insertAdjacentHTML("beforeend", `<h4 class="adv-h4">Menos paro</h4>`);
    barList(uHost, { ...o, rows: mk(low), ariaLabel: "Menos paro" });
  }
  drawU();

  el.insertAdjacentHTML("beforeend", sourcesHtml(data, ["ine_adrh", "ine_censo"], [
    "La renta y la pobreza salen del Atlas de distribución de renta de los hogares (INE, a partir de datos fiscales); el paro, del Censo anual. Son años distintos.",
    "La pobreza es relativa: la parte de la población con ingresos por unidad de consumo bajo el 60 % de la mediana de España. No tiene en cuenta que la vida cuesta distinto en cada sitio.",
    "El ADRH no publica datos de los municipios más pequeños (secreto estadístico): esos puntos faltan en la gráfica.",
    "La renta de las provincias es la media de sus municipios ponderada por población; la pobreza provincial no se publica en estas tablas.",
    ...(data.countiesOffMap ? [`${int(data.countiesOffMap)} de los municipios más pequeños caben en menos de un hexágono, así que al seleccionarlos no se marca nada en el mapa.`] : []),
  ]));

  return {
    onMapHover(h) {
      const l = lv();
      const r = h.cell >= 0 ? l.rowAtCell(h.cell) : null;
      scatter.setHot(r ? r.key : null);
      richTable.setHot(r ? r.key : null);
      if (povHist && counties) {
        const c = h.cell >= 0 ? counties.rowAtCell(h.cell) : null;
        povHist.setHot(c ? povHist.binOf(c.v.poverty)?.i ?? null : null);
      }
    },
    onEscape() {
      if (scatter.selected) { clearSel(); return true; }
      return false;
    },
  };
}
