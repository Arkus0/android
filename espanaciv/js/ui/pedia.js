// The Almanac: what every number means and exactly where it comes from.
import { resolveTables } from "../terrain.js";
import { esc } from "../format.js";
import { parseHex, luminance } from "../color.js";
import { icon, glyph } from "./icon.js";

const COVER_ICON = { forest_deciduous: "l-forest", forest_evergreen: "l-forest", forest_mixed: "l-forest", cropland: "l-farmland", pasture: "l-farmland", urban: "l-developed" };
// Glyph colour that reads on a resource medallion (dark on light faces such as nuclear yellow or silver).
const inkOn = (hex) => {
  try { return /^#[0-9a-f]{6}$/i.test(hex || "") && luminance(parseHex(hex)) > 0.4 ? "#1c1710" : "#f8f0d8"; } catch { return "#f8f0d8"; }
};
const CATEGORY = { energy: "Energía", mineral: "Minerales", agri: "Agricultura" };

export function initPedia(data) {
  const modal = document.getElementById("pedia");
  const card = modal.querySelector(".modal-card");
  const nav = document.getElementById("pedia-nav");
  const body = document.getElementById("pedia-body");
  const srcName = (id) => data.sources?.find((s) => s.id === id)?.title || id || "";
  let restoreFocus = null;

  const h2 = (ic, fb, text) => `<h2>${icon(ic, fb, { size: 24 })}<span>${esc(text)}</span></h2>`;

  const W = data.world;
  const hexKm = W.projection?.scale ? W.grid.radius / W.projection.scale : W.grid.radius;
  const hexArea = Math.round(2.598 * hexKm * hexKm);
  const pages = {
    "Sobre este mapa": () => `
      ${h2("pedia", "📖", "Sobre este mapa")}
      <p>Esta es la España real dibujada como un juego de estrategia por turnos. No hay nada inventado: cada casilla,
      ciudad y número sale de datos públicos, que están en <i>Fuentes</i>.</p>
      <h4>Cómo está hecho</h4>
      <p>España se proyecta (cónica equivalente de Albers) y se corta en ${W.grid.cols}×${W.grid.rows} hexágonos de
      unos ${(hexKm * 2).toFixed(0)} km de punta a punta (≈ ${hexArea} km² cada uno). Cada hexágono pertenece a la provincia que
      ocupa la mayor parte de su superficie y guarda qué municipios caen dentro. Canarias va en un recuadro al suroeste,
      como en los mapas de siempre. El relieve sale de la altitud y la cobertura del suelo, de imágenes de satélite.</p>
      <p><b>Ciudades</b>: las 151 capitales de provincia y principales ciudades para las que el Censo anual del INE publica
      los ocupados por actividad (todas las de más de 50.000 habitantes y algunas más), colocadas en su núcleo principal.
      Sus cifras son las del <i>municipio</i>, no las del área metropolitana: Madrid es el municipio de Madrid, y Getafe o
      Móstoles tienen su propia ciudad.</p>
      <h4>Controles</h4>
      <p>Arrastra o usa las flechas / WASD para moverte · rueda, +/– o doble clic para el zoom · pulsa una ciudad o una
      provincia para abrirla · / o ⌘K para buscar · L para cambiar de lente · R para mostrar u ocultar recursos · ? para
      todos los atajos · Esc para cerrar.</p>
      <p>La barra de direcciones guarda siempre un enlace a lo que estás viendo (lente, selección y vista); <i>Compartir</i>
      lo copia o descarga una imagen.</p>
      <h4>Créditos</h4>
      <p>Adaptación a España de <a href="https://karpathy.ai/usaciv/" target="_blank" rel="noopener">usaciv</a>, de Andrej
      Karpathy (código MIT). El motor de dibujo (terreno, ciudades, estandartes, lentes) es el suyo; los datos españoles, el
      pipeline que los prepara y los textos son de esta versión. El aspecto se inspira en los juegos de estrategia 4X, pero
      todo el arte está dibujado por código.</p>`,
    Rendimientos: () => `
      ${h2("y-production", "⚙️", "Rendimientos")}
      <p>Los rendimientos de un juego de estrategia, traducidos a medidas reales. Los que cuentan trabajadores usan los
      <i>ocupados que viven</i> en la ciudad o provincia (no donde trabajan), según el Censo anual del INE
      (${esc(data.nation.vintage)}). <b>El oro es el PIB</b>: lo que se produce en un año, contado donde se trabaja.</p>
      <table>${data.nation.yields.map((y) => `<tr><td class="ic" style="color:${esc(y.color)}">${glyph(y, 26)}</td><td><b style="color:${esc(y.color)}">${esc(y.label)}${y.key === "gold" ? " (PIB)" : ""}</b><br>${esc(y.description)}</td></tr>`).join("")}</table>
      <h4>Bienestar y renta</h4>
      <p><b>Paro</b> = parados ÷ (ocupados + parados) del Censo anual, que se basa en registros administrativos; es más bajo
      que la tasa de la EPA y no se debe comparar con ella. <b>Renta</b>: Atlas de Distribución de Renta de los Hogares
      (INE, a partir de datos tributarios)${data.nation.income_year ? `, año ${esc(data.nation.income_year)}` : ""}. La renta mediana
      por unidad de consumo ajusta por el tamaño del hogar. <b>Bajo el 60 % de la mediana</b> es el indicador de riesgo de
      pobreza relativa.</p>
      <h4>El PIB de las ciudades es una estimación (≈)</h4>
      <p>El INE publica el PIB por provincias, no por municipios. Para cada ciudad se reparte el valor añadido de su provincia
      rama a rama (seis ramas) según la parte de los ocupados de esa rama que vive en la ciudad, y se añaden los impuestos en
      la misma proporción. Como cuenta a los trabajadores donde viven, infravalora las ciudades que atraen a mucha gente de
      fuera a trabajar (Madrid, Barcelona) y sobrevalora las ciudades dormitorio.</p>`,
    Provincias: () => `
      ${h2("terrain", "🗺️", "Provincias")}
      <p>Pulsa cualquier hexágono sin ciudad para abrir su provincia. Sus cifras son las de toda la provincia (suma de sus
      municipios, o la tabla provincial del INE y Eurostat), no solo las de sus ciudades, así que el campo también cuenta.</p>
      <p>Los <b>puestos</b> ("nº 3 de 52") comparan las 50 provincias, Ceuta y Melilla; 1 es la mayor.</p>
      <p>Debajo del nombre de la provincia aparece su sigla clásica de matrícula (M, B, SE, Z…), que es la que usa el mapa
      cuando no cabe el nombre.</p>`,
    Terreno: () => {
      const t = data.w?.tables || resolveTables(data.world.tables);
      const hasCover = Array.isArray(data.world.cover);
      const row = (x) => `<tr><td class="nm">${x.color ? `<span class="swatch" style="background:${esc(x.color)}"></span>` : ""}${
        COVER_ICON[x.key] ? icon(COVER_ICON[x.key], "", { size: 15 }) + " " : ""}<b>${esc(x.name)}</b></td><td>${esc(x.rule || "")}</td></tr>`;
      const notes = data.world.tables?.notes || {};
      return `
      ${h2("terrain", "🗺️", "Terreno")}
      <p>Cada hexágono promedia las muestras de altitud ETOPO1 que caen dentro. El relieve sale de la altitud media y de la
      rugosidad (desviación típica) de esas muestras; el sombreado, de la diferencia de altura con los vecinos, con la luz
      desde el noroeste. ${esc(notes.relief || "")}</p>
      <h4>${icon("l-forest", "🌲", { size: 16 })} Cobertura del suelo</h4>
      ${hasCover
        ? `<p>El color de base de cada hexágono es su grupo de cobertura dominante. Los símbolos muestran la mezcla: los
           árboles crecen con la parte de bosque, y los campos, juncos, matorrales y matas marcan cultivos, humedales, monte bajo
           y pastizal. ${esc(notes.cover || "")}</p>
           <table>${t.cover.filter((x) => x.id > 0 && !/^No se usa/.test(x.rule || "")).map(row).join("")}</table>`
        : `<p class="muted">Sin capa de cobertura.</p>`}
      <h4>Relieve</h4>
      <table>${t.relief.map(row).join("")}</table>
      <h4>${icon("r-hydro", "💧", { size: 16 })} Agua</h4>
      <p>${esc(notes.water || "")}</p>
      <table>${t.water.filter((x) => x.id > 0).map(row).join("")}</table>
      <h4>Más allá de la frontera</h4>
      <p class="muted">Portugal, Francia, Andorra, Gibraltar, Marruecos y Argelia se dibujan bajo una niebla ligera: están
      para dar contexto, sin datos.</p>`;
    },
    Lentes: () => `
      ${h2("layers", "▤", "Lentes")}
      <p>Las lentes colorean el mapa con una sola medida, a partir de datos municipales. Cada hexágono se rasteriza a
      1 km: si un municipio ocupa una parte del hexágono, se supone que en ella vive la misma parte de su población
      (densidad uniforme dentro del municipio). El valor del hexágono es la media de sus municipios ponderada por esa
      población. Los municipios diminutos que no llenan ni un píxel se añaden al hexágono que contiene su centro.</p>
      <p>La leyenda muestra cuántos hexágonos hay en cada valor. Pasa o arrastra por ella para ver solo ese tramo en el mapa.</p>
      ${(data.lenses.groups || [{ id: null, name: "" }]).map((g) => {
        const ls = data.lenses.lenses.filter((l) => !g.id || l.group === g.id);
        if (!ls.length) return "";
        return `${g.name ? `<h3 class="grp">${icon(`g-${g.id}`, "", { size: 16 })} ${esc(g.name)}</h3>` : ""}${ls.map((l) => `
          <div class="lens-entry"><div class="le-ic">${glyph(l, 26)}</div><div>
          <h4>${esc(l.name)}</h4><p>${esc(l.description)}${l.note ? `<br><i>${esc(l.note)}</i>` : ""}<br>
          <i class="le-ramp" style="background:linear-gradient(90deg, ${(l.ramp || []).map(esc).join(",")})"></i>
          <span class="muted">Escala: ${l.scale === "log" ? "logarítmica" : "lineal"}, ${l.domain[0].toLocaleString("es-ES")}–${l.domain[1].toLocaleString("es-ES")} ${esc(l.unit)}${
            l.higher_is === "good" ? " · más es mejor" : l.higher_is === "bad" ? " · más es peor" : ""}${l.source ? " · " + esc(srcName(l.source)) : ""}</span></p></div></div>`).join("")}`;
      }).join("")}`,
    Recursos: () => {
      const r = data.resources;
      if (!r?.types?.length) return `${h2("resources", "⛏️", "Recursos")}<p class="muted">Sin capa de recursos.</p>`;
      const count = new Map();
      for (const it of r.items || []) count.set(it.type, (count.get(it.type) || 0) + 1);
      const cats = [...new Set(r.types.map((t) => t.category || "other"))];
      return `
      ${h2("resources", "⛏️", "Recursos")}
      <p>Los recursos marcan las mayores centrales eléctricas del país en las casillas donde están. Solo se dibujan los
      sitios importantes: el umbral de cada tipo está en su descripción. Con el mapa lejos, cada hexágono muestra su recurso
      más importante; acércate para ver más. Pulsa <b>R</b> para mostrarlos u ocultarlos.</p>
      ${r.summary?.note ? `<p class="muted">${esc(r.summary.note)}</p>` : ""}
      ${cats.map((c) => `<h4>${esc(CATEGORY[c] || c)}</h4><table class="res-table">
        <tr><th></th><th>Tipo</th><th>Qué cuenta</th><th>Sitios</th></tr>
        ${r.types.filter((t) => (t.category || "other") === c).map((t) => `<tr>
          <td class="ic"><span class="res-ic" style="background:${esc(t.color || "#24384f")};color:${inkOn(t.color)}">${glyph(t, 20)}</span></td>
          <td class="nm"><b>${esc(t.name)}</b>${t.unit ? `<br><span class="muted">valor en ${esc(t.unit)}</span>` : ""}</td>
          <td>${esc(t.description || "")}<br><span class="muted">Fuente: ${esc(srcName(t.source))}</span></td>
          <td class="num">${count.get(t.id) || 0}</td></tr>`).join("")}</table>`).join("")}`;
    },
    Fuentes: () => `
      ${h2("pedia", "📖", "Fuentes")}
      <p>Todas son públicas y ninguna necesita clave. Cada fichero lleva la fecha en que se descargó.</p>
      ${data.sources.map((s) => `
        <h4>${esc(s.title)}</h4>
        <p>${esc(s.description)}<br>
        <span class="muted">${esc(s.publisher)} · ${esc(s.license)}${s.vintage ? " · " + esc(s.vintage) : ""} ·
        <a href="${esc(s.homepage)}" target="_blank" rel="noopener">web</a></span></p>
        <table>${(s.files || []).map((f) => `<tr><td><code>${esc(f.url)}</code></td><td class="muted" style="white-space:nowrap">${esc((f.retrieved || "").slice(0, 10))}<br>${((f.bytes || 0) / 1e6).toFixed(1).replace(".", ",")} MB</td></tr>`).join("")}</table>`).join("")}`,
  };

  const show = (name) => {
    if (!pages[name]) name = "Sobre este mapa";
    body.innerHTML = pages[name]();
    body.scrollTop = 0;
    nav.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.page === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-current", on ? "page" : "false");
    });
  };
  nav.innerHTML = `<div class="hd">Almanaque</div>` + Object.keys(pages).map((p) => `<button data-page="${esc(p)}">${esc(p)}</button>`).join("");
  nav.onclick = (e) => {
    const b = e.target.closest("button[data-page]");
    if (b) show(b.dataset.page);
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus();
    restoreFocus = null;
  };
  modal.onclick = (e) => {
    if (e.target === modal || e.target.closest("[data-close]")) close();
  };
  // Keep Tab inside the dialog.
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const f = [...card.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")].filter((x) => x.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  return {
    open(page = "Sobre este mapa") {
      if (modal.hidden) restoreFocus = document.activeElement;
      show(page);
      modal.hidden = false;
      (nav.querySelector("button.active") || card.querySelector("[data-close]"))?.focus();
    },
    close,
    get isOpen() {
      return !modal.hidden;
    },
  };
}
