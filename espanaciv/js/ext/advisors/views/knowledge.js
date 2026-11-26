// Consejero de Conocimiento: estudios superiores y el rendimiento de Ciencia (España). En usaciv también miraba la
// banda ancha; aquí no hay un dato municipal equivalente en las fuentes usadas, así que se cruzan estudios, renta y edad.
import { esc, fin, ratio, colorScale, robustDomain, RAMPS } from "../core/util.js";
import { money, pct, int, count3, fmtShort } from "../core/fmt.js";
import { barList, histogram, rampLegend } from "../core/charts.js";
import { createTable } from "../core/table.js";
import { createScatter } from "../core/scatter.js";
import { section, tiles, segmented, mapPicker, frameBtn, sourcesHtml, topBy } from "../core/view.js";
import { rowsHighlight } from "../core/data.js";
import { scienceLens } from "../core/lenses.js";

const METRO_MIN = 100000;
const euros = (v) => (fin(v) ? `${int(v)} €` : "–");

export function mount(ctx) {
  const { app, data, el, link } = ctx;
  const n = data.nat;
  const nation = app.data.nation;
  const { metros, counties } = data.levels;
  const sci = nation.yields?.find((y) => y.key === "science");
  const esSci = n.yields?.science ?? nation.nation?.yields?.science;
  const esShare = ratio(esSci, n.employed);
  const wavg = (k) => {
    if (!counties) return null;
    let a = 0, w = 0;
    for (const r of counties.rows) if (fin(r.v[k]) && fin(r.v.population)) { a += r.v[k] * r.v.population; w += r.v.population; }
    return w ? a / w : null;
  };
  const natDeg = nation.nation?.estudios_sup ?? wavg("bachelors");

  el.insertAdjacentHTML("beforeend", tiles([
    { label: "Ocupados de ciencia", value: count3(esSci), sub: `${pct(esShare)} de los ocupados`, color: sci?.color },
    { label: "Con estudios superiores", value: pct(natDeg), sub: "población de 16+ años (Censo)" },
    { label: "Ciudades", value: int(metros.rows.length), sub: `${int(metros.rows.filter((r) => (r.v.population || 0) >= METRO_MIN).length)} con ${count3(METRO_MIN)}+ hab.` },
  ]));

  // --- el mapa: estudios por defecto (el eje x de la gráfica) o la parte de Ciencia por ciudad ---------------------
  const mapRow = document.createElement("div");
  mapRow.className = "adv-sec adv-mapsec";
  el.appendChild(mapRow);
  const picker = mapPicker(ctx, mapRow, {
    value: counties ? "degrees" : "science",
    options: [
      ...(counties ? [{ value: "degrees", label: "Estudios", lens: () => "degrees" }] : []),
      { value: "science", label: "Empleos de ciencia", lens: () => scienceLens(data) },
      { value: "income", label: "Renta", lens: () => "income" },
      { value: "terrain", label: "Relieve", lens: () => null },
    ],
  });

  // --- rendimiento de Ciencia -------------------------------------------------------------------------------------
  const sBody = section(el, { title: "El rendimiento de Ciencia", note: `${esc(sci?.description || "Ocupados en actividades profesionales, científicas y técnicas y en información y comunicaciones.")} El orden por peso solo incluye ciudades de ${count3(METRO_MIN)}+ habitantes.` });
  const sHost = document.createElement("div");
  let mode = "share";
  segmented(sBody, { label: "Ordenar por", value: mode, options: [{ value: "share", label: "Peso en ocupados" }, { value: "abs", label: "Más ocupados" }], onChange: (v) => { mode = v; drawSci(); } });
  const sMap = document.createElement("button");
  sMap.type = "button";
  sMap.className = "adv-mini";
  sMap.textContent = "Colorear el mapa por empleos de ciencia";
  sMap.addEventListener("click", () => picker.set("science"));
  sBody.querySelector(".adv-seg")?.after(sMap);
  sBody.appendChild(sHost);
  const share = (r) => ratio(r.v.y_science, r.v.employed);
  function drawSci() {
    sHost.innerHTML = "";
    const list = mode === "abs" ? topBy(metros.rows, (r) => r.v.y_science, { n: 12 }) : topBy(metros.rows, share, { n: 12, min: METRO_MIN });
    barList(sHost, {
      rank: true, ariaLabel: "Ciudades de la ciencia",
      rows: list.map((x) => ({ key: x.r.key, label: x.r.name, sub: mode === "abs" ? pct(share(x.r)) : `×${(share(x.r) / esShare).toFixed(2).replace(".", ",")} España`, value: x.v, text: mode === "abs" ? count3(x.v) : pct(x.v), color: sci?.color, row: x.r })),
      onHover: (r) => link.hover(r ? rowsHighlight(metros, [r.row]) : null),
      onClick: (r) => metros.focus(r.row),
    });
  }
  drawSci();

  if (!counties) {
    el.insertAdjacentHTML("beforeend", `<p class="adv-empty pad">Falta counties.json, así que no hay gráficas de municipios.</p>`);
    el.insertAdjacentHTML("beforeend", sourcesHtml(data, ["ine_censo"], []));
    return {};
  }

  // --- estudios frente a renta ------------------------------------------------------------------------------------
  const dBody = section(el, { title: "Estudios y renta", note: "Parte de la población con estudios superiores (FP de grado superior, grado universitario, máster o doctorado) frente a la renta neta por persona; color = edad media. Arrastra para seleccionar; pasa por el mapa para encontrar un lugar." });
  const dCtl = document.createElement("div");
  dCtl.className = "adv-row";
  dBody.appendChild(dCtl);
  let level = "counties";
  segmented(dCtl, { label: "Lugares", value: level, options: [{ value: "counties", label: "Municipios" }, { value: "metros", label: "Ciudades" }], onChange: (v) => { level = v; drawDeg(); } });
  const lv = () => data.levels[level];
  const ageDom = robustDomain(counties.rows.map((r) => r.v.median_age), 0.02) || [38, 55];
  const ageColor = colorScale({ type: "seq", domain: ageDom, ramp: RAMPS.seq });
  const scatter = createScatter(dBody, {
    height: 300, points: [],
    x: { label: "Con estudios superiores", fmt: (v) => fmtShort("pct", v) },
    y: { label: "Renta neta por persona", fmt: money, log: true },
    size: { label: "Población", fmt: count3, max: 14, min: 1.4 },
    color: (c) => ageColor(c), colorLabel: "Edad media", colorFmt: (v) => `${(+v).toFixed(0)} años`,
    onHover: (p) => link.hover(p ? rowsHighlight(lv(), [p.row]) : null),
    onClick: (p) => lv().focus(p.row),
    onBrush: (set) => {
      const sel = set ? lv().rows.filter((r) => set.has(r.key)) : [];
      link.base(sel.length ? rowsHighlight(lv(), sel, { dim: true }) : null, { frame: sel.length > 1 });
      selInfo.innerHTML = sel.length ? `<b>${int(sel.length)}</b> ${level === "counties" ? "municipios" : "ciudades"} · ${count3(sel.reduce((a, r) => a + (r.v.population || 0), 0))} habitantes ${frameBtn()}<button type="button" class="adv-mini" data-clear>Quitar</button>` : "";
    },
  });
  dBody.insertAdjacentHTML("beforeend", rampLegend({ ramp: RAMPS.seq, domain: ageDom, fmt: (v) => `${Math.round(v)}`, label: "Edad media (años)" }));
  const selInfo = document.createElement("div");
  selInfo.className = "adv-brushinfo";
  dBody.appendChild(selInfo);
  const clearSel = () => { scatter.setSelected(null); link.base(null); selInfo.innerHTML = ""; };
  selInfo.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) clearSel(); });
  function drawDeg() {
    clearSel();
    const rows = lv().rows.filter((r) => fin(r.v.bachelors) && fin(r.v.income));
    scatter.update({
      points: rows.map((r) => ({ key: r.key, x: r.v.bachelors, y: r.v.income, s: r.v.population, c: r.v.median_age, label: r.name, sub: r.sub, row: r })),
      labels: topBy(rows, (r) => r.v.population, { n: 6 }).map((x) => x.r.key),
    });
  }
  drawDeg();

  // --- titulados por municipio ------------------------------------------------------------------------------------
  const bBody = section(el, { title: "Dónde hay más y menos titulados", note: "Municipios según la parte de su población con estudios superiores. Pasa por una barra para marcar esos municipios; la tabla los lista todos." });
  const bHost = document.createElement("div");
  bBody.appendChild(bHost);
  const degHist = histogram(bHost, {
    values: counties.rows.map((r) => ({ key: r.key, v: r.v.bachelors, w: r.v.population })), bins: 30, domain: [0, 0.75], height: 120,
    fmt: (v) => fmtShort("pct", v), unitLabel: "municipios", label: "Histograma de los titulados por municipio",
    colorOf: (_, t) => colorScale({ type: "seq", domain: [0, 1], ramp: RAMPS.seq })(t),
    markers: fin(natDeg) ? [{ v: natDeg, label: `España ${pct(natDeg)}` }] : [],
    onHover: (bin) => link.hover(bin ? rowsHighlight(counties, bin.keys.map((k) => counties.byKey.get(k)), { dim: true }) : null),
  });
  const degTable = createTable(bBody, {
    caption: "Estudios por municipio", rank: true, maxHeight: 240, search: "Buscar municipios",
    rows: counties.rows.filter((r) => fin(r.v.bachelors)),
    columns: [
      { key: "name", label: "Municipio", align: "l", value: (r) => r.name, html: (r) => `${esc(r.name)} <span class="sub">${esc(r.sub)}</span>` },
      { key: "population", label: "Habitantes", value: (r) => r.v.population, text: (r) => count3(r.v.population) },
      { key: "bachelors", label: "Estudios sup.", value: (r) => r.v.bachelors, text: (r) => pct(r.v.bachelors), bar: { max: 0.8, color: "rgba(74,134,214,.4)" } },
      { key: "income", label: "Renta", value: (r) => r.v.income, text: (r) => euros(r.v.income) },
    ],
    sort: { key: "bachelors", dir: "desc" },
    onHover: (r) => link.hover(r ? rowsHighlight(counties, [r]) : null),
    onClick: (r) => counties.focus(r),
  });
  ctx.cleanup(() => degTable.destroy());

  el.insertAdjacentHTML("beforeend", sourcesHtml(data, ["ine_censo", "ine_adrh"], [
    "Los ocupados de ciencia se cuentan donde viven (Censo), no donde trabajan, y abarcan ramas enteras: cuenta el recepcionista de un bufete y no el investigador de un hospital.",
    "Estudios superiores = FP de grado superior, grados, másteres y doctorados, sobre la población de 16 y más años. En los municipios muy pequeños el INE redondea o protege los datos.",
    "El mapa de empleos de ciencia solo colorea las ciudades (los hexágonos grises quedan fuera), porque el Censo publica el empleo por rama solo para municipios grandes.",
    ...(data.countiesOffMap ? [`${int(data.countiesOffMap)} de los municipios más pequeños caben en menos de un hexágono, así que al seleccionarlos no se marca nada en el mapa.`] : []),
  ]));

  return {
    onMapHover(h) {
      const r = h.cell >= 0 ? lv().rowAtCell(h.cell) : null;
      scatter.setHot(r ? r.key : null);
      const c = h.cell >= 0 ? counties.rowAtCell(h.cell) : null;
      degHist.setHot(c ? degHist.binOf(c.v.bachelors)?.i ?? null : null);
    },
    onEscape() {
      if (scatter.selected) { clearSel(); return true; }
      return false;
    },
  };
}
