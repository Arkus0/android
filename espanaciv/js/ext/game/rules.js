// Reglas de «Hispania», el modo de juego de España Civ: un 4X por turnos original sobre el mapa real. Aquí solo
// hay datos (pueblos, terrenos, recursos, unidades, edificios, maravillas y tecnologías); la lógica está en sim.js.

export const START_YEAR = -1000;
export const YEARS_PER_TURN = 10;
export const MAX_TURNS = 260;

export function yearOf(turn) { return START_YEAR + (turn - 1) * YEARS_PER_TURN; }
export function yearLabel(turn) {
  const y = yearOf(turn);
  return y < 0 ? `${-y} a. C.` : `${Math.max(1, y)} d. C.`;
}

// --- pueblos -----------------------------------------------------------------------------------------------------
// Pueblos históricos de la Península hacia el 1000 a. C. La casilla de salida de cada uno está en data/game.json.
export const PEOPLES = [
  {
    id: "iberos", name: "Íberos", adj: "íbero", color: "#2d6fd6", ink: "#fff", region: "Edeta (Llíria), Levante",
    bonus: "Dama de Elche: +2 🎭 y +1 🔬 en cada ciudad.",
    names: ["Edeta", "Arse", "Saetabis", "Ilici", "Kelin", "Bastetania", "Contestania", "Lucentum", "Dianium", "Sucro"],
  },
  {
    id: "celtiberos", name: "Celtíberos", adj: "celtíbero", color: "#8b3fb0", ink: "#fff", region: "Numantia (Garray), Sistema Ibérico",
    bonus: "Espada de doble filo: +4 ⚔️ a las unidades cuerpo a cuerpo. Empiezan con Minería.",
    names: ["Numantia", "Segeda", "Termes", "Uxama", "Arcobriga", "Bilbilis", "Contrebia", "Ocilis", "Segontia", "Clunia"],
  },
  {
    id: "vascones", name: "Vascones", adj: "vascón", color: "#d63c3c", ink: "#fff", region: "Pompaelo (Pamplona), Pirineo occidental",
    bonus: "Montañeses: +5 🛡️ a sus unidades en colinas y montañas.",
    names: ["Pompaelo", "Iturissa", "Oiasso", "Calagurris", "Gracurris", "Andelos", "Cascantum", "Iacca", "Ologicus", "Aracaeli"],
  },
  {
    id: "galaicos", name: "Galaicos", adj: "galaico", color: "#eeeeee", ink: "#14202c", region: "Lucus (Lugo), Gallaecia",
    bonus: "Castros y rías: +1 🌾 en el mar y en el bosque atlántico que trabajen sus ciudades.",
    names: ["Lucus", "Brigantium", "Iria", "Auria", "Tude", "Aquae Celenis", "Castro de Baroña", "Viladonga", "Santa Tegra", "Ocelum"],
  },
  {
    id: "ilergetes", name: "Ilergetes", adj: "ilergete", color: "#e08a1e", ink: "#14202c", region: "Iltirta (Lleida), valle del Segre",
    bonus: "Señores del Segre: +1 ⚙️ en las casillas de río que trabajen sus ciudades.",
    names: ["Iltirta", "Athanagrum", "Iesso", "Aeso", "Bolskan", "Osca", "Ilerda", "Celsa", "Dertosa", "Ausa"],
  },
  {
    id: "punicos", name: "Púnicos", adj: "púnico", color: "#b0197a", ink: "#fff", region: "Qart Hadasht (Cartagena), costa del sureste",
    bonus: "Mercaderes del mar: empiezan con Navegación; +2 💰 en las ciudades costeras.",
    names: ["Qart Hadasht", "Gadir", "Malaka", "Sexi", "Abdera", "Baria", "Ebusus", "Akra Leuke", "Mago", "Sulcis"],
  },
  {
    id: "tartesios", name: "Tartesios", adj: "tartesio", color: "#e6c229", ink: "#14202c", region: "Ispal (Sevilla), bajo Guadalquivir",
    bonus: "La plata de Tarteso: +2 💰 en cada ciudad y +1 💰 en cada recurso trabajado.",
    names: ["Ispal", "Onoba", "Carmo", "Ilipla", "Hasta Regia", "Astigi", "Urso", "Italica", "Ilipa", "Asido"],
  },
  {
    id: "vettones", name: "Vettones", adj: "vettón", color: "#4b3fc4", ink: "#fff", region: "Salmantica (Salamanca), Meseta occidental",
    bonus: "Verracos: +1 🌾 en los pastizales que trabajen sus ciudades. Empiezan con Ganadería.",
    names: ["Salmantica", "Obila", "Ulaca", "Cauca", "Lancia", "Capara", "Caesarobriga", "Mirobriga", "Las Cogotas", "El Raso"],
  },
  {
    id: "carpetanos", name: "Carpetanos", adj: "carpetano", color: "#16b3c6", ink: "#14202c", region: "Toletum (Toledo), Tajo",
    bonus: "Corazón de la Meseta: +3 🔬 en la capital y +10 % de ciencia.",
    names: ["Toletum", "Complutum", "Consabura", "Titulcia", "Segobriga", "Mantua", "Iplacea", "Laminium", "Ercavica", "Miaccum"],
  },
];
export const PEOPLE_BY_ID = new Map(PEOPLES.map((p) => [p.id, p]));

export const DIFFICULTY = {
  facil: { label: "Fácil", ai: 0.8, aiWar: 0.5 },
  normal: { label: "Normal", ai: 1.0, aiWar: 1 },
  dificil: { label: "Difícil", ai: 1.3, aiWar: 1.5 },
};

// --- terreno ----------------------------------------------------------------------------------------------------
// Cobertura (world.json `cover`) → rendimiento base. f comida, p producción, g oro, s ciencia, c cultura.
export const COVER = {
  0: { name: "Tierra", f: 1, p: 1 },
  1: { name: "Bosque caducifolio", f: 1, p: 2, forest: true },
  2: { name: "Bosque mediterráneo", f: 1, p: 2, forest: true },
  3: { name: "Bosque atlántico", f: 1, p: 2, forest: true },
  4: { name: "Matorral", f: 1, p: 1 },
  5: { name: "Pastizal", f: 2, p: 0, g: 1 },
  6: { name: "Prado", f: 2, p: 1 },
  7: { name: "Vega fértil", f: 2, p: 1 },
  8: { name: "Humedal", f: 2, p: 0, marsh: true },
  9: { name: "Vega fértil", f: 2, p: 1 },
  10: { name: "Pedregal", f: 0, p: 1 },
  11: { name: "Nieve", f: 0, p: 0 },
};
export const RELIEF = {
  0: { name: "Llano", move: 1, def: 0 },
  1: { name: "Colinas", move: 2, def: 3, p: 1 },
  2: { name: "Montañas", move: 3, def: 5, p: 1, fMax: 0 },
  3: { name: "Cumbres", move: Infinity, def: 0 },
};
export const WATER = {
  1: { name: "Mar abierto", f: 1, p: 0, g: 0 },
  2: { name: "Costa", f: 1, p: 0, g: 1 },
  3: { name: "Lago", f: 2, p: 0, g: 1 },
};

// --- recursos --------------------------------------------------------------------------------------------------
export const RESOURCES = {
  plata: { name: "Plata", emoji: "🪙", g: 3 },
  oro: { name: "Oro", emoji: "🥇", g: 4 },
  cobre: { name: "Cobre", emoji: "🟠", p: 2, g: 1 },
  hierro: { name: "Hierro", emoji: "⛏️", p: 2 },
  estano: { name: "Estaño", emoji: "🔩", p: 1, g: 1 },
  mercurio: { name: "Mercurio", emoji: "⚗️", g: 2, s: 1 },
  sal: { name: "Sal", emoji: "🧂", f: 1, g: 1 },
  caballos: { name: "Caballos", emoji: "🐎", f: 1, p: 1 },
  ovejas: { name: "Ovejas merinas", emoji: "🐑", f: 1, g: 1 },
  olivo: { name: "Olivar", emoji: "🫒", f: 1, g: 2 },
  vino: { name: "Viñedo", emoji: "🍇", f: 1, g: 1, c: 1 },
  trigo: { name: "Trigo", emoji: "🌾", f: 2 },
  atun: { name: "Almadraba", emoji: "🐟", f: 2, g: 1 },
  pesca: { name: "Pesca", emoji: "🦐", f: 2 },
  marmol: { name: "Mármol", emoji: "🪨", p: 2, c: 1 },
  seda: { name: "Seda", emoji: "🧵", g: 3 },
  azafran: { name: "Azafrán", emoji: "🌸", g: 2, c: 1 },
  madera: { name: "Madera", emoji: "🪵", p: 1 },
  ganado: { name: "Ganado", emoji: "🐄", f: 1, p: 1 },
};

// --- unidades ---------------------------------------------------------------------------------------------------
// cls: civil | explorador | melee | ranged | montada | asedio. str = fuerza cuerpo a cuerpo; rstr/range = a distancia.
export const UNITS = {
  colono: { name: "Colonos", emoji: "🛖", cls: "civil", str: 0, mov: 2, cost: 40, desc: "Funda una ciudad nueva. Cuesta 1 de población." },
  explorador: { name: "Exploradores", emoji: "🧭", cls: "explorador", str: 10, mov: 3, cost: 25, sight: 3, desc: "Rápidos y con vista larga; no conquistan ciudades." },
  guerreros: { name: "Guerreros", emoji: "🪓", cls: "melee", str: 20, mov: 2, cost: 25, desc: "La primera defensa de un poblado." },
  honderos: { name: "Honderos", emoji: "🎯", cls: "ranged", str: 12, rstr: 24, range: 2, mov: 2, cost: 35, tech: "honda", desc: "Atacan a dos casillas sin recibir daño. Los de Baleares eran famosos." },
  lanceros: { name: "Lanceros", emoji: "🔱", cls: "melee", str: 26, vsMounted: 10, mov: 2, cost: 45, tech: "bronce", desc: "+10 ⚔️ contra unidades montadas." },
  jinetes: { name: "Jinetes", emoji: "🐴", cls: "montada", str: 30, mov: 4, cost: 55, tech: "doma", desc: "Muy rápidos; perfectos para rematar." },
  falcateros: { name: "Infantería de falcata", emoji: "🗡️", cls: "melee", str: 36, mov: 2, cost: 65, tech: "hierro", desc: "La espada curva íbera, temida en todo el Mediterráneo." },
  catapulta: { name: "Catapulta", emoji: "🪨", cls: "asedio", str: 14, rstr: 34, range: 2, mov: 1, cost: 80, vsCity: 15, tech: "matematicas", desc: "+15 ⚔️ contra ciudades. Lenta y frágil." },
  legion: { name: "Legión", emoji: "🛡️", cls: "melee", str: 42, mov: 2, cost: 90, tech: "leyes", desc: "Infantería pesada organizada en cohortes." },
  caballeros: { name: "Caballeros", emoji: "🏇", cls: "montada", str: 48, mov: 4, cost: 120, tech: "feudalismo", desc: "Caballería pesada medieval." },
  ballesteros: { name: "Ballesteros", emoji: "🏹", cls: "ranged", str: 28, rstr: 42, range: 2, mov: 2, cost: 110, tech: "maquinaria", desc: "La ballesta: tiro potente a dos casillas." },
  almogavares: { name: "Almogávares", emoji: "⚔️", cls: "melee", str: 52, mov: 3, cost: 130, tech: "maquinaria", desc: "Infantería ligera de frontera, rápida y feroz." },
  tercios: { name: "Tercios", emoji: "💂", cls: "melee", str: 62, mov: 2, cost: 170, tech: "polvora", desc: "Picas y arcabuces: la infantería más fuerte del juego." },
  bombarda: { name: "Bombarda", emoji: "💣", cls: "asedio", str: 20, rstr: 55, range: 2, mov: 1, cost: 170, vsCity: 20, tech: "polvora", desc: "Artillería de pólvora: derriba murallas." },
};

// --- edificios --------------------------------------------------------------------------------------------------
export const BUILDINGS = {
  dolmen: { name: "Dolmen", emoji: "🗿", cost: 40, c: 2, desc: "+2 🎭: la cultura hace crecer las fronteras." },
  granero: { name: "Granero", emoji: "🏺", cost: 55, tech: "alfareria", f: 2, housing: 2, desc: "+2 🌾 y +2 de vivienda." },
  murallas: { name: "Murallas", emoji: "🧱", cost: 70, tech: "albanileria", def: 12, hp: 100, desc: "+12 🛡️ y +100 de vida a la ciudad; le permite disparar." },
  templo: { name: "Santuario", emoji: "⛩️", cost: 70, tech: "misticismo", c: 3, desc: "+3 🎭." },
  biblioteca: { name: "Biblioteca", emoji: "📜", cost: 80, tech: "escritura", s: 3, desc: "+3 🔬." },
  puerto: { name: "Puerto", emoji: "⚓", cost: 85, tech: "navegacion", coastal: true, g: 1, waterF: 1, desc: "+1 🌾 en cada casilla de agua y +1 💰. Solo en la costa." },
  mercado: { name: "Mercado", emoji: "⚖️", cost: 90, tech: "moneda", g: 3, gPct: 0.15, desc: "+3 💰 y +15 % de oro." },
  forja: { name: "Forja", emoji: "🔥", cost: 90, tech: "hierro", p: 3, desc: "+3 ⚙️." },
  acueducto: { name: "Acueducto", emoji: "🌉", cost: 110, tech: "ingenieria", housing: 6, desc: "+6 de vivienda: la ciudad puede crecer más." },
  teatro: { name: "Teatro", emoji: "🎭", cost: 110, tech: "drama", c: 4, desc: "+4 🎭." },
  termas: { name: "Termas", emoji: "♨️", cost: 100, tech: "ingenieria", f: 1, c: 2, housing: 2, desc: "+1 🌾, +2 🎭 y +2 de vivienda." },
  molino: { name: "Molino", emoji: "⚙️", cost: 130, tech: "maquinaria", p: 3, f: 1, desc: "+3 ⚙️ y +1 🌾." },
  catedral: { name: "Catedral", emoji: "⛪", cost: 160, tech: "teologia", c: 5, desc: "+5 🎭." },
  castillo: { name: "Castillo", emoji: "🏰", cost: 160, tech: "feudalismo", needs: "murallas", def: 14, hp: 100, desc: "+14 🛡️ y +100 de vida. Requiere murallas." },
  universidad: { name: "Universidad", emoji: "🎓", cost: 180, tech: "universidad", s: 5, sPct: 0.15, desc: "+5 🔬 y +15 % de ciencia." },
  lonja: { name: "Lonja", emoji: "🏛️", cost: 180, tech: "banca", g: 5, gPct: 0.2, desc: "+5 💰 y +20 % de oro." },
  imprenta: { name: "Imprenta", emoji: "🖨️", cost: 200, tech: "imprenta", s: 4, c: 3, desc: "+4 🔬 y +3 🎭." },
};

// --- maravillas -------------------------------------------------------------------------------------------------
// Cada una solo puede construirse en una ciudad cuyo territorio incluya su sitio real (data/game.json).
export const WONDERS = {
  atapuerca: { name: "Atapuerca", emoji: "🦴", cost: 120, s: 3, c: 1, desc: "+3 🔬 y +1 🎭. La cuna de los primeros europeos." },
  altamira: { name: "Cueva de Altamira", emoji: "🐂", cost: 140, tech: "misticismo", c: 5, desc: "+5 🎭." },
  antequera: { name: "Dólmenes de Antequera", emoji: "🗿", cost: 150, tech: "albanileria", c: 2, allC: 1, desc: "+2 🎭 aquí y +1 🎭 en todas tus ciudades." },
  hercules: { name: "Torre de Hércules", emoji: "🗼", cost: 160, tech: "navegacion", coastG: 2, embark: 1, desc: "+2 💰 en tus ciudades costeras y +1 movimiento en el mar." },
  lugo: { name: "Muralla de Lugo", emoji: "🧱", cost: 200, tech: "ingenieria", freeWalls: true, desc: "Murallas gratis en todas tus ciudades, presentes y futuras." },
  medulas: { name: "Las Médulas", emoji: "⛰️", cost: 200, tech: "ingenieria", g: 7, desc: "+7 💰: las minas de oro más grandes del Imperio romano." },
  segovia: { name: "Acueducto de Segovia", emoji: "🌉", cost: 230, tech: "ingenieria", allF: 1, allHousing: 2, desc: "+1 🌾 y +2 de vivienda en todas tus ciudades." },
  merida: { name: "Teatro de Mérida", emoji: "🎭", cost: 220, tech: "drama", c: 6, desc: "+6 🎭." },
  tarraco: { name: "Tarraco", emoji: "🏟️", cost: 220, tech: "leyes", g: 4, c: 2, desc: "+4 💰 y +2 🎭." },
  toledo: { name: "Escuela de Traductores de Toledo", emoji: "📚", cost: 250, tech: "filosofia", s: 6, desc: "+6 🔬." },
  mezquita: { name: "Mezquita de Córdoba", emoji: "🕌", cost: 300, tech: "teologia", c: 5, s: 4, desc: "+5 🎭 y +4 🔬." },
  azahara: { name: "Medina Azahara", emoji: "🏯", cost: 280, tech: "arquitectura", g: 6, c: 2, desc: "+6 💰 y +2 🎭." },
  alhambra: { name: "Alhambra", emoji: "🏰", cost: 320, tech: "arquitectura", c: 5, allDef: 5, desc: "+5 🎭 y +5 🛡️ en todas tus ciudades." },
  burgos: { name: "Catedral de Burgos", emoji: "⛪", cost: 300, tech: "teologia", c: 7, desc: "+7 🎭." },
  santiago: { name: "Camino de Santiago", emoji: "🐚", cost: 280, tech: "teologia", allG: 1, allC: 1, desc: "+1 💰 y +1 🎭 en todas tus ciudades." },
  salamanca: { name: "Universidad de Salamanca", emoji: "🎓", cost: 350, tech: "universidad", s: 8, desc: "+8 🔬." },
  sevilla: { name: "Casa de Contratación", emoji: "🧭", cost: 320, tech: "cartografia", g: 8, desc: "+8 💰. (Catedral y Alcázar de Sevilla)" },
  escorial: { name: "El Escorial", emoji: "👑", cost: 400, tech: "imprenta", s: 5, c: 5, desc: "+5 🔬 y +5 🎭." },
};

// --- tecnologías ------------------------------------------------------------------------------------------------
export const ERAS = ["Antigüedad", "Época clásica", "Edad Media"];
export const TECHS = {
  agricultura: { name: "Agricultura", era: 0, cost: 0, req: [], desc: "El punto de partida." },
  alfareria: { name: "Alfarería", era: 0, cost: 25, req: ["agricultura"] },
  ganaderia: { name: "Ganadería", era: 0, cost: 25, req: ["agricultura"], desc: "+1 🌾 en los pastizales." },
  mineria: { name: "Minería", era: 0, cost: 25, req: ["agricultura"], desc: "+1 ⚙️ en las colinas." },
  honda: { name: "La honda", era: 0, cost: 30, req: ["agricultura"] },
  misticismo: { name: "Misticismo", era: 0, cost: 40, req: ["alfareria"] },
  escritura: { name: "Escritura", era: 0, cost: 45, req: ["alfareria"] },
  bronce: { name: "Bronce", era: 0, cost: 45, req: ["mineria"] },
  doma: { name: "Doma del caballo", era: 0, cost: 45, req: ["ganaderia"] },
  albanileria: { name: "Albañilería", era: 0, cost: 50, req: ["mineria"] },
  navegacion: { name: "Navegación", era: 0, cost: 55, req: ["alfareria"], desc: "Las unidades pueden embarcar por la costa." },
  moneda: { name: "Moneda", era: 1, cost: 80, req: ["bronce", "escritura"] },
  hierro: { name: "Hierro", era: 1, cost: 80, req: ["bronce"] },
  matematicas: { name: "Matemáticas", era: 1, cost: 90, req: ["escritura", "albanileria"] },
  drama: { name: "Teatro y poesía", era: 1, cost: 90, req: ["misticismo", "escritura"] },
  filosofia: { name: "Filosofía", era: 1, cost: 110, req: ["drama"] },
  ingenieria: { name: "Ingeniería", era: 1, cost: 120, req: ["albanileria", "matematicas"] },
  leyes: { name: "Derecho", era: 1, cost: 120, req: ["moneda", "hierro"] },
  cartografia: { name: "Cartografía", era: 1, cost: 130, req: ["navegacion", "matematicas"], desc: "Las unidades pueden cruzar el mar abierto." },
  teologia: { name: "Teología", era: 2, cost: 180, req: ["filosofia"] },
  feudalismo: { name: "Feudalismo", era: 2, cost: 180, req: ["leyes", "doma"] },
  arquitectura: { name: "Arquitectura", era: 2, cost: 200, req: ["ingenieria", "filosofia"] },
  maquinaria: { name: "Maquinaria", era: 2, cost: 200, req: ["ingenieria", "hierro"] },
  banca: { name: "Banca", era: 2, cost: 260, req: ["moneda", "feudalismo"] },
  universidad: { name: "Universidad", era: 2, cost: 260, req: ["teologia", "arquitectura"] },
  polvora: { name: "Pólvora", era: 2, cost: 320, req: ["maquinaria", "universidad"] },
  imprenta: { name: "Imprenta", era: 2, cost: 360, req: ["universidad", "banca"], desc: "Descubrirla es la victoria científica." },
};
export const LAST_TECH = "imprenta";

// Qué desbloquea cada tecnología (para las fichas del árbol).
export function unlocksOf(techId) {
  const out = [];
  for (const [id, u] of Object.entries(UNITS)) if (u.tech === techId) out.push({ kind: "unit", id, ...u });
  for (const [id, b] of Object.entries(BUILDINGS)) if (b.tech === techId) out.push({ kind: "building", id, ...b });
  for (const [id, w] of Object.entries(WONDERS)) if (w.tech === techId) out.push({ kind: "wonder", id, ...w });
  return out;
}

export const YIELD_ICON = { f: "🌾", p: "⚙️", g: "💰", s: "🔬", c: "🎭" };
