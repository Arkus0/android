import { css } from "../color.js";
import { esc } from "../format.js";
import { isCapital } from "../world.js";
import { yieldGrid, amenities, industries, gdpRow, popLine, growthSpan, showPanel, hidePanel } from "./infoPanel.js";

/**
 * ctx: {w, nation, onClose, onPedia, onState(stateIndex)}
 */
export function openCityPanel(city, ctx) {
  const { w, nation } = ctx;
  const n = nation.nation;
  const owner = city.cell != null ? w.raw.owner[city.cell] : -1;
  const col = css(w.stateColor[owner] || [190, 190, 190]);

  // The city's states as links to their state panels.
  const states = (city.states || [])
    .map((abbr) => ({ abbr, i: w.raw.states.findIndex((s) => s.abbr === abbr) }))
    .map(({ abbr, i }) => (i >= 0 && ctx.onState
      ? `<button class="chip" data-state="${i}" title="Abrir ${esc(w.raw.states[i].name)}">${esc(w.raw.states[i].name)}</button>`
      : `<span class="chip">${esc(abbr)}</span>`))
    .join("");

  const growth = growthSpan(city, n);

  showPanel({
    kind: "city",
    stripe: col,
    title: city.name,
    titleHtml: `${isCapital(city) ? `<span class="cap" title="Capital de España">★</span> ` : city.provincial_capital ? `<span class="cap" title="Capital de provincia" style="opacity:.7">✦</span> ` : ""}${esc(city.name)}`,
    sub: `${esc(city.full || "")}${states ? `<div class="chips">${states}</div>` : ""}`,
    headExtra: popLine(city, growth),
    sections: [
      { title: "Rendimientos", html: `<div class="yield-grid">${yieldGrid(nation, city.yields)}</div>` },
      { title: "Bienestar y renta", html: amenities(city, n) + gdpRow(city) },
      { title: "Distritos · en qué trabaja su gente", html: industries(city, nation) },
    ],
    foot: `Fuentes: INE, ${esc(nation.vintage)} (ocupados por CNAE, tabla 69980); Atlas de Distribución de Renta de los Hogares${nation.gdp_vintage ? `; PIB: ${esc(nation.gdp_vintage)}` : ""}.
      ×N en verde = la cuota de ocupados de esa rama es N veces la de España.`,
    onClose: ctx.onClose,
    onPedia: ctx.onPedia,
    wire(panel) {
      panel.querySelectorAll("[data-state]").forEach((b) => (b.onclick = () => ctx.onState(+b.dataset.state)));
    },
  });
}

export const closeCityPanel = hidePanel;
