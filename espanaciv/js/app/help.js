// Keyboard & mouse cheat-sheet.
import { icon } from "../ui/icon.js";

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
const MOD = isMac ? "⌘" : "Ctrl";

const ROWS = [
  ["Moverse", [
    [["Arrastrar", "←↑→↓", "WASD"], "Desplazar el mapa"],
    [["Rueda", "+", "–"], "Acercar y alejar"],
    [["Doble clic"], "Acercar en un punto"],
    [["Dos dedos"], "Pellizcar para zoom, arrastrar para mover (táctil)"],
    [["Minimapa"], "Pulsar o arrastrar para saltar"],
  ]],
  ["Explorar", [
    [["Pulsar ciudad"], "Abrir la ficha de la ciudad"],
    [["Pulsar tierra"], "Abrir esa provincia"],
    [["/", `${MOD} K`], "Buscar ciudades, provincias y municipios"],
    [["L", "Mayús L"], "Lente siguiente / anterior"],
    [["Leyenda"], "Pasar o arrastrar sobre la escala para ver solo ese tramo"],
    [["R"], "Mostrar u ocultar recursos"],
  ]],
  ["Paneles", [
    [["?"], "Esta ayuda"],
    [["Esc"], "Cerrar ayuda, búsqueda, Almanaque y después el panel"],
  ]],
];

export function initHelp() {
  const modal = document.getElementById("help");
  if (!modal) return { open() {}, close() {}, get isOpen() { return false; } };
  const card = modal.querySelector(".help-card");
  let restore = null;
  card.innerHTML = `
    <button class="icon-btn help-close" data-close aria-label="Cerrar la ayuda">${icon("close", "✕", { size: 13 })}</button>
    <h2 id="help-title">${icon("help", "?", { size: 22 })}<span>Controles</span></h2>
    <div class="help-cols">${ROWS.map(([title, rows]) => `
      <section><h3>${title}</h3>${rows.map(([keys, what]) => `
        <div class="help-row"><span class="keys">${keys.map((k) => `<kbd>${k}</kbd>`).join("")}</span><span>${what}</span></div>`).join("")}
      </section>`).join("")}</div>
    <p class="help-foot">Cada número sale de datos públicos (INE, Eurostat, IGN, ESA, NOAA…): abre el <b>Almanaque</b> para ver las fuentes.
      El enlace de la barra de direcciones reabre siempre esta misma vista.
      Es una adaptación a España de <a href="https://karpathy.ai/usaciv/" target="_blank" rel="noopener">usaciv</a> de Andrej Karpathy (licencia MIT):
      el motor del mapa es el suyo; los datos, el pipeline y los textos son nuevos.</p>`;

  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    if (restore && document.contains(restore)) restore.focus();
    restore = null;
  };
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-close]")) close();
  });
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault(); // the only focusable control is the close button
    card.querySelector("[data-close]").focus();
  });

  return {
    open() {
      if (!modal.hidden) return;
      restore = document.activeElement;
      modal.hidden = false;
      card.querySelector("[data-close]").focus();
    },
    close,
    toggle() { modal.hidden ? this.open() : close(); },
    get isOpen() { return !modal.hidden; },
  };
}
