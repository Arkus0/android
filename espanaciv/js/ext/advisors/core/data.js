// Modelo de datos de los asesores (España): tres niveles de filas con campos tipados — provincias, ciudades y municipios
// — más los enlaces entre filas y el mapa hexagonal (fila → resaltado, celda → fila). Se construye una vez desde
// app.data (counties.json = los 8.131 municipios, opcional). Adaptado de usaciv (MIT).
//
//   level = {id, label, noun, rows: [row], fields: [field], field(key), value(row, key),
//            highlight(rows, opts) → app.state.highlight, rowAtCell(cell) → row | null, focus(row), byKey: Map}
//   row   = {key, name, sub, level, ref, v: {fieldKey: value}}
//   field = {key, label, format, unit, higher_is, source, description, lens?, group, derived?}
import { fin, ratio } from "./util.js";
import { frameBox } from "./frame.js";

// Campo de municipios → lente del mapa.
const COUNTY_LENS = {
  density: "density", growth: "growth", income: "income", poverty: "poverty", median_age: "age", elderly: "elderly",
  foreign_born: "foreign_born", bachelors: "degrees", unemployment: "unemployment", solo: "solo", forest: "forest",
  crop: "farmland", shrub: "scrub", developed: "developed",
};
// Medidas municipales que se agregan a provincias y ciudades como media ponderada por población.
const ROLLUP = ["solo", "elderly"];
const LAND_KEYS = ["forest", "crop", "grass", "shrub", "wetland", "developed"];
export const LAND_LABEL = {
  forest: "Bosque", crop: "Cultivos", pasture: "Prados", grass: "Pastizal", shrub: "Matorral", wetland: "Humedal", developed: "Construido",
};
export const LAND_COLOR = {
  forest: "#3f7a3a", crop: "#d2c457", pasture: "#93b852", grass: "#b9b06a", shrub: "#c9a874", wetland: "#4f9a86", developed: "#9a8f9e",
};
export { LAND_KEYS };

export function buildData(app) {
  const { cities = [], states = [], nation = {}, counties, resources, sources = [] } = app.data;
  const w = app.w;
  const grid = w.grid;
  const owner = w.raw.owner;
  const countyOf = w.raw.county || [];
  const n = grid.size;

  // --- índices de celdas ----------------------------------------------------------------------------------------
  const stateCells = new Map();
  const countyCells = new Map();
  for (let i = 0; i < n; i++) {
    const o = owner[i];
    if (!(o >= 0)) continue;
    if (!stateCells.has(o)) stateCells.set(o, []);
    stateCells.get(o).push(i);
    const c = countyOf[i];
    if (c >= 0) {
      if (!countyCells.has(c)) countyCells.set(c, []);
      countyCells.get(c).push(i);
    }
  }
  const cellMetro = new Map();
  for (let k = cities.length - 1; k >= 0; k--) for (const cell of cities[k].footprint || []) cellMetro.set(cell, cities[k]);
  for (const c of cities) if (c.cell != null) cellMetro.set(c.cell, c);

  const srcTitle = new Map(sources.map((s) => [s.id, s]));
  const nat = nation.nation || {};
  const vintage = nation.vintage || "Censo anual";
  const countyVintage = counties?.vintage || "Padrón y ADRH";
  const yrs = (nat.growth_years || []).join("–");

  // --- campos -----------------------------------------------------------------------------------------------------
  const F = (key, label, format, o = {}) => ({ key, label, format, unit: o.unit || null, higher_is: o.higher_is || "neutral", source: o.source || "", description: o.description || "", lens: o.lens || null, group: o.group || "Economía", derived: !!o.derived });
  const econFields = (lvl) => [
    F("population", "Población", "int", { unit: "habitantes", source: "ine_padron", group: "Población", description: "Residentes a 1 de enero (Padrón municipal).", lens: "density" }),
    F("growth", "Crecimiento", "signed", { unit: "cambio de población", source: "ine_padron", group: "Población", description: `Cambio de población ${yrs} (Padrón, mismos límites los dos años).` }),
    F("density", "Densidad", "float", { unit: "habitantes / km²", source: "ine_padron", group: "Población", description: "Habitantes ÷ superficie.", lens: "density", derived: true }),
    F("gdp", lvl === "metros" ? "PIB ≈" : "PIB", "money", { unit: "€ al año", source: "eurostat_gdp", description: `${nation.gdp_vintage || "Eurostat"}: PIB en euros corrientes.${lvl === "metros" ? " Estimación: el INE no publica el PIB municipal." : ""}` }),
    F("gdp_pc", lvl === "metros" ? "PIB por persona ≈" : "PIB por persona", "usd", { unit: "€ por habitante", higher_is: "good", source: "eurostat_gdp", description: "PIB ÷ residentes.", derived: true }),
    F("income", "Renta por persona", "usd", { unit: "renta neta media por persona", higher_is: "good", source: "ine_adrh", group: "Prosperidad", description: "Renta neta media por persona (Atlas de Distribución de Renta de los Hogares).", lens: "income" }),
    F("median_income", "Renta mediana (u.c.)", "usd", { unit: "mediana por unidad de consumo", higher_is: "good", source: "ine_adrh", group: "Prosperidad", description: "Mediana de la renta por unidad de consumo (ADRH)." }),
    F("poverty", "Pobreza", "pct", { unit: "bajo el 60 % de la mediana", higher_is: "bad", source: "ine_adrh", group: "Prosperidad", description: "Población con ingresos por unidad de consumo bajo el 60 % de la mediana (ADRH).", lens: "poverty" }),
    F("unemployment", "Paro", "pct", { unit: "parados ÷ activos", higher_is: "bad", source: "ine_censo", group: "Prosperidad", description: "Parados ÷ (ocupados + parados), Censo anual (no es la tasa de la EPA).", lens: "unemployment" }),
    F("employed", "Ocupados", "int", { unit: "ocupados residentes", source: "ine_censo", description: `Ocupados que viven en la zona (${vintage}).` }),
    F("median_age", "Edad media", "years", { unit: "años", source: "ine_adrh", group: "Población", description: "Edad media de la población (ADRH).", lens: "age" }),
    F("elderly", "Mayores de 65", "pct", { unit: "de la población", source: "ine_adrh", group: "Población", description: "Población de 65 y más años (ADRH), media de los municipios ponderada por población.", lens: "elderly", derived: lvl !== "counties" }),
    F("foreign_born", "Nacidos fuera", "pct", { unit: "de los residentes", source: "ine_censo", group: "Población", description: "Residentes nacidos en el extranjero (Censo).", lens: "foreign_born" }),
    F("bachelors", "Estudios superiores", "pct", { unit: "de la población de 15+", higher_is: "good", source: "ine_censo", group: "Conocimiento", description: "Población de 15 años o más con educación superior (Censo).", lens: "degrees" }),
    F("solo", "Hogares de una persona", "pct", { unit: "de los hogares", source: "ine_adrh", group: "Vida diaria", description: "Hogares unipersonales (ADRH), media de los municipios ponderada por población.", lens: "solo", derived: lvl !== "counties" }),
    ...(nation.yields || []).filter((y) => y.unit !== "usd" && y.unit !== "eur").map((y) => F(`y_${y.key}`, `${y.label} (ocupados)`, "int", { unit: "ocupados", source: "ine_censo", group: "Rendimientos", description: y.description })),
  ];

  // --- agregados desde los municipios ---------------------------------------------------------------------------------
  const roll = { states: new Map(), metros: new Map() };
  const cRows = [];
  let col = {};
  if (counties) {
    col = Object.fromEntries(counties.columns.map((k, j) => [k, j]));
    counties.rows.forEach((r, i) => cRows.push({ r, i }));
    const add = (map, key, r) => {
      if (key == null) return;
      let a = map.get(key);
      if (!a) map.set(key, (a = { pop: 0, land: 0, s: {}, wt: {} }));
      const pop = r[col.population];
      if (fin(pop)) a.pop += pop;
      if (fin(r[col.land_km2])) a.land += r[col.land_km2];
      for (const k of ROLLUP) {
        const v = r[col[k]];
        if (fin(v) && fin(pop) && pop > 0) {
          a.s[k] = (a.s[k] || 0) + v * pop;
          a.wt[k] = (a.wt[k] || 0) + pop;
        }
      }
    };
    for (const { r } of cRows) {
      add(roll.states, r[col.state], r);
      add(roll.metros, r[col.cbsa], r);
    }
  }
  const rolled = (map, key) => {
    const a = map.get(key);
    const out = {};
    if (!a) return out;
    out.density = a.land > 0 ? a.pop / a.land : null;
    out.land_km2 = a.land || null;
    for (const k of ROLLUP) out[k] = a.wt[k] ? a.s[k] / a.wt[k] : null;
    return out;
  };

  const econValues = (o) => ({
    population: o.population ?? null,
    growth: o.growth ?? null,
    gdp: o.gdp ?? o.yields?.gold ?? null,
    gdp_pc: ratio(o.gdp ?? o.yields?.gold, o.population),
    income: o.renta_persona ?? null,
    median_income: o.median_income ?? null,
    poverty: o.pobreza ?? null,
    unemployment: o.unemployment ?? null,
    employed: o.employed ?? null,
    median_age: o.edad_media ?? null,
    foreign_born: o.nacidos_fuera ?? null,
    bachelors: o.estudios_sup ?? null,
    ...Object.fromEntries((nation.yields || []).filter((y) => y.unit !== "usd" && y.unit !== "eur").map((y) => [`y_${y.key}`, o.yields?.[y.key] ?? null])),
  });

  // --- recursos por lugar -----------------------------------------------------------------------------------------
  const items = resources?.items || [];
  const typeById = new Map((resources?.types || []).map((t) => [t.id, t]));
  const mwByMetro = new Map();
  items.forEach((it) => {
    if (typeById.get(it.type)?.unit !== "MW" || !fin(it.value) || !it.cbsa) return;
    mwByMetro.set(it.cbsa, (mwByMetro.get(it.cbsa) || 0) + it.value);
  });

  // --- provincias -------------------------------------------------------------------------------------------------
  const stateRows = (Array.isArray(states) ? states : []).map((s, idx) => ({
    key: s.abbr, name: s.name, sub: s.ccaa || s.abbr, level: "states", ref: idx,
    v: {
      name: s.name, abbr: s.abbr, ccaa: s.ccaa || null, ...econValues(s), ...rolled(roll.states, s.abbr),
      ...Object.fromEntries(LAND_KEYS.map((k) => [`land_${k}`, s.land?.[k] ?? null])),
      energy_mw: s.energy ? s.energy.total : null,
    },
  }));
  const landFields = LAND_KEYS.map((k) => F(`land_${k}`, LAND_LABEL[k], "pct", { unit: "del suelo", source: "worldcover", group: "Territorio", description: `Parte del suelo en ${LAND_LABEL[k].toLowerCase()} (ESA WorldCover, media de los hexágonos de la zona).`, lens: k === "forest" ? "forest" : k === "developed" ? "developed" : k === "crop" ? "farmland" : k === "shrub" ? "scrub" : null }));
  const energyField = F("energy_mw", "Potencia dibujada", "mw", { unit: "MW de las centrales del mapa", source: "wri_gppd", group: "Energía", description: "Potencia de las centrales dibujadas como recursos (cada tipo con su umbral; foto de 2021): no es toda la potencia instalada." });
  const states_ = makeLevel({
    id: "states", label: "Provincias", noun: "provincia",
    rows: stateRows,
    fields: [F("name", "Provincia", "text", { group: "Nombre" }), F("ccaa", "Comunidad", "text", { group: "Nombre" }), ...econFields("states"), F("land_km2", "Superficie", "km2", { unit: "km²", source: "es_atlas", group: "Territorio", derived: true }), ...landFields, energyField],
    highlight: (rows) => ({ states: new Set(rows.map((r) => r.ref)) }),
    rowAtCell: (cell) => (owner[cell] >= 0 ? stateRows[owner[cell]] || null : null),
    focus: (row) => app.selectState(row.ref, { fly: true }),
    cellsOf: (row) => stateCells.get(row.ref) || [],
  });

  // --- ciudades ---------------------------------------------------------------------------------------------------
  const provName = new Map((Array.isArray(states) ? states : []).map((s) => [s.abbr, s.name]));
  const metroRows = cities.map((c) => {
    const prov = provName.get((c.states || [])[0]) || (c.states || [])[0] || "";
    return {
      key: c.id, name: c.name, sub: prov, level: "metros", ref: c,
      v: {
        name: c.name, states: prov, kind: c.capital ? "Capital de España" : c.provincial_capital ? "Capital de provincia" : "Municipio",
        ...econValues(c), ...rolled(roll.metros, c.id), energy_mw: mwByMetro.get(c.id) ?? 0,
      },
    };
  });
  const metroByCity = new Map(metroRows.map((r) => [r.ref, r]));
  const metros = makeLevel({
    id: "metros", label: "Ciudades", noun: "ciudad",
    rows: metroRows,
    fields: [F("name", "Ciudad", "text", { group: "Nombre" }), F("states", "Provincia", "text", { group: "Nombre" }), F("kind", "Tipo", "text", { group: "Nombre", description: "Capital de España, capital de provincia u otro municipio." }), ...econFields("metros"), F("land_km2", "Superficie", "km2", { unit: "km²", source: "es_atlas", group: "Territorio", derived: true }), energyField],
    highlight: (rows, o = {}) => {
      const cells = new Set();
      for (const r of rows) for (const c of r.ref.footprint || [r.ref.cell]) cells.add(c);
      return { cells, cities: rows.length <= (o.ringMax ?? 30) ? new Set(rows.map((r) => r.key)) : undefined };
    },
    rowAtCell: (cell) => { const c = cellMetro.get(cell); return c ? metroByCity.get(c) : null; },
    focus: (row) => app.selectCity(row.ref, { fly: true }),
    cellsOf: (row) => row.ref.footprint || [row.ref.cell],
  });

  // --- municipios ---------------------------------------------------------------------------------------------------
  let counties_ = null;
  if (counties) {
    const cols = counties.columns;
    const cityName = new Map(cities.map((c) => [c.id, c.name]));
    const countyRows = cRows.map(({ r, i }) => {
      const v = {};
      cols.forEach((k, j) => (v[k] = r[j]));
      v.metro = v.cbsa ? cityName.get(v.cbsa) || null : null;
      v.state_name = provName.get(v.state) || v.state;
      return { key: v.geoid, name: v.name, full: v.name, sub: v.state_name, level: "counties", ref: i, v };
    });
    const worldIdx = new Map((w.raw.counties || []).map((c, k) => [c.geoid, k]));
    for (const row of countyRows) row.ref = worldIdx.get(row.key) ?? row.ref;
    const rowByWorld = new Map(countyRows.map((r) => [r.ref, r]));
    const cellsOfRow = (r) => countyCells.get(r.ref) || (Number.isInteger(r.v.cell) ? [r.v.cell] : []);
    const fields = counties.fields.filter((f) => !["cbsa", "geoid", "cell", "state"].includes(f.key)).map((f) => ({
      ...F(f.key, f.label, f.format, { unit: f.unit, higher_is: f.higher_is, source: f.source, description: f.description, lens: COUNTY_LENS[f.key], group: groupOf(f.key) }),
    }));
    fields.splice(1, 0, F("state_name", "Provincia", "text", { group: "Nombre" }), F("metro", "Ciudad del mapa", "text", { group: "Nombre", description: "Si el municipio es una de las 151 ciudades del mapa." }));
    counties_ = makeLevel({
      id: "counties", label: "Municipios", noun: "municipio",
      rows: countyRows, fields,
      highlight: (rows) => {
        const cells = new Set();
        for (const r of rows) for (const c of cellsOfRow(r)) cells.add(c);
        return { cells };
      },
      rowAtCell: (cell) => (countyOf[cell] >= 0 ? rowByWorld.get(countyOf[cell]) || null : null),
      focus: (row) => {
        const cells = cellsOfRow(row);
        if (!cells.length) return app.selectState(row.v.state, { fly: true });
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const c of cells) {
          const x = grid.cx(c), y = grid.cy(c);
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        const R = grid.R * 6;
        frameBox(app, { x0: x0 - R, y0: y0 - R, x1: x1 + R, y1: y1 + R }, { pad: 24, maxScale: 2.4 });
      },
      cellsOf: (row) => cellsOfRow(row),
    });
  }

  const countiesOffMap = counties_ ? counties_.rows.filter((r) => !counties_.cellsOf(r).length).length : 0;
  return {
    app, nation, nat, vintage, countyVintage, countiesOffMap,
    levels: { states: states_, metros, counties: counties_ },
    stateCells, countyCells, cellMetro, metroByCity,
    items, typeById,
    source: (id) => srcTitle.get(id) || null,
  };
}

/** Nombre corto de un municipio para tablas y gráficas (el INE pone el artículo al final: «Palmas de Gran Canaria, Las»). */
export function shortCounty(name) {
  return String(name || "").replace(/^(.*), (El|La|Los|Las|L'|A|O|Os|As|Es|Sa|Ses|Els|Les)$/, (_, a, b) => `${b}${b.endsWith("'") ? "" : " "}${a}`);
}

function groupOf(k) {
  if (["population", "density", "median_age", "elderly", "foreign_born", "growth"].includes(k)) return "Población";
  if (["income", "poverty", "unemployment"].includes(k)) return "Prosperidad";
  if (["bachelors"].includes(k)) return "Conocimiento";
  if (["solo"].includes(k)) return "Vida diaria";
  if (["forest", "crop", "shrub", "developed", "land_km2"].includes(k)) return "Territorio";
  if (["name", "state", "state_name", "metro"].includes(k)) return "Nombre";
  return "Otros";
}

function makeLevel(def) {
  const fieldByKey = new Map(def.fields.map((f) => [f.key, f]));
  const byKey = new Map(def.rows.map((r) => [r.key, r]));
  return {
    ...def,
    byKey,
    field: (k) => fieldByKey.get(k) || null,
    value: (row, k) => row.v[k] ?? null,
    numericFields: () => def.fields.filter((f) => f.format !== "text"),
    /** Add fields after the fact (optional files that load on demand); a key already present is skipped. */
    addFields(list) {
      for (const f of list) {
        if (fieldByKey.has(f.key)) continue;
        def.fields.push(f);
        fieldByKey.set(f.key, f);
      }
    },
  };
}

// --- campos de ficheros que se cargan bajo demanda -----------------------------------------------------------------
// extendData(data, names) carga districts y citizens con app.loadData y añade sus columnas a las ciudades.
const F4 = (key, label, format, o = {}) => ({ key, label, format, unit: o.unit || null, higher_is: o.higher_is || "neutral", source: o.source || "", description: o.description || "", lens: o.lens || null, group: o.group || "Otros", derived: !!o.derived });

export async function extendData(data, names) {
  const app = data.app;
  names = names.filter((n) => n === "districts" || n === "citizens");
  const files = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await app.loadData(n).catch(() => null)])));
  data.extended ??= new Set();
  for (const n of names) {
    if (data.extended.has(n) || !files[n]) continue;
    data.extended.add(n);
    try {
      if (n === "districts") extendDistricts(data, files[n]);
      if (n === "citizens") extendCitizens(data, files[n]);
    } catch (err) {
      console.error(`asesores: no se pudieron añadir las columnas de ${n}`, err);
    }
  }
  return files;
}

function extendDistricts(data, d) {
  const { metros } = data.levels;
  const cat = new Map((d.catalog || []).map((c) => [c.id, c]));
  const vint = d.vintage || "Censo";
  metros.addFields([
    F4("city_type", "Tipo de ciudad", "text", { source: "ine_censo", group: "Distritos", description: `La insignia de la ciudad: su distrito más fuerte, o su especialidad cuando pesa al menos 3 veces más que en España (${vint}). En blanco: ninguna rama destaca.` }),
    F4("districts", "Distritos", "text", { source: "ine_censo", group: "Distritos", description: `Distritos que la ciudad consigue, del más fuerte al más débil. ${d.rule?.text || ""}` }),
    F4("n_districts", "Número de distritos", "int", { source: "ine_censo", group: "Distritos", description: "Cuántos distritos pasan la regla (hasta 5)." }),
    F4("top_industry", "Rama más especializada", "text", { source: "ine_censo", group: "Distritos", description: "La rama (CNAE a 2 dígitos, al menos 500 ocupados) con mayor cociente de localización." }),
    F4("top_lq", "Su cociente de localización", "lq", { unit: "× el peso en España", source: "ine_censo", group: "Distritos", description: "Peso de la rama en los ocupados de la ciudad ÷ su peso en los de España." }),
  ]);
  for (const r of metros.rows) {
    const c = d.cities?.[r.key];
    const top = c?.top?.[0];
    Object.assign(r.v, {
      city_type: c?.badge?.label ?? null,
      districts: c ? (c.districts || []).map((x) => cat.get(x.id)?.name || x.id).join(", ") || null : null,
      n_districts: c ? (c.districts || []).length : null,
      top_industry: top ? d.industries?.[top.naics]?.title || top.naics : null,
      top_lq: top?.lq ?? null,
    });
  }
}

// Ciudadanos: algunos pesos reveladores de cada fila del Censo (la vista de ciudad dibuja la mezcla completa).
const CZ = [
  ["workforce", "executive", "Directivos y gerentes"], ["workforce", "engineer", "Ingenieros y científicos"], ["workforce", "healer", "Sanidad"],
  ["workforce", "service", "Servicios"], ["workforce", "farmer", "Campo y pesca"], ["workforce", "builder", "Construcción"],
  ["workforce", "maker", "Fábrica y transporte"],
  ["age", "child", "Menores de 16"], ["age", "young", "De 16 a 34"], ["age", "elder", "65 o más"],
  ["education", "graduate", "Máster o doctorado"],
  ["nativity", "born_in_state", "Nacidos en el municipio"], ["nativity", "native_abroad", "Nacidos en otra comunidad"], ["nativity", "foreign_born", "Nacidos en el extranjero"],
];
function extendCitizens(data, cz) {
  const { metros } = data.levels;
  const vint = cz.vintage || "Censo";
  const label = new Map(Object.entries(cz.groups || {}).flatMap(([row, list]) => list.map((g) => [`${row}.${g.key}`, g.label])));
  const rowDesc = cz.rows || {};
  const grp = { workforce: "Ciudadanos: trabajo", age: "Ciudadanos: edad", education: "Ciudadanos: estudios", nativity: "Ciudadanos: origen" };
  metros.addFields([
    ...CZ.map(([row, key, lbl]) => F4(`cz_${key}`, lbl, "pct", {
      unit: (rowDesc[row] || row).toLowerCase(), source: "ine_censo", group: grp[row],
      description: `${label.get(`${row}.${key}`) || lbl}: parte de ${(rowDesc[row] || row).toLowerCase()} (${vint}).`,
    })),
    F4("cz_degree", "Superiores (FP sup., grado o más)", "pct", { unit: "de la población de 15+", source: "ine_censo", group: grp.education, description: `Población de 15 años o más con FP superior, grado, máster o doctorado (${vint}).` }),
    F4("cz_specialist", "Ciudadano que más destaca", "text", { source: "ine_censo", group: "Ciudadanos", description: `La categoría que más pesa frente a España (al menos 1,5 veces). ${cz.rule?.text || ""}` }),
  ]);
  for (const r of metros.rows) {
    const c = cz.cities?.[r.key];
    for (const [row, key] of CZ) r.v[`cz_${key}`] = c?.[row]?.shares?.[key] ?? null;
    r.v.cz_degree = c?.education?.bachelors_plus ?? null;
    const sp = (c?.specialists || []).find((s) => s.ratio >= 1);
    r.v.cz_specialist = sp ? `${label.get(`${sp.row}.${sp.key}`) || sp.key} ×${sp.ratio.toFixed(1).replace(".", ",")}` : null;
  }
}

/** The highlight for a set of rows of one level, with defaults (gold outline, other land dimmed when asked). */
export function rowsHighlight(level, rows, opts = {}) {
  if (!level || !rows || !rows.length) return null;
  const one = rows.length === 1 ? rows[0] : null;
  const label = opts.label ?? (one ? (one.level === "states" ? one.name : `${one.full || one.name}${one.sub ? `, ${one.sub}` : ""}`) : "");
  return { ...level.highlight(rows, opts), dimOthers: !!opts.dim, color: opts.color, label };
}
