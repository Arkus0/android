// Shared building blocks for the city and state panels (both render into #city-panel).
import { compact, dollars, esc, int, money, num1, pct, yieldValue } from "../format.js";
import { icon, glyph } from "./icon.js";

// Industry → a "district" glyph: SVG icons i-<key> from icons.js; these emoji are only the fallback.
export const DISTRICT_ICON = {
  agriculture: "🌾", mining: "⛏️", construction: "🏗️", manufacturing: "🏭", wholesale: "📦", retail: "🛍️",
  transportation: "🚢", utilities: "⚡", information: "📡", finance: "🏦", real_estate: "🏘️", professional: "🔬",
  management: "🏢", admin: "🗂️", education: "🎓", health: "🏥", arts: "🎭", accommodation: "🍽️", other: "🔧",
  public_admin: "🏛️",
};

const panelEl = () => document.getElementById("city-panel");

// Casillas de rendimientos; `ranks` (opcional) añade "nº 3 de 52" debajo.
export function yieldGrid(nation, yields, ranks = null, rankOf = 0) {
  return nation.yields
    .map((y) => {
      const v = yields?.[y.key];
      const r = ranks?.[y.key];
      const label = y.key === "gold" ? "PIB" : y.label;
      return `<div class="yield-tile" title="${esc(y.label)}${y.key === "gold" ? " (PIB)" : ""}: ${esc(y.description || "")}">
        <div class="ico" style="color:${esc(y.color)}">${glyph(y, 20)}</div>
        <div class="val" style="color:${esc(y.color)}">${yieldValue(y, v)}</div>
        <div class="lbl">${esc(label)}</div>
        ${r ? `<div class="rank" title="Puesto entre las ${rankOf} provincias (1 = la mayor)">nº ${r} de ${rankOf}</div>` : ""}</div>`;
    })
    .join("");
}

// One "value ▲ US value" row. higherIsGood: true / false / null (neutral).
export function statRow(ic, fallback, label, v, nv, fmt, higherIsGood) {
  let cmp = "";
  if (v != null && nv != null && nv !== 0) {
    const ratio = v / nv;
    const cls = Math.abs(ratio - 1) < 0.03 || higherIsGood == null ? "" : (higherIsGood ? ratio >= 1 : ratio <= 1) ? "good" : "bad";
    // A menos de un 3 % del valor de España se lee como igual: sin flecha ni color.
    const arrow = Math.abs(ratio - 1) < 0.03 ? "≈" : ratio > 1 ? "▲" : "▼";
    cmp = `<span class="cmp ${cls}">${arrow} España ${fmt(nv)}</span>`;
  }
  return `<div class="stat-row"><span class="sl">${icon(ic, fallback, { size: 14 })}${esc(label)}</span><span><b>${fmt(v)}</b>${cmp}</span></div>`;
}

export function amenities(o, n) {
  const row = (ic, fb, label, k, fmt, good) => (o[k] == null ? "" : statRow(ic, fb, label, o[k], n[k], fmt, good));
  return `
    ${row("unemployment", "😐", "Paro (Censo)", "unemployment", (x) => pct(x), false)}
    ${row("l-income", "💶", "Renta neta media por persona", "renta_persona", dollars, true)}
    ${row("l-income", "💶", "Renta mediana por unidad de consumo", "median_income", dollars, true)}
    ${row("l-poverty", "🥣", "Bajo el 60 % de la renta mediana", "pobreza", (x) => pct(x), false)}
    ${row("l-age", "🎂", "Edad media", "edad_media", (x) => (x == null ? "–" : num1(x) + " años"), null)}
    ${row("l-foreign-born", "🌍", "Nacidos en el extranjero", "nacidos_fuera", (x) => pct(x), null)}
    ${row("l-degrees", "🎓", "Con estudios superiores (15+)", "estudios_sup", (x) => pct(x), true)}`;
}

// Workforce by industry with location quotients vs. the nation ("specialisation"). limit = max rows (0 = all).
export function industries(o, nation, limit = 0) {
  const n = nation.nation;
  const total = o.employed || 1;
  const nTotal = n.employed || 1;
  let rows = Object.entries(o.jobs || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (limit) rows = rows.slice(0, limit);
  if (!rows.length) return `<p class="muted">Sin datos por rama.</p>`;
  const maxShare = rows[0][1] / total;
  return rows
    .map(([k, v]) => {
      const share = v / total;
      const nShare = (n.jobs?.[k] || 0) / nTotal;
      const lq = nShare > 0 ? share / nShare : 1;
      const tip = `Su cuota de ocupados es ${lq.toFixed(1).replace(".", ",")}× la de España`;
      const lqs = lq.toFixed(1).replace(".", ",");
      const badge = lq >= 1.3 ? `<span class="lq hi" title="${tip}">×${lqs}</span>`
        : lq <= 0.6 ? `<span class="lq lo" title="${tip}">×${lqs}</span>` : "";
      return `<div class="ind"><span aria-hidden="true">${icon(`i-${k}`, DISTRICT_ICON[k] || "•")}</span>
        <span>${esc(nation.industries?.[k] || k)}${badge}</span><span class="n">${compact(v)} · ${pct(share, 0)}</span>
        <div class="bar"><i style="width:${(share / maxShare) * 100}%;background:${lq >= 1.3 ? "#9fd76a" : "#c9a45c"}"></i></div></div>`;
    })
    .join("");
}

export const gdpRow = (o) =>
  o.gdp != null
    ? `<div class="stat-row"><span class="sl">${icon("y-gold", "💰", { size: 14 })}PIB${o.gdp_year ? ` (${o.gdp_year})` : ""}${o.gdp_estimated ? ` <span class="muted" title="Estimación: el INE no publica el PIB municipal; se reparte el de la provincia según los ocupados de la ciudad en cada rama">≈ estimado</span>` : ""}</span><span><b>${money(o.gdp)}</b>${
        o.population ? `<span class="cmp">${money(o.gdp / o.population)} por persona</span>` : ""}</span></div>`
    : "";

// " · ▲ 3,4 % desde 2021" a partir de growth / growth_years, comparado con España en el tooltip.
// Empty when growth is missing (null means "not measured", never zero).
export function growthSpan(o, n = null) {
  if (!Number.isFinite(o?.growth)) return "";
  const yrs = Array.isArray(o.growth_years) && o.growth_years.length === 2 ? o.growth_years : null;
  const p = (g) => `${g >= 0 ? "+" : "−"}${Math.abs(g * 100).toFixed(1).replace(".", ",")}%`;
  const period = yrs ? `${yrs[0]}–${yrs[1]}` : "los últimos años";
  const us = Number.isFinite(n?.growth) ? ` (España ${p(n.growth)})` : "";
  const tip = `Cambio de población ${period}, Padrón municipal: ${p(o.growth)}${us}`;
  const cls = o.growth >= 0 ? "good" : "bad";
  return ` · <span class="growth ${cls}" title="${esc(tip)}">${o.growth >= 0 ? "▲" : "▼"} ${Math.abs(o.growth * 100).toFixed(1).replace(".", ",")}%${
    yrs ? ` <span class="since">desde ${yrs[0]}</span>` : ""}</span>`;
}

export const popLine = (o, extra = "") =>
  `<div class="cp-pop">${icon("pop", "👥", { size: 16 })} <b>${int(o.population)}</b> habitantes · ${int(o.employed)} ocupados${extra}</div>`;

/**
 * Fill and show the panel.
 * spec: {kind: "city"|"state", stripe, title, sub, headExtra, sections: [{title, html}], foot, onClose, onPedia, wire(panel)}
 */
export function showPanel(spec) {
  const panel = panelEl();
  panel.dataset.kind = spec.kind;
  panel.setAttribute("aria-label", `${spec.kind === "state" ? "Provincia" : "Ciudad"}: ${spec.title}`);
  panel.innerHTML = `
    <div class="sheet-grip" aria-hidden="true"></div>
    <div class="cp-head">
      <div class="stripe" style="background:${spec.stripe}"></div>
      <button class="icon-btn cp-close" aria-label="Cerrar panel (Esc)" title="Cerrar (Esc)">${icon("close", "✕", { size: 13 })}</button>
      <div class="cp-kind">${spec.kind === "state" ? "Provincia" : "Ciudad"}</div>
      <h2 class="cp-name">${spec.titleHtml ?? esc(spec.title)}</h2>
      ${spec.sub ? `<div class="cp-full">${spec.sub}</div>` : ""}
      ${spec.headExtra || ""}
    </div>
    ${spec.sections.filter(Boolean).map((s) => `<section class="cp-section"><h3>${s.title}</h3>${s.html}</section>`).join("")}
    <div class="cp-foot">${spec.foot || ""} <a href="#" data-pedia>Almanaque ›</a></div>`;
  panel.hidden = false;
  panel.scrollTop = 0;
  panel.classList.remove("dragging-sheet");
  panel.style.transform = "";
  document.body.classList.add("panel-open");
  panel.querySelector(".cp-close").onclick = spec.onClose;
  panel.querySelector("[data-pedia]").onclick = (e) => {
    e.preventDefault();
    spec.onPedia?.();
  };
  spec.wire?.(panel);
}

export function hidePanel() {
  const panel = panelEl();
  panel.hidden = true;
  panel.innerHTML = "";
  delete panel.dataset.kind;
  document.body.classList.remove("panel-open");
}

// Bottom-sheet swipe-down to close (mobile). Installed once.
export function installSheetSwipe(onClose) {
  const panel = panelEl();
  let start = null;
  panel.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || !matchMedia("(max-width: 700px)").matches) return;
    // Only from the grip/head, or anywhere while the sheet is scrolled to the top.
    const fromHead = e.target.closest(".sheet-grip, .cp-head");
    if (!fromHead && panel.scrollTop > 0) return;
    if (e.target.closest("button, a, input")) return;
    start = { y: e.clientY, id: e.pointerId, dy: 0, head: !!fromHead };
  });
  panel.addEventListener("pointermove", (e) => {
    if (!start || e.pointerId !== start.id) return;
    start.dy = Math.max(0, e.clientY - start.y);
    if (start.dy > 6 && (start.head || panel.scrollTop <= 0)) {
      panel.classList.add("dragging-sheet");
      panel.style.transform = `translateY(${start.dy}px)`;
    }
  });
  const end = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dy = start.dy;
    start = null;
    panel.classList.remove("dragging-sheet");
    panel.style.transform = "";
    if (dy > 80) onClose();
  };
  panel.addEventListener("pointerup", end);
  panel.addEventListener("pointercancel", end);
}
