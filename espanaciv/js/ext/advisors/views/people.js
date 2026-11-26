// Consejero de Población: población, crecimiento, densidad, edad e inmigración.
import { esc, fin, colorScale, robustDomain, RAMPS } from "../core/util.js";
import { pct, int, signedPct, count3, fmtShort, fmtValue } from "../core/fmt.js";
import { barList, histogram, rampLegend } from "../core/charts.js";
import { createScatter } from "../core/scatter.js";
import { section, tiles, segmented, mapPicker, frameBtn, sourcesHtml, topBy } from "../core/view.js";
import { rowsHighlight } from "../core/data.js";
import { growthLens } from "../core/lenses.js";

const METRO_MIN = 100000;

export function mount(ctx) {
  const { app, data, el, link } = ctx;
  const n = data.nat;
  const { states, metros, counties } = data.levels;
  const yrs = n.growth_years || [];

  el.insertAdjacentHTML("beforeend", tiles([
    { label: "Habitantes", value: count3(n.population), sub: "Padrón municipal" },
    { label: `Crecimiento ${yrs.join("–")}`, value: signedPct(n.growth, 2), sub: "Padrón municipal" },
    { label: "Ciudades", value: int(metros.rows.length), sub: counties ? `${int(counties.rows.length)} municipios` : "" },
  ]));

  // --- the map: growth by default, so the map tells the same story as the first chart ---------------------------
  let gLevel = "metros";
  const mapRow = document.createElement("div");
  mapRow.className = "adv-sec adv-mapsec";
  el.appendChild(mapRow);
  const lensOpt = (value, label, id) => ({ value, label, lens: () => id });
  const picker = mapPicker(ctx, mapRow, {
    value: "growth",
    options: [
      { value: "growth", label: "Crecimiento", lens: () => growthLens(data, gLevel) },
      ...(counties ? [lensOpt("density", "Densidad", "density"), lensOpt("age", "Edad", "age"), lensOpt("foreign_born", "Nacidos fuera", "foreign_born")] : []),
      { value: "terrain", label: "Relieve", lens: () => null },
    ],
  });

  // --- growth ---------------------------------------------------------------------------------------------------
  const gBody = section(el, { title: "Quién crece y quién mengua", note: `Cambio de población ${yrs.join("–")} según el Padrón municipal, con los términos municipales de hoy. Ciudades de ${count3(METRO_MIN)}+ habitantes.` });
  const gHost = document.createElement("div");
  segmented(gBody, { label: "Areas", value: gLevel, options: [{ value: "metros", label: "Ciudades" }, { value: "states", label: "Provincias" }], onChange: (v) => { gLevel = v; drawGrowth(); if (picker.value === "growth") picker.refresh(); } });
  gBody.appendChild(gHost);
  function drawGrowth() {
    gHost.innerHTML = "";
    const lv = gLevel === "metros" ? metros : states;
    const min = gLevel === "metros" ? METRO_MIN : 0;
    const fast = topBy(lv.rows, (r) => r.v.growth, { n: 8, min });
    const slow = topBy(lv.rows, (r) => r.v.growth, { n: 8, min, asc: true });
    const max = Math.max(...[...fast, ...slow].map((x) => Math.abs(x.v)));
    const mk = (list) => list.map((x) => ({ key: x.r.key, label: x.r.name, sub: gLevel === "metros" ? x.r.sub : "", value: x.v, text: signedPct(x.v), tone: x.v >= 0 ? "good" : "bad", row: x.r }));
    const opts = {
      diverging: true, max,
      onHover: (r) => link.hover(r ? rowsHighlight(lv, [r.row]) : null),
      onClick: (r) => lv.focus(r.row),
    };
    gHost.insertAdjacentHTML("beforeend", `<h4 class="adv-h4">Las que más crecen</h4>`);
    barList(gHost, { ...opts, rows: mk(fast), ariaLabel: "Las que más crecen" });
    gHost.insertAdjacentHTML("beforeend", `<h4 class="adv-h4">${slow.every((x) => x.v < 0) ? "Las que pierden población" : "Las que menos crecen"}</h4>`);
    barList(gHost, { ...opts, rows: mk(slow), ariaLabel: "Las que menos crecen" });
  }
  drawGrowth();

  if (!counties) {
    el.insertAdjacentHTML("beforeend", `<p class="adv-empty pad">Falta counties.json, así que no hay gráficas de municipios.</p>`);
    el.insertAdjacentHTML("beforeend", sourcesHtml(data, ["ine_padron", "ine_censo"], []));
    return {};
  }

  // --- density --------------------------------------------------------------------------------------------------
  const dBody = section(el, { title: "Lo llena y lo vacía", note: "Municipios según habitantes por km² (escala logarítmica). Cambia a <i>personas</i> para pesar cada municipio por su población: la mayoría de los españoles vive en la cola densa, mientras media España está casi vacía. Pasa por una barra para ver esos municipios; púlsala para dejarlos marcados." });
  const dCtl = document.createElement("div");
  dCtl.className = "adv-row";
  dBody.appendChild(dCtl);
  let weighted = false, pinnedBin = null;
  segmented(dCtl, { label: "Contar", value: "counties", options: [{ value: "counties", label: "Municipios" }, { value: "people", label: "Personas" }], onChange: (v) => { weighted = v === "people"; drawHist(); } });
  const dLens = document.createElement("button");
  dLens.type = "button";
  dLens.className = "adv-mini";
  dLens.textContent = "Colorear el mapa por densidad";
  dLens.addEventListener("click", () => picker.set("density"));
  dCtl.appendChild(dLens);
  const histHost = document.createElement("div");
  dBody.appendChild(histHost);
  const binInfo = document.createElement("div");
  binInfo.className = "adv-brushinfo";
  dBody.appendChild(binInfo);
  let hist = null;
  const usDensity = counties.rows.reduce((a, r) => a + (r.v.population || 0), 0) / counties.rows.reduce((a, r) => a + (r.v.land_km2 || 0), 0);
  const cByKey = counties.byKey;
  const densRamp = RAMPS.heat;
  function drawHist() {
    histHost.innerHTML = "";
    const vals = counties.rows.map((r) => ({ key: r.key, v: r.v.density, w: r.v.population }));
    const dom = [0.3, 30000];
    hist = histogram(histHost, {
      values: vals, log: true, bins: 30, domain: dom, weighted, height: 130,
      fmt: (v) => fmtShort("float", v), unitLabel: "municipios", weightFmt: (w) => `${count3(w)} habitantes`,
      label: "Histograma de la densidad de los municipios",
      colorOf: (_, t) => colorScale({ type: "seq", domain: [0, 1], ramp: densRamp })(t),
      markers: [{ v: usDensity, label: "Media de España" }],
      onHover: (bin) => link.hover(bin ? rowsHighlight(counties, bin.keys.map((k) => cByKey.get(k)), { dim: true }) : null),
      onClick: (bin) => {
        pinnedBin = pinnedBin === bin.i ? null : bin.i;
        const rows = pinnedBin != null ? bin.keys.map((k) => cByKey.get(k)) : [];
        link.base(rows.length ? rowsHighlight(counties, rows, { dim: true }) : null, { frame: rows.length > 1 });
        binInfo.innerHTML = rows.length ? `<b>${int(rows.length)}</b> municipios de ${fmtShort("float", bin.x0)}–${fmtShort("float", bin.x1)} hab./km² · ${count3(rows.reduce((a, r) => a + (r.v.population || 0), 0))} habitantes ${frameBtn()}<button type="button" class="adv-mini" data-clear>Quitar</button>` : "";
      },
    });
  }
  binInfo.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) { pinnedBin = null; link.base(null); binInfo.innerHTML = ""; } });
  drawHist();

  // --- age and foreign-born -------------------------------------------------------------------------------------
  const aBody = section(el, { title: "Edad e inmigración", note: "Cada punto es un municipio: edad media en horizontal, nacidos en el extranjero en vertical, tamaño = población, color = densidad. Arrastra un rectángulo para seleccionar municipios y se iluminan en el mapa. Pasa por el mapa para encontrar aquí un municipio." });
  const aCtl = document.createElement("div");
  aCtl.className = "adv-row";
  aBody.appendChild(aCtl);
  aCtl.innerHTML = `<span class="adv-note">Colorear el mapa por</span><button type="button" class="adv-mini" data-map="age">edad media</button><button type="button" class="adv-mini" data-map="foreign_born">nacidos fuera</button>`;
  aCtl.addEventListener("click", (e) => { const v = e.target.closest("[data-map]")?.dataset.map; if (v) picker.set(v); });
  const dDom = robustDomain(counties.rows.map((r) => r.v.density), 0.02, true) || [1, 2000];
  const dColor = colorScale({ type: "seq", domain: dDom, log: true, ramp: RAMPS.heat });
  const big = topBy(counties.rows, (r) => r.v.population, { n: 6 }).map((x) => x.r.key);
  const scatter = createScatter(aBody, {
    height: 310,
    points: counties.rows.map((r) => ({ key: r.key, x: r.v.median_age, y: r.v.foreign_born, s: r.v.population, c: r.v.density, label: r.name, sub: r.sub, row: r })),
    x: { label: "Edad media", fmt: (v) => String(+v.toFixed(0)) },
    y: { label: "Nacidos en el extranjero", fmt: (v) => fmtShort("pct", v) },
    size: { label: "Población", fmt: count3, max: 14, min: 1.4 },
    color: (c) => dColor(c), colorLabel: "Densidad", colorFmt: (v) => `${fmtValue("float", v)} /km²`,
    labels: big,
    refX: fin(medianOf(counties.rows, "median_age")) ? [{ v: medianOf(counties.rows, "median_age"), label: "municipio mediano" }] : [],
    onHover: (p) => link.hover(p ? rowsHighlight(counties, [p.row]) : null),
    onClick: (p) => counties.focus(p.row),
    onBrush: (set) => {
      const sel = set ? counties.rows.filter((r) => set.has(r.key)) : [];
      link.base(sel.length ? rowsHighlight(counties, sel, { dim: true }) : null, { frame: sel.length > 1 });
      selInfo.innerHTML = sel.length ? selSummary(sel) : "";
    },
  });
  aBody.insertAdjacentHTML("beforeend", rampLegend({ ramp: RAMPS.heat, domain: dDom, log: true, fmt: (v) => fmtShort("float", v), label: "Habitantes por km²" }));
  const selInfo = document.createElement("div");
  selInfo.className = "adv-brushinfo";
  aBody.appendChild(selInfo);
  function selSummary(sel) {
    const pop = sel.reduce((a, r) => a + (r.v.population || 0), 0);
    const top = [...sel].sort((a, b) => (b.v.population || 0) - (a.v.population || 0)).slice(0, 5);
    return `<b>${int(sel.length)}</b> municipios · ${count3(pop)} habitantes (${pct(pop / n.population)} de España)<br><span class="sub">Los mayores: ${top.map((r) => `${esc(r.name)}, ${esc(r.sub)}`).join(" · ")}</span> ${frameBtn()}<button type="button" class="adv-mini" data-clear>Quitar</button>`;
  }
  selInfo.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) { scatter.setSelected(null); link.base(null); selInfo.innerHTML = ""; } });

  el.insertAdjacentHTML("beforeend", sourcesHtml(data, ["ine_padron", "ine_adrh", "ine_censo", "es_atlas"], [
    "El mapa de crecimiento colorea cada ciudad por su propio cambio; los hexágonos grises quedan fuera de ellas. Cambia la gráfica a Provincias para colorear cada hexágono por su provincia.",
    "El crecimiento compara dos padrones con los municipios de hoy: las fusiones y segregaciones de municipios se suman al municipio actual.",
    "La edad media sale del Atlas de distribución de renta (ADRH) y los nacidos en el extranjero del Censo anual: son años distintos.",
    "Cada punto muestra la edad media de un municipio; la de un grupo de municipios no es la media de sus medias.",
    ...(data.countiesOffMap ? [`${int(data.countiesOffMap)} de los municipios más pequeños caben en menos de un hexágono, así que al seleccionarlos no se marca nada en el mapa.`] : []),
  ]));

  return {
    onMapHover(h) {
      const r = h.cell >= 0 ? counties.rowAtCell(h.cell) : null;
      scatter.setHot(r ? r.key : null);
      hist?.setHot(r ? hist.binOf(r.v.density)?.i ?? null : null);
    },
    onEscape() {
      if (scatter.selected || pinnedBin != null) {
        scatter.setSelected(null); pinnedBin = null; link.base(null); selInfo.innerHTML = ""; binInfo.innerHTML = "";
        return true;
      }
      return false;
    },
  };
}

function medianOf(rows, k) {
  const s = rows.map((r) => r.v[k]).filter(fin).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
}
