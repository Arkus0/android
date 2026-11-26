// City View "Districts": the metro's real industry specialisation (districts.json, BLS QCEW) as strategy-game
// districts, plus the Encampment tier from military.json (installations + armed-forces residents).
//
//   cityDistricts(ddata, mil, id) → [district]   the metro's districts, strongest first, each with what the dock and
//                                                the map plaques need ({id, name, short, color, icon, lq, emp, …})
//   badgeOf(ddata, id) → {label, text, color, icon, district} | null | undefined   the city-type badge
//   districtsHtml(m, ddata, mil) → HTML          the section body
//   badgeHtml(m, ddata) → HTML                   the header badge
import { esc, int, pct } from "../../format.js";
import { compact, money } from "../../format.js";
import { icon } from "../../ui/icon.js";
import { hasIcon } from "../../icons.js";

// Icons the district catalog names (d-*) are not drawn yet; until they are, a near icon from the set stands in,
// and canvas plaques without any icon get the letter in `mark`.
const FALLBACK = {
  campus: ["y-science", "🎓"], commercial_hub: ["i-finance", "💰"], industrial_zone: ["i-manufacturing", "🏭"],
  harbor: ["i-transportation", "⚓"], theater_square: ["i-arts", "🎭"], entertainment_complex: ["i-accommodation", "🎡"],
  aerodrome: ["i-transportation", "✈️"], government_plaza: ["i-public_admin", "🏛"], encampment: [null, "⛺"],
  aqueduct: ["i-utilities", "💧"], granary: ["i-agriculture", "🌾"],
};
const SHORT = {
  campus: "Campus", commercial_hub: "Finanzas", industrial_zone: "Industria", harbor: "Puerto", theater_square: "Artes",
  entertainment_complex: "Turismo", aerodrome: "Aeródromo", government_plaza: "Gobierno", encampment: "Campamento",
  aqueduct: "Acueducto", granary: "Granero",
};
const TIER = { garrison: "Guarnición", fortress: "Fortaleza" };

const catCache = new WeakMap();
function catalog(ddata) {
  let m = catCache.get(ddata);
  if (!m) catCache.set(ddata, (m = new Map((ddata?.catalog || []).map((c) => [c.id, c]))));
  return m;
}

export function iconFor(id, cat) {
  if (cat?.icon && hasIcon(cat.icon)) return cat.icon;
  const f = FALLBACK[id]?.[0];
  return f && hasIcon(f) ? f : null;
}

const instCache = new WeakMap();
function installationsById(mil) {
  let m = instCache.get(mil);
  if (!m) instCache.set(mil, (m = new Map((mil?.installations || []).map((i) => [i.id, i]))));
  return m;
}

/**
 * The metro's districts: districts.json entries (strongest first), with military.json's Encampment merged in (its
 * tier label; added at the end when only military.json has one).
 */
export function cityDistricts(ddata, mil, id) {
  const cat = catalog(ddata);
  const row = ddata?.cities?.[id] || null;
  const mc = mil?.cities?.[id] || null;
  const out = [];
  for (const d of row?.districts || []) {
    const c = cat.get(d.id) || {};
    const spec = d.via === "specialty" && d.sub;
    out.push({
      ...d, name: c.name || d.id, color: c.color || "#5a6a7a", icon: iconFor(d.id, c), emoji: FALLBACK[d.id]?.[1] || "◆",
      cat: c, subName: d.sub ? c.sub?.[d.sub] || ddata.industries?.[d.sub]?.title || d.sub : null,
      // The map plaque: a speciality-qualified district is labelled by that speciality (its own LQ is the reason).
      short: spec ? c.sub?.[d.sub] || SHORT[d.id] : SHORT[d.id] || c.name || d.id,
      mapLq: spec ? d.sub_lq : d.lq,
      military: d.id === "encampment" ? mc : null,
    });
  }
  if (mc && !out.some((d) => d.id === "encampment")) {
    const c = cat.get("encampment") || {};
    out.push({
      id: "encampment", name: c.name || "Encampment", color: c.color || "#8a4a3a", icon: iconFor("encampment", c), emoji: "⛺",
      cat: c, lq: null, emp: null, short: TIER[mc.tier] || "Encampment", mapLq: null, military: mc, militaryOnly: true,
    });
  }
  for (const d of out) {
    if (d.military) d.tierLabel = TIER[d.military.tier] || d.military.tier;
  }
  return out;
}

/** The city-type badge; undefined while districts.json is loading, null when there is none. */
export function badgeOf(ddata, id) {
  if (!ddata) return ddata; // undefined (loading) or null (missing)
  const row = ddata.cities?.[id];
  if (!row) return null;
  if (!row.badge) return { label: "Diversificada", text: "Ningún distrito pasa la regla: ninguna rama destaca.", color: "#6a7484", icon: null, district: null };
  const c = catalog(ddata).get(row.badge.district) || {};
  return { ...row.badge, color: c.color || "#6a7484", icon: iconFor(row.badge.district, c), emoji: FALLBACK[row.badge.district]?.[1] };
}

export function badgeHtml(m, ddata) {
  const b = badgeOf(ddata, m.city.id);
  if (!b) return "";
  return `<span class="cv-type${b.district ? "" : " plain"}" style="--tc:${esc(b.color)}" title="Tipo de ciudad: ${esc(b.text || b.label)} (Censo ${esc(String(ddata.year || ""))})">
    <span class="cv-type-ic">${icon(b.icon, b.emoji || "◆", { size: 13 })}</span>${esc(b.label)}</span>`;
}

const ge = (lb) => (lb ? "≥" : "");
const signed = (x) => (x == null ? "–" : `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(1).replace(".", ",")}%`);

function lqTag(lq, lb, tip) {
  if (lq == null) return "";
  const cls = lq >= 1.25 ? "hi" : lq <= 0.75 ? "lo" : "mid";
  return `<span class="cv-lq ${cls}" title="${esc(tip || `Cociente de localización: ${lq.toFixed(2).replace(".", ",")}× el peso en los ocupados de España`)}">×${ge(lb)}${lq.toFixed(1).replace(".", ",")}</span>`;
}

function districtCard(d, row, ddata, mil) {
  const nat = ddata?.national || {};
  const c = d.cat || {};
  const lb = !!d.lower_bound;
  const supTip = "";
  const facts = [];
  if (d.emp != null) {
    facts.push(`<div><span>Ocupados</span><b>${ge(lb)}${compact(d.emp)}</b><small>${d.share != null ? `${pct(d.share, 1)} de la ciudad` : ""}</small></div>`);
  }
  if (d.avg_pay != null) {
    facts.push(`<div><span>Salario medio</span><b>${money(d.avg_pay)}</b><small>${row?.avg_pay != null ? `ciudad ${money(row.avg_pay)}` : ""}</small></div>`);
  }
  if (d.strength != null) {
    facts.push(`<div title="Ocupados por encima de lo normal en España: ocupados − ocupados ÷ LQ (así se ordenan los distritos)"><span>Por encima de lo normal</span><b>${ge(lb)}${compact(Math.max(0, d.strength))}</b><small>ocupados</small></div>`);
  }
  let spec = "";
  if (d.sub && d.subName) {
    // the speciality's own withheld flag (districts.json sub_lower_bound; older files: the top-industries row)
    const slb = d.sub_lower_bound ?? !!(row?.top || []).find((t) => t.naics === d.sub)?.lower_bound;
    spec = `<p class="cv-dc-sub">${d.via === "specialty" ? "Entra por" : "Especialidad más fuerte"}: <b>${esc(d.subName)}</b> ${lqTag(d.sub_lq, slb)}${
      d.sub_emp != null ? ` <small>${ge(slb)}${compact(d.sub_emp)} ocupados</small>` : ""}${
      d.via === "specialty" && d.lq != null ? `<br><small>Las ramas del distrito en conjunto pesan ${d.lq.toFixed(2).replace(".", ",")}× lo que en España; esta especialidad sola pasa la regla.</small>` : ""}</p>`;
  }
  let milHtml = "";
  if (d.military) {
    const mc = d.military;
    const inst = installationsById(mil);
    const names = (mc.installations || []).map((i) => inst.get(i)?.name).filter(Boolean);
    milHtml = `<div class="cv-dc-mil">
      <p><b>${esc(d.tierLabel)}</b>${mc.naval ? " (naval)" : ""}: ${int(mc.armed_forces)} residents in the armed forces, ${pct(mc.share, mc.share < 0.01 ? 2 : 1)} of people 16 and over.</p>
      ${names.length ? `<p class="cv-dc-inst">${names.slice(0, 5).map((n) => `<span>${esc(n)}</span>`).join("")}${
        mc.installation_count > Math.min(5, names.length) ? `<small>+${mc.installation_count - Math.min(5, names.length)} more</small>` : ""}</p>` : ""}
    </div>`;
  }
  const caveat = c.caveat ? `<p class="cv-dc-cav">${esc(c.caveat)}</p>` : "";
  const title = d.militaryOnly ? `${esc(d.name)} · ${esc(d.tierLabel)}` : d.military ? `${esc(d.name)} · ${esc(d.tierLabel)}` : esc(d.name);
  return `<div class="cv-dc" style="--dc:${esc(d.color)}" title="${esc(c.description || "")}${esc(supTip)}">
    <div class="cv-dc-h"><span class="cv-dc-hex">${icon(d.icon, d.emoji, { size: 18 })}</span>
      <div class="cv-dc-t"><b>${title}</b><small>${esc(c.description || "")}</small></div>
      ${d.lq != null ? lqTag(d.lq, lb, `Cociente de localización: el peso de estas ramas en los ocupados de la ciudad es ${d.lq.toFixed(2).replace(".", ",")}× el de España.`) : ""}</div>
    ${facts.length ? `<div class="cv-dc-f">${facts.join("")}</div>` : ""}
    ${spec}${milHtml}${caveat}
  </div>`;
}

function topTable(row, ddata) {
  const top = row?.top || [];
  if (!top.length) return "";
  const max = Math.max(...top.map((t) => t.lq || 0), 1);
  return `<h4 class="cv-h4">Ramas más especializadas <span class="muted">por cociente de localización</span></h4>
  <div class="cv-top" role="table" aria-label="Ramas más especializadas">
    <div class="cv-top-r cv-top-hd" role="row"><span role="columnheader">Rama (CNAE)</span><span role="columnheader">Ocup.</span><span role="columnheader">×ES</span><span role="columnheader"></span><span role="columnheader"></span></div>
    ${top.map((t) => {
      const title = ddata.industries?.[t.naics]?.title || `CNAE ${t.naics}`;
      const lb = !!t.lower_bound;
      return `<div class="cv-top-r" role="row" title="${esc(title)} (CNAE ${esc(t.naics)})">
        <span role="cell" class="cv-top-n">${esc(title)}<i style="width:${((Math.log(1 + (t.lq || 0)) / Math.log(1 + max)) * 100).toFixed(1)}%"></i></span>
        <span role="cell">${ge(lb)}${compact(t.emp)}</span>
        <span role="cell"><b>${t.lq != null ? `${ge(lb)}${t.lq.toFixed(1).replace(".", ",")}` : "–"}</b></span>
        <span role="cell"></span><span role="cell"></span></div>`;
    }).join("")}
  </div>`;
}

/** The Districts section body. ddata: districts.json (undefined while loading, null when missing). */
export function districtsHtml(m, ddata, mil) {
  if (ddata === undefined) return `<p class="muted cv-note">Cargando distritos…</p>`;
  if (!ddata) return `<p class="muted cv-note">Los datos de distritos no están disponibles.</p>`;
  const id = m.city.id;
  const row = ddata.cities?.[id] || null;
  const list = cityDistricts(ddata, mil, id);
  const b = badgeOf(ddata, id);
  let lead;
  if (!row) {
    lead = `<p class="cv-lead">El Censo no publica los ocupados por rama de ${esc(m.city.name)}.</p>`;
  } else {
    lead = `<p class="cv-lead">${b?.district ? `<b class="cv-type-l" style="--tc:${esc(b.color)}">${esc(b.label)}</b> · ${esc(b.text || "")}. ` : ""}${
      int(row.emp)} ocupados que viven en la ciudad.</p>`;
  }
  const cards = list.length
    ? `<div class="cv-dcs">${list.map((d) => districtCard(d, row, ddata, mil)).join("")}</div>`
    : row ? `<p class="muted cv-note">Ningún distrito pasa la regla: sus ocupados se reparten como los de España.</p>` : "";
  const milRule = "";
  return `${lead}
    ${cards}
    ${topTable(row, ddata)}
    <div class="cv-schematic">
      <p><b>◆ En el mapa</b> cada distrito es una placa en un hexágono cercano a la ciudad. Las posiciones son esquemáticas: dicen en qué está especializada la ciudad, no dónde están los empleos.</p>
    </div>
    <details class="cv-more cv-rule"><summary>Cómo se eligen los distritos</summary>
      <p>${esc(ddata.rule?.text || "")}</p>
    </details>
    <p class="cv-note">INE, ${esc(ddata.vintage || "Censo anual")}. ×N = cociente de localización frente a España.</p>`;
}
