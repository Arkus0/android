// City View "Citizens" rows: the metro's people as rows of small figures (citizens.json, ACS 1-year).
//
//   citizensHtml(m, data) → HTML      the rows (placeholders for the figure canvases)
//   mountCitizens(host, m, data)       paints the figures and wires the hover / focus read-out
//
// Each row: N figures (workforce 20, ages 10, commute 10 from the file; education and origins 10, rounded here with
// the same largest-remainder method), a caption ("each figure ≈ 72K workers"), a read-out line that a hovered or
// focused figure fills ("1 in 7 workers in San Jose is an engineer, coder or scientist (US: 1 in 14)"), and a thin
// U.S. bar for comparison. A row Census left out is said so, never drawn as zeros.
import { esc, int, pct } from "../../format.js";
import { compact } from "../../format.js";
import { CATEGORY_COLOR, figureCanvas, loadPainter } from "./figures.js";

const ROWS = [
  { id: "workforce", title: "Trabajo", sub: "por ocupación", noun: ["trabajador", "trabajadores"], n: null },
  { id: "age", title: "Generaciones", sub: "por edad", noun: ["vecino", "vecinos"], n: null },
  { id: "education", title: "Estudios", sub: "población de 15 años o más", noun: ["adulto", "mayores de 15 años"], n: 10 },
  { id: "nativity", title: "Orígenes", sub: "dónde nacieron los vecinos", noun: ["vecino", "vecinos"], n: 10 },
];

// [frase en singular, frase en plural] por categoría: «1 de cada 7 trabajadores de X es…» / «3 de cada 10… son…».
const PHRASE = {
  workforce: {
    executive: ["es directivo, gerente o gestor de empresa", "son directivos, gerentes o gestores de empresa"],
    engineer: ["es ingeniero, informático o científico", "son ingenieros, informáticos o científicos"],
    scholar: ["es docente, jurista o trabaja en la cultura", "son docentes, juristas o trabajan en la cultura"],
    healer: ["trabaja en la sanidad", "trabajan en la sanidad"],
    service: ["trabaja en hostelería, cuidados, limpieza o seguridad", "trabajan en hostelería, cuidados, limpieza o seguridad"],
    clerk: ["trabaja en el comercio o en una oficina", "trabajan en el comercio o en oficinas"],
    farmer: ["trabaja en el campo, la pesca o el monte", "trabajan en el campo, la pesca o el monte"],
    builder: ["construye, instala o repara", "construyen, instalan o reparan"],
    maker: ["trabaja en una fábrica, el transporte o un almacén", "trabajan en fábricas, el transporte o almacenes"],
  },
  age: {
    child: ["es menor de 16 años", "son menores de 16 años"],
    young: ["tiene entre 16 y 34 años", "tienen entre 16 y 34 años"],
    midlife: ["tiene entre 35 y 64 años", "tienen entre 35 y 64 años"],
    elder: ["tiene 65 años o más", "tienen 65 años o más"],
  },
  education: {
    less_than_hs: ["no pasó de la primaria", "no pasaron de la primaria"],
    high_school: ["terminó como mucho la ESO", "terminaron como mucho la ESO"],
    some_college: ["tiene bachillerato o FP de grado medio", "tienen bachillerato o FP de grado medio"],
    bachelors: ["tiene FP superior o un grado universitario", "tienen FP superior o un grado universitario"],
    graduate: ["tiene un máster o un doctorado", "tienen un máster o un doctorado"],
  },
  nativity: {
    born_in_state: ["nació en el mismo municipio", "nacieron en el mismo municipio"],
    other_state: ["nació en otro municipio de su comunidad", "nacieron en otro municipio de su comunidad"],
    native_abroad: ["nació en otra comunidad autónoma", "nacieron en otra comunidad autónoma"],
    foreign_born: ["nació en el extranjero", "nacieron en el extranjero"],
  },
};

// Etiquetas cortas de la leyenda.
const SHORT = {
  workforce: { executive: "Directivos", engineer: "Ingenieros", scholar: "Docencia y cultura", healer: "Sanidad", service: "Servicios",
    clerk: "Comercio y oficina", farmer: "Campo", builder: "Construcción", maker: "Fábrica y transporte" },
  age: { child: "Menos de 16", young: "16–34", midlife: "35–64", elder: "65+" },
  education: { less_than_hs: "Primaria", high_school: "ESO", some_college: "Bachiller / FP", bachelors: "Superiores", graduate: "Máster / doctorado" },
  nativity: { born_in_state: "Su municipio", other_state: "Su comunidad", native_abroad: "Otra comunidad", foreign_born: "Extranjero" },
};

/** Largest-remainder rounding of counts into n figures (the pipeline's method, for rows without figures). */
export function largestRemainder(counts, keys, n) {
  const tot = keys.reduce((a, k) => a + (counts[k] || 0), 0);
  if (!(tot > 0)) return null;
  const raw = keys.map((k) => ((counts[k] || 0) / tot) * n);
  const out = raw.map(Math.floor);
  let left = n - out.reduce((a, v) => a + v, 0);
  const order = raw.map((v, j) => [v - Math.floor(v), j]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; k < left; k++) out[order[k][1]]++;
  return Object.fromEntries(keys.map((k, j) => [k, out[j]]));
}

/** "1 de cada 7", "3 de cada 10", "menos de 1 de cada 1.000". */
export function oneIn(share) {
  if (share == null || !Number.isFinite(share)) return null;
  if (share <= 0) return { text: "ninguno de los", plural: true, none: true };
  if (share < 0.001) return { text: "menos de 1 de cada 1.000", plural: false };
  if (share >= 0.3) {
    const k = Math.round(share * 10);
    return k >= 10 ? { text: "casi todos los", plural: true, all: true } : { text: `${k} de cada 10`, plural: k !== 1 };
  }
  const n = Math.round(1 / share);
  return { text: `1 de cada ${int(n)}`, plural: false };
}

function sentence(rowId, key, share, natShare, cityName, noun) {
  const a = oneIn(share);
  if (!a) return "";
  const ph = PHRASE[rowId]?.[key] || ["está en este grupo", "están en este grupo"];
  const us = oneIn(natShare);
  const lead = a.text.charAt(0).toUpperCase() + a.text.slice(1);
  return `${lead} ${noun[1]} de ${cityName} ${a.plural ? ph[1] : ph[0]}${us ? ` (España: ${us.text.replace(/ los$/, "")})` : ""}`;
}

function rowModel(rowDef, row, nat, groups, figuresN) {
  const keys = (groups[rowDef.id] || []).map((g) => g.key);
  const n = figuresN[rowDef.id] ?? rowDef.n ?? 10;
  const figs = row.figures || largestRemainder(row.counts || {}, keys, n);
  const natFigs = nat?.figures || (nat ? largestRemainder(nat.counts || {}, keys, n) : null);
  return { keys, n, figs, natFigs };
}

// Specialists by row/key from the file (ratios from unrounded shares).
function specMap(city) {
  const m = new Map();
  for (const s of city?.specialists || []) m.set(`${s.row}|${s.key}`, s);
  return m;
}

/** The Citizens rows. data = citizens.json (or null / undefined while loading). */
export function citizensHtml(m, data) {
  const c = m.city;
  if (data === undefined) return `<p class="muted cv-note">Cargando a los ciudadanos…</p>`;
  if (!data || !data.cities) return `<p class="muted cv-note">Los datos de ciudadanos no están disponibles.</p>`;
  const row0 = data.cities[c.id];
  if (!row0) {
    return `<p class="muted cv-note">El ${esc(data.vintage || "Censo")} no publica las tablas de ciudadanos para ${esc(c.name)}.</p>`;
  }
  const nat = data.national || {};
  const groups = data.groups || {};
  const specs = specMap(row0);
  const label = Object.fromEntries(Object.entries(groups).map(([r, gs]) => [r, Object.fromEntries(gs.map((g) => [g.key, g.label]))]));

  // Headline: median age, degrees, foreign-born, and the "great person" call-out (the strongest specialist).
  const med = row0.age?.median, usMed = nat.age?.median;
  const ba = row0.education?.bachelors_plus, usBa = nat.education?.bachelors_plus;
  const fb = row0.nativity?.foreign_born ?? row0.nativity?.shares?.foreign_born;
  const usFb = nat.nativity?.foreign_born ?? nat.nativity?.shares?.foreign_born;
  const chip = (v, us, fmt, lbl, tip) => (v == null ? "" : `<div class="cv-cz-chip" title="${esc(tip)}"><b>${fmt(v)}</b><span>${esc(lbl)}</span>${us != null ? `<small>España ${fmt(us)}</small>` : ""}</div>`);
  const top = (row0.specialists || []).find((s) => s.ratio >= (data.rule?.specialist_high ?? 1.5));
  const topRow = ROWS.find((r) => r.id === top?.row);
  const great = top && topRow ? `<div class="cv-great" style="--fc:${esc(CATEGORY_COLOR[top.row]?.[top.key] || "#c9a45c")}">
      <span class="cv-great-fig" data-great="${esc(top.row)}|${esc(top.key)}" aria-hidden="true"></span>
      <div><small>Ciudadanos que destacan</small><b>${esc(label[top.row]?.[top.key] || top.key)}</b>
      <span>${pct(top.share, 1)} de los ${esc(topRow.noun[1])} aquí, ${pct(top.national, 1)} en España: ${top.ratio.toFixed(1).replace(".", ",")} veces más.</span></div></div>` : "";

  const rows = ROWS.map((rd) => {
    const row = row0[rd.id];
    const head = `<div class="cv-cz-h"><b>${esc(rd.title)}</b><span>${esc(rd.sub)}</span></div>`;
    if (!row) {
      return `<div class="cv-cz-row missing" data-row="${rd.id}">${head}
        <p class="muted cv-note">El Censo no publica esta tabla para ${esc(c.name)}.</p></div>`;
    }
    const { keys, n, figs, natFigs } = rowModel(rd, row, nat[rd.id], groups, data.figures || {});
    if (!figs) return `<div class="cv-cz-row missing" data-row="${rd.id}">${head}<p class="muted cv-note">Sin datos para esta fila.</p></div>`;
    const per = row.total / n;
    const cells = [];
    for (const k of keys) {
      for (let j = 0; j < (figs[k] || 0); j++) {
        const sp = specs.get(`${rd.id}|${k}`);
        const mark = sp ? (sp.ratio >= 1 ? "up" : "down") : "";
        // One tab stop per category (its first figure), not one per figure.
        cells.push(`<span class="cv-fig${mark ? ` ${mark}` : ""}" tabindex="${j ? -1 : 0}" role="img" data-k="${esc(k)}" aria-label="${esc(label[rd.id]?.[k] || k)}"></span>`);
      }
    }
    // Legend: every category, with its share, the U.S. share and a chevron for specialists. Categories that
    // round to no figure are still listed (greyed), so nothing silently disappears.
    const legend = keys.map((k) => {
      const sh = row.shares?.[k], us = nat[rd.id]?.shares?.[k];
      const sp = specs.get(`${rd.id}|${k}`);
      const chev = sp ? `<em class="${sp.ratio >= 1 ? "up" : "down"}" title="${sp.ratio.toFixed(1).replace(".", ",")}× el peso en España">${sp.ratio >= 1 ? "▲" : "▼"}</em>` : "";
      return `<span class="cv-cz-k${figs[k] ? "" : " zero"}" data-k="${esc(k)}" title="${esc(label[rd.id]?.[k] || k)}: ${sh != null ? pct(sh, 1) : "–"}${us != null ? ` (España ${pct(us, 1)})` : ""}${figs[k] ? "" : ". Redondea a ninguna figura."}"><i style="background:${esc(CATEGORY_COLOR[rd.id]?.[k] || "#888")}"></i>${esc(SHORT[rd.id]?.[k] || k)} <small>${sh != null ? pct(sh, 0) : "–"}</small>${chev}</span>`;
    }).join("");
    // U.S. comparison bar (shares), aligned with the figures' order.
    const usBar = nat[rd.id]?.shares ? `<div class="cv-cz-us" title="La mezcla de España, en el mismo orden"><span>ES</span><div>${keys.map((k) => {
      const s = nat[rd.id].shares[k] || 0;
      return s > 0 ? `<i style="flex:${s};background:${esc(CATEGORY_COLOR[rd.id]?.[k] || "#888")}" title="${esc(SHORT[rd.id]?.[k] || k)}: ${pct(s, 1)} en España"></i>` : "";
    }).join("")}</div></div>` : "";
    const cap = `Cada figura ≈ ${compact(per)} ${rd.noun[1]} · ${compact(row.total)} en total`;
    const extra = rd.id === "age" && c.edad_media != null ? ` · edad media ${c.edad_media.toFixed(1).replace(".", ",")}${m.nation.nation.edad_media != null ? ` (España ${m.nation.nation.edad_media.toFixed(1).replace(".", ",")})` : ""}` : "";
    return `<div class="cv-cz-row" data-row="${rd.id}" style="--n:${n}">${head}
      <div class="cv-figs" role="group" aria-label="${esc(rd.title)}: ${keys.filter((k) => figs[k]).map((k) => `${figs[k]} de ${n} ${SHORT[rd.id]?.[k] || k}`).join(", ")}">${cells.join("")}</div>
      ${usBar}
      <div class="cv-cz-out" aria-live="polite" data-default="${esc(cap + extra)}">${esc(cap + extra)}</div>
      <div class="cv-cz-legend">${legend}</div>
    </div>`;
  }).join("");

  const unreliable = "";
  const em = c.edad_media, usEm = m.nation.nation.edad_media;
  return `
    <div class="cv-cz-top">
      ${chip(em, usEm, (v) => v.toFixed(1).replace(".", ","), "edad media", "Edad media de la población (Atlas de Distribución de Renta del INE)")}
      ${chip(ba, usBa, (v) => pct(v, 0), "estudios superiores", "Población de 15 años o más con FP superior, grado, máster o doctorado (Censo)")}
      ${chip(fb, usFb, (v) => pct(v, 0), "nacidos fuera", "Residentes nacidos en el extranjero (Censo)")}
    </div>
    ${great}
    ${unreliable}
    <div class="cv-cz${row0.reliable === false ? " unreliable" : ""}">${rows}</div>
    <p class="cv-note">INE, ${esc(data.vintage || "Censo anual")}: ocupados por ocupación (CNO-11, tabla 69979), población por edad (70371),
      nivel de estudios (66615) y lugar de nacimiento frente al de residencia (65033). Las figuras se redondean para que cada fila sume;
      pasa o pulsa una figura para ver su peso. ▲▼ = al menos 1,5 veces o como mucho 0,67 veces el peso en España.
      El Censo español no publica cómo va la gente al trabajo, así que esa fila no está.</p>`;
}

/** Paint the figure canvases and wire the read-outs. */
export function mountCitizens(host, m, data) {
  if (!host || !data?.cities?.[m.city.id]) return;
  const row0 = data.cities[m.city.id];
  const nat = data.national || {};
  const dpr = Math.min(3, Math.max(1, Math.round((devicePixelRatio || 1) * 2) / 2));
  const paintAll = () => {
    host.querySelectorAll(".cv-cz-row[data-row]").forEach((rowEl) => {
      const rid = rowEl.dataset.row;
      rowEl.querySelectorAll(".cv-fig").forEach((el) => {
        const src = figureCanvas(rid, el.dataset.k, 36, dpr);
        const cv = document.createElement("canvas");
        cv.width = src.width;
        cv.height = src.height;
        cv.getContext("2d").drawImage(src, 0, 0);
        el.replaceChildren(cv);
      });
    });
    const g = host.querySelector("[data-great]");
    if (g) {
      const [rid, k] = g.dataset.great.split("|");
      const src = figureCanvas(rid, k, 36, dpr);
      const cv = document.createElement("canvas");
      cv.width = src.width;
      cv.height = src.height;
      cv.getContext("2d").drawImage(src, 0, 0);
      g.replaceChildren(cv);
    }
  };
  paintAll();
  // Once the citizen painter (render/art/people.js) loads, repaint the figures.
  loadPainter().then(() => { if (host.isConnected) paintAll(); });

  host.querySelectorAll(".cv-cz-row[data-row]").forEach((rowEl) => {
    const rid = rowEl.dataset.row;
    const rd = ROWS.find((r) => r.id === rid);
    const row = row0[rid];
    const out = rowEl.querySelector(".cv-cz-out");
    if (!row || !out) return;
    const show = (k) => {
      rowEl.querySelectorAll("[data-k]").forEach((el) => el.classList.toggle("lit", el.dataset.k === k));
      rowEl.classList.toggle("focus", !!k);
      if (!k) {
        out.textContent = out.dataset.default;
        out.classList.remove("on");
        return;
      }
      const sh = row.shares?.[k], us = nat[rid]?.shares?.[k];
      out.innerHTML = `${esc(sentence(rid, k, sh, us, m.city.name, rd.noun))}<small>${sh != null ? pct(sh, 1) : "–"} aquí${us != null ? ` · ${pct(us, 1)} en España` : ""}${row.counts?.[k] != null ? ` · ≈${compact(row.counts[k])} personas` : ""}</small>`;
      out.classList.add("on");
    };
    let pinned = null;
    rowEl.addEventListener("pointerover", (e) => {
      const el = e.target.closest("[data-k]");
      if (el && rowEl.contains(el)) show(el.dataset.k);
    });
    rowEl.addEventListener("pointerleave", () => show(pinned));
    rowEl.addEventListener("focusin", (e) => {
      const el = e.target.closest("[data-k]");
      if (el) show(el.dataset.k);
    });
    rowEl.addEventListener("focusout", () => show(pinned));
    // A tap pins the category (phones have no hover); another tap on it lets go.
    rowEl.addEventListener("click", (e) => {
      const el = e.target.closest("[data-k]");
      if (!el) return;
      pinned = pinned === el.dataset.k ? null : el.dataset.k;
      show(pinned);
    });
  });
}
