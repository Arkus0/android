// Consejero de Cultura («Guardián de las maravillas»), versión España: las maravillas por regla publicada (wonders.json:
// Patrimonio Mundial de la UNESCO y parques nacionales), cuándo se inscribió cada bien, dónde se concentran y el
// rendimiento de Cultura (ocupados en artes y ocio) por ciudad. En usaciv también miraba religión, bienestar y
// desastres (fuentes de EE. UU. sin equivalente directo aquí).
import { esc, fin, ratio, el as mk } from "../core/util.js";
import { int, pct, count3 } from "../core/fmt.js";
import { barList } from "../core/charts.js";
import { section, tiles, segmented, sourcesHtml, topBy } from "../core/view.js";
import { rowsHighlight } from "../core/data.js";
import { frameBox, focusPoint } from "../core/frame.js";

const KIND = {
  natural: { label: "Naturaleza", color: "#6aa84f" },
  university: { label: "Universidades", color: "#4a86d6" },
  landmark: { label: "Monumentos", color: "#e0b54c" },
};
const RULE_TITLE = { unesco: "Patrimonio Mundial", national_park: "Parques nacionales" };
const METRO_MIN = 100000;

export async function mount(ctx) {
  const { app, data, el, link } = ctx;
  const won = await app.loadData("wonders");
  const { states: stLevel, metros } = data.levels;
  const nation = app.data.nation;
  const cult = nation.yields?.find((y) => y.key === "culture");
  const n = data.nat;
  const esCult = n.yields?.culture ?? nation.nation?.yields?.culture;
  const esShare = ratio(esCult, n.employed);

  // --- titulares --------------------------------------------------------------------------------------------------
  const wonders = (won?.wonders || []).map((w) => ({ ...w, key: w.id }));
  const byRule = (id) => wonders.filter((w) => w.rule === id).length;
  el.insertAdjacentHTML("beforeend", tiles([
    { label: "Maravillas", value: int(wonders.length), sub: `${byRule("unesco")} de la UNESCO · ${byRule("national_park")} parques` },
    { label: "Patrimonio Mundial", value: int(won?.national?.unesco ?? byRule("unesco")), sub: "bienes inscritos" },
    { label: "Ocupados de cultura", value: count3(esCult), sub: fin(esShare) ? `${pct(esShare)} de los ocupados` : "", color: cult?.color },
  ]));

  // --- maravillas -------------------------------------------------------------------------------------------------
  let wonderBars = [];
  const bubbles = ctx.bubbles("wonders", {
    rMax: 9, minR: 9, alpha: 0.28,
    tip: (b) => `<b>${esc(b.it.name)}</b><br>${esc(RULE_TITLE[b.it.rule] || b.it.kind)} n.º ${b.it.rank} · ${esc(metricText(b.it))}`,
    onHover: (b) => { for (const w of wonderBars) w.setHot(b ? b.key : null); },
    onClick: (b) => flyTo(b.it),
  });
  if (won && wonders.length) {
    const wBody = section(el, { title: "Maravillas", kicker: "Cada una elegida por una regla publicada", note: "Pasa por una maravilla para encontrarla en el mapa; púlsala para volar allí. Los bienes de la UNESCO van numerados por año de inscripción; los parques nacionales, por orden de declaración." });
    let kind = "all";
    segmented(wBody, {
      label: "Tipo", value: kind,
      options: [{ value: "all", label: "Todas" }, ...Object.entries(KIND).filter(([k]) => wonders.some((w) => w.kind === k)).map(([k, v]) => ({ value: k, label: v.label }))],
      onChange: (v) => { kind = v; drawWonders(); },
    });
    const wHost = mk("div");
    wBody.appendChild(wHost);
    function drawWonders() {
      wHost.innerHTML = "";
      wonderBars = [];
      const vis = wonders.filter((w) => kind === "all" || w.kind === kind);
      for (const rule of won.rules || []) {
        const list = vis.filter((w) => w.rule === rule.id);
        if (!list.length) continue;
        wHost.insertAdjacentHTML("beforeend", `<h4 class="adv-h4">${esc(RULE_TITLE[rule.id] || rule.id)}</h4><p class="adv-note adv-rule">${esc(rule.text)}</p>`);
        const host = mk("div");
        wHost.appendChild(host);
        wonderBars.push(barList(host, {
          rank: true, compact: true, ariaLabel: RULE_TITLE[rule.id] || rule.id,
          rows: list.map((w) => ({ key: w.key, label: w.short || w.name, full: w.name, sub: stName(w.state), value: null, text: metricText(w), color: KIND[w.kind]?.color })),
          onHover: (r) => {
            const w = r ? wonders.find((x) => x.key === r.key) : null;
            link.hover(w ? { cells: new Set(w.cells && w.cells.length ? w.cells : w.cell != null ? [w.cell] : []), label: w.short || w.name } : null);
            bubbles.setHot(w ? w.key : null);
          },
          onClick: (r) => flyTo(wonders.find((x) => x.key === r.key)),
        }));
      }
      bubbles.set(vis.filter((w) => fin(w.x) && fin(w.y)).map((w) => ({ key: w.key, x: w.x, y: w.y, value: 1, color: KIND[w.kind]?.color || "#ccc", it: w })), { vMax: 1 });
    }
    drawWonders();
    wBody.insertAdjacentHTML("beforeend", `<p class="adv-note">En el mapa: <i class="dot" style="background:${KIND.natural.color}"></i>naturaleza · <i class="dot" style="background:${KIND.university.color}"></i>universidad · <i class="dot" style="background:${KIND.landmark.color}"></i>monumento.</p>`);

    // --- la UNESCO por años ---------------------------------------------------------------------------------------
    const unesco = wonders.filter((w) => w.rule === "unesco" && fin(w.metrics?.inscribed));
    if (unesco.length) {
      const yBody = section(el, { title: "Cuándo entró cada bien en la lista", note: "Bienes españoles inscritos como Patrimonio Mundial, por año de inscripción. Pasa por una columna para ver cuáles son." });
      const y0 = Math.min(...unesco.map((w) => w.metrics.inscribed)), y1 = Math.max(...unesco.map((w) => w.metrics.inscribed));
      const years = [];
      for (let y = y0; y <= y1; y++) years.push({ year: y, list: unesco.filter((w) => w.metrics.inscribed === y) });
      const chart = columnChart(years, (y) => y.list.length, (y) => `${y.year}: ${y.list.length ? y.list.map((w) => w.short || w.name).join(", ") : "ninguno"}`);
      yBody.appendChild(chart);
      chart.querySelectorAll(".bin").forEach((g, i) => {
        g.addEventListener("mouseenter", () => {
          const ws = years[i].list;
          link.hover(ws.length ? { cells: new Set(ws.flatMap((w) => (w.cells && w.cells.length ? w.cells : w.cell != null ? [w.cell] : []))), label: `${years[i].year}` } : null);
        });
        g.addEventListener("mouseleave", () => link.hover(null));
      });
    }
  } else el.insertAdjacentHTML("beforeend", `<p class="adv-empty pad">Falta wonders.json.</p>`);

  // --- dónde se concentran ------------------------------------------------------------------------------------------
  let stBars = null;
  if (wonders.length) {
    const cBody = section(el, { title: "Dónde se concentran", note: "Maravillas por provincia (cada bien en serie cuenta una vez, donde está su punto). Pasa por una provincia para iluminarla; púlsala para abrirla." });
    const cnt = new Map();
    for (const w of wonders) if (w.state) cnt.set(w.state, (cnt.get(w.state) || 0) + 1);
    const rows = stLevel.rows.filter((r) => cnt.get(r.key)).sort((a, b) => cnt.get(b.key) - cnt.get(a.key) || a.name.localeCompare(b.name, "es")).slice(0, 14);
    stBars = barList(cBody, {
      rank: true, ariaLabel: "Maravillas por provincia",
      rows: rows.map((r) => ({ key: r.key, label: r.name, sub: r.sub, value: cnt.get(r.key), text: int(cnt.get(r.key)), color: KIND.landmark.color, row: r })),
      onHover: (x) => link.hover(x ? rowsHighlight(stLevel, [x.row]) : null),
      onClick: (x) => stLevel.focus(x.row),
    });
  }

  // --- rendimiento de Cultura ---------------------------------------------------------------------------------------
  const sBody = section(el, { title: "El rendimiento de Cultura", note: `${esc(cult?.description || "Ocupados en actividades artísticas, recreativas y de entretenimiento.")} El orden por peso solo incluye ciudades de ${count3(METRO_MIN)}+ habitantes.` });
  const sHost = mk("div");
  let mode = "share";
  segmented(sBody, { label: "Ordenar por", value: mode, options: [{ value: "share", label: "Peso en ocupados" }, { value: "abs", label: "Más ocupados" }], onChange: (v) => { mode = v; drawCult(); } });
  sBody.appendChild(sHost);
  const share = (r) => ratio(r.v.y_culture, r.v.employed);
  function drawCult() {
    sHost.innerHTML = "";
    const list = mode === "abs" ? topBy(metros.rows, (r) => r.v.y_culture, { n: 12 }) : topBy(metros.rows, share, { n: 12, min: METRO_MIN });
    barList(sHost, {
      rank: true, ariaLabel: "Ciudades de la cultura",
      rows: list.map((x) => ({ key: x.r.key, label: x.r.name, sub: mode === "abs" ? pct(share(x.r)) : fin(esShare) ? `×${(share(x.r) / esShare).toFixed(2).replace(".", ",")} España` : "", value: x.v, text: mode === "abs" ? count3(x.v) : pct(x.v), color: cult?.color, row: x.r })),
      onHover: (r) => link.hover(r ? rowsHighlight(metros, [r.row]) : null),
      onClick: (r) => metros.focus(r.row),
    });
  }
  drawCult();

  el.insertAdjacentHTML("beforeend", sourcesHtml(data, ["wikidata", "ine_censo"], [
    "Los bienes de la UNESCO y los parques nacionales salen de Wikidata (coordenadas y fechas). Un bien en serie (Camino de Santiago, arte rupestre…) se dibuja en un solo punto, el de su elemento principal.",
    "Los parques nacionales que ya son Patrimonio de la Humanidad en la misma casilla (Doñana, Teide, Garajonay…) se cuentan una sola vez, como bien de la UNESCO.",
    "Los ocupados de cultura se cuentan donde viven (Censo) e incluyen el deporte y los juegos de azar.",
  ]));

  return {
    onMapHover(h) {
      const owner = h.cell >= 0 ? app.w.raw.owner[h.cell] : -1;
      const sr = owner >= 0 ? stLevel.rows[owner] : null;
      stBars?.setHot?.(sr ? sr.key : null);
      if (h.item?.kind === "wonder") for (const w of wonderBars) w.setHot(h.item.data?.id ?? null);
    },
    onMapClick(ev) {
      if (ev.item?.kind !== "wonder") return false;
      flyTo(wonders.find((w) => w.id === ev.item.data?.id));
      return true;
    },
  };

  function stName(abbr) { return stLevel.byKey.get(abbr)?.name || abbr || ""; }
  function flyTo(w) {
    if (!w) return;
    if (w.cells && w.cells.length > 2) {
      const b = app.highlightBounds({ cells: new Set(w.cells) });
      if (b) return frameBox(app, b, { pad: 60, maxScale: 3 });
    }
    focusPoint(app, w.x, w.y, Math.min(app.cam.maxScale, Math.max(app.cam.scale, (app.cam.fitScale || 1) * 3.2)));
  }
}

function metricText(w) {
  const m = w.metrics || {};
  if (w.rule === "unesco") return fin(m.inscribed) ? `inscrito en ${m.inscribed}${m.parts > 1 ? ` · ${m.parts} partes` : ""}` : "UNESCO";
  if (w.rule === "national_park") return fin(m.declared) ? `declarado en ${m.declared}` : "parque nacional";
  return "";
}

/** Gráfica de columnas SVG (una columna por año). */
function columnChart(items, val, label) {
  const W = 400, H = 110, m = { l: 4, r: 4, t: 6, b: 18 };
  const max = Math.max(1, ...items.map(val));
  const bw = (W - m.l - m.r) / items.length;
  const div = document.createElement("div");
  div.className = "adv-hist adv-cols-chart";
  const first = items[0]?.year, last = items[items.length - 1]?.year;
  div.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none" role="img" aria-label="Inscripciones por año">
    ${items.map((it, i) => { const h = (val(it) / max) * (H - m.t - m.b); return `<g class="bin"><rect class="hit" x="${(m.l + i * bw).toFixed(2)}" y="${m.t}" width="${bw.toFixed(2)}" height="${H - m.t - m.b}"/><rect class="bar" x="${(m.l + i * bw + 0.4).toFixed(2)}" y="${(H - m.b - h).toFixed(2)}" width="${Math.max(0.5, bw - 0.8).toFixed(2)}" height="${h.toFixed(2)}" fill="#e0b54c"/><title>${esc(label(it))}</title></g>`; }).join("")}
    <line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b + 0.5}" y2="${H - m.b + 0.5}" class="axis"/>
    <text x="${m.l}" y="${H - 5}" class="tick">${first ?? ""}</text><text x="${W - m.r}" y="${H - 5}" text-anchor="end" class="tick">${last ?? ""}</text>
    <text x="${m.l + 2}" y="${m.t + 9}" class="tick">máx. ${max}</text>
  </svg>`;
  return div;
}
