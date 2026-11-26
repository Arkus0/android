// Reglas de «Hispania», el modo de juego de España Civ: un 4X por turnos original sobre el mapa real, de la Edad del
// Bronce (2000 a. C.) a 2050. Aquí solo hay datos: calendario, pueblos, terreno, recursos, unidades, edificios,
// maravillas, tecnologías, gobiernos, invasiones históricas y decisiones. La lógica está en sim.js.

// --- calendario ---------------------------------------------------------------------------------------------------
// [turno inicial, año inicial, años por turno]: los turnos se acortan a medida que la historia se acelera.
const CALENDAR = [[1, -2000, 30], [41, -800, 20], [101, 400, 15], [171, 1450, 8], [221, 1850, 4], [261, 2010, 1]];
export const MAX_TURNS = 301; // = año 2050
export function yearOf(turn) {
  let seg = CALENDAR[0];
  for (const s of CALENDAR) if (turn >= s[0]) seg = s;
  return seg[1] + (turn - seg[0]) * seg[2];
}
export function yearLabel(turn) {
  const y = yearOf(turn);
  return y < 0 ? `${-y} a. C.` : `${Math.max(1, y)}`;
}
export function turnOfYear(year) {
  for (let t = 1; t <= MAX_TURNS; t++) if (yearOf(t) >= year) return t;
  return MAX_TURNS;
}

// --- pueblos -----------------------------------------------------------------------------------------------------
// Pueblos de la Península en la Edad del Bronce y del Hierro. La casilla de salida de cada uno está en data/game.json.
export const PEOPLES = [
  {
    id: "iberos", name: "Íberos", land: "Iberia", color: "#2d6fd6", ink: "#fff", region: "Edeta (Llíria), Levante",
    bonus: "Dama de Elche: +2 🎭 y +1 🔬 en cada ciudad.",
    names: ["Edeta", "Arse", "Saetabis", "Ilici", "Kelin", "Sucro", "Lucentum", "Dianium", "Bastetania", "Contestania"],
  },
  {
    id: "celtiberos", name: "Celtíberos", land: "Celtiberia", color: "#8b3fb0", ink: "#fff", region: "Numantia (Garray), Sistema Ibérico",
    bonus: "Espada de doble filo: +4 ⚔️ a las unidades cuerpo a cuerpo. Empiezan con Minería.",
    names: ["Numantia", "Segeda", "Termes", "Uxama", "Arcobriga", "Bilbilis", "Contrebia", "Ocilis", "Segontia", "Clunia"],
  },
  {
    id: "vascones", name: "Vascones", land: "Vasconia", color: "#d63c3c", ink: "#fff", region: "Pompaelo (Pamplona), Pirineo occidental",
    bonus: "Montañeses: +5 🛡️ a sus unidades en colinas y montañas; +10 de estabilidad.",
    names: ["Pompaelo", "Iturissa", "Oiasso", "Calagurris", "Gracurris", "Andelos", "Cascantum", "Iacca", "Ologicus", "Aracaeli"],
  },
  {
    id: "galaicos", name: "Galaicos", land: "Gallaecia", color: "#eeeeee", ink: "#14202c", region: "Lucus (Lugo), Gallaecia",
    bonus: "Castros y rías: +1 🌾 en el mar y en el bosque atlántico que trabajen sus ciudades.",
    names: ["Lucus", "Brigantium", "Iria", "Auria", "Tude", "Aquae Celenis", "Baroña", "Viladonga", "Santa Tegra", "Ocelum"],
  },
  {
    id: "ilergetes", name: "Ilergetes", land: "Ilergecia", color: "#e08a1e", ink: "#14202c", region: "Iltirta (Lleida), valle del Segre",
    bonus: "Señores del Segre: +1 ⚙️ en las casillas de río que trabajen sus ciudades.",
    names: ["Iltirta", "Athanagrum", "Iesso", "Aeso", "Bolskan", "Osca", "Celsa", "Dertosa", "Ausa", "Ilerda"],
  },
  {
    id: "argaricos", name: "Argáricos", land: "Argaria", color: "#b0197a", ink: "#fff", region: "El Argar (Antas), sureste",
    bonus: "Señores del bronce: empiezan con Minería y Bronce; +1 ⚙️ en colinas y montañas.",
    names: ["El Argar", "Fuente Álamo", "Gatas", "La Bastida", "Lorca", "Castellón Alto", "Peñalosa", "Cerro de la Encina", "Tira del Lienzo", "Baria"],
  },
  {
    id: "tartesios", name: "Tartesios", land: "Tarteso", color: "#e6c229", ink: "#14202c", region: "Ispal (Sevilla), bajo Guadalquivir",
    bonus: "La plata de Tarteso: +2 💰 en cada ciudad y +1 💰 en cada recurso trabajado.",
    names: ["Ispal", "Onoba", "Carmo", "Ilipla", "Hasta Regia", "Astigi", "Urso", "Italica", "Ilipa", "Asido"],
  },
  {
    id: "vettones", name: "Vettones", land: "Vettonia", color: "#4b3fc4", ink: "#fff", region: "Salmantica (Salamanca), Meseta occidental",
    bonus: "Verracos: +1 🌾 en los pastizales que trabajen sus ciudades. Empiezan con Ganadería.",
    names: ["Salmantica", "Obila", "Ulaca", "Cauca", "Lancia", "Capara", "Caesarobriga", "Mirobriga", "Las Cogotas", "El Raso"],
  },
  {
    id: "carpetanos", name: "Carpetanos", land: "Carpetania", color: "#16b3c6", ink: "#14202c", region: "Toletum (Toledo), Tajo",
    bonus: "Corazón de la Meseta: +3 🔬 en la capital y +10 % de ciencia.",
    names: ["Toletum", "Complutum", "Consabura", "Titulcia", "Segobriga", "Mantua", "Iplacea", "Laminium", "Ercavica", "Miaccum"],
  },
];
export const PEOPLE_BY_ID = new Map(PEOPLES.map((p) => [p.id, p]));

export const DIFFICULTY = {
  facil: { label: "Fácil", ai: 0.8, aiWar: 0.5, invasion: 0.6 },
  normal: { label: "Normal", ai: 1.0, aiWar: 1, invasion: 1 },
  dificil: { label: "Difícil", ai: 1.25, aiWar: 1.5, invasion: 1.35 },
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
  2: { name: "Costa", f: 2, p: 0, g: 1 },
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
// `obs`: tecnología que la deja obsoleta (ya no se ofrece al construir).
export const UNITS = {
  colono: { name: "Colonos", emoji: "🛖", cls: "civil", str: 0, mov: 2, cost: 40, desc: "Funda una ciudad nueva. Cuesta 1 de población." },
  explorador: { name: "Exploradores", emoji: "🧭", cls: "explorador", str: 10, mov: 3, cost: 25, sight: 3, obs: "ferrocarril", desc: "Rápidos y con vista larga; no conquistan ciudades." },
  guerreros: { name: "Guerreros", emoji: "🪓", cls: "melee", str: 20, mov: 2, cost: 25, obs: "bronce", desc: "La primera defensa de un poblado." },
  honderos: { name: "Honderos", emoji: "🎯", cls: "ranged", str: 12, rstr: 24, range: 2, mov: 2, cost: 35, tech: "honda", obs: "maquinaria", desc: "Atacan a dos casillas sin recibir daño. Los de Baleares eran famosos." },
  lanceros: { name: "Lanceros", emoji: "🔱", cls: "melee", str: 26, vsMounted: 10, mov: 2, cost: 45, tech: "bronce", obs: "hierro", desc: "+10 ⚔️ contra unidades montadas." },
  jinetes: { name: "Jinetes", emoji: "🐴", cls: "montada", str: 30, mov: 4, cost: 55, tech: "doma", obs: "feudalismo", desc: "Muy rápidos; perfectos para rematar." },
  falcateros: { name: "Infantería de falcata", emoji: "🗡️", cls: "melee", str: 36, mov: 2, cost: 65, tech: "hierro", obs: "leyes", desc: "La espada curva íbera, temida en todo el Mediterráneo." },
  catapulta: { name: "Catapulta", emoji: "🪨", cls: "asedio", str: 14, rstr: 34, range: 2, mov: 1, cost: 80, vsCity: 15, tech: "matematicas", obs: "polvora", desc: "+15 ⚔️ contra ciudades. Lenta y frágil." },
  legion: { name: "Legión", emoji: "🛡️", cls: "melee", str: 42, mov: 2, cost: 90, tech: "leyes", obs: "maquinaria", desc: "Infantería pesada organizada en cohortes." },
  caballeros: { name: "Caballeros", emoji: "🏇", cls: "montada", str: 48, mov: 4, cost: 120, tech: "feudalismo", obs: "metalurgia", desc: "Caballería pesada medieval." },
  ballesteros: { name: "Ballesteros", emoji: "🏹", cls: "ranged", str: 28, rstr: 42, range: 2, mov: 2, cost: 110, tech: "maquinaria", obs: "fusiles", desc: "La ballesta: tiro potente a dos casillas." },
  almogavares: { name: "Almogávares", emoji: "⚔️", cls: "melee", str: 52, mov: 3, cost: 130, tech: "maquinaria", obs: "polvora", desc: "Infantería ligera de frontera, rápida y feroz." },
  tercios: { name: "Tercios", emoji: "💂", cls: "melee", str: 62, mov: 2, cost: 170, tech: "polvora", obs: "fusiles", desc: "Picas y arcabuces: la infantería de la Edad Moderna." },
  bombarda: { name: "Bombarda", emoji: "💣", cls: "asedio", str: 20, rstr: 55, range: 2, mov: 1, cost: 170, vsCity: 20, tech: "polvora", obs: "metalurgia", desc: "Artillería de pólvora: derriba murallas." },
  dragones: { name: "Dragones", emoji: "🐎", cls: "montada", str: 64, mov: 4, cost: 200, tech: "metalurgia", obs: "motor", desc: "Caballería con armas de fuego." },
  canones: { name: "Cañones", emoji: "💥", cls: "asedio", str: 26, rstr: 68, range: 2, mov: 1, cost: 210, vsCity: 20, tech: "metalurgia", obs: "ferrocarril", desc: "Artillería de bronce y hierro colado." },
  fusileros: { name: "Fusileros", emoji: "🎖️", cls: "melee", str: 78, mov: 2, cost: 260, tech: "fusiles", obs: "motor", desc: "Infantería de línea con fusil de retrocarga." },
  artilleria: { name: "Artillería", emoji: "🧨", cls: "asedio", str: 34, rstr: 88, range: 3, mov: 2, cost: 300, vsCity: 20, tech: "ferrocarril", obs: "robotica", desc: "Tiro a tres casillas. +20 ⚔️ contra ciudades." },
  infanteria: { name: "Infantería moderna", emoji: "🪖", cls: "melee", str: 98, mov: 2, cost: 360, tech: "motor", obs: "robotica", desc: "Soldados con armas automáticas y radio." },
  blindados: { name: "Blindados", emoji: "🚛", cls: "montada", str: 108, mov: 5, cost: 420, tech: "motor", desc: "Carros de combate: rápidos y durísimos." },
  aviones: { name: "Aviación", emoji: "✈️", cls: "ranged", str: 40, rstr: 115, range: 5, mov: 6, cost: 480, tech: "aviacion", desc: "Ataca a cinco casillas sin recibir daño." },
  drones: { name: "Drones", emoji: "🛸", cls: "ranged", str: 50, rstr: 132, range: 4, mov: 5, cost: 520, tech: "robotica", desc: "Ataque de precisión a distancia." },
  robots: { name: "Infantería robotizada", emoji: "🤖", cls: "melee", str: 135, mov: 3, cost: 600, tech: "robotica", desc: "Exoesqueletos y robots de combate." },
  // civiles especiales
  obreros: { name: "Obreros", emoji: "👷", cls: "civil", worker: true, str: 0, mov: 2, cost: 30, desc: "Construyen granjas, minas, aserraderos, viñedos, dehesas y caminos en tu territorio." },
  mercaderes: { name: "Mercaderes", emoji: "🧳", cls: "civil", trade: true, str: 0, mov: 2, cost: 60, tech: "moneda", desc: "Llévalos junto a otra ciudad (tuya o de un vecino en paz) para abrir una ruta comercial." },
  // marina: solo navegan; las que tienen tiro bombardean costas y barcos a distancia
  galera: { name: "Galera", emoji: "🚣", cls: "naval", str: 24, mov: 3, cost: 50, tech: "navegacion", obs: "oceanica", desc: "Barco de remos para la costa. Ataca a otros barcos." },
  carabela: { name: "Carabela", emoji: "⛵", cls: "naval", str: 28, mov: 5, cost: 70, sight: 3, tech: "oceanica", obs: "vapor", desc: "Rápida y con vista larga: para explorar los mares." },
  galeon: { name: "Galeón", emoji: "🚢", cls: "naval", str: 40, rstr: 42, range: 2, mov: 4, cost: 120, tech: "oceanica", obs: "metalurgia", desc: "Barco de guerra con cañones: bombardea a dos casillas." },
  navio: { name: "Navío de línea", emoji: "🚢", cls: "naval", str: 55, rstr: 64, range: 2, mov: 4, cost: 180, tech: "metalurgia", obs: "electricidad", desc: "Tres puentes de cañones." },
  acorazado: { name: "Acorazado", emoji: "🛳️", cls: "naval", str: 85, rstr: 95, range: 3, mov: 5, cost: 320, tech: "electricidad", obs: "informatica", desc: "Blindado y con cañones de gran calibre." },
  submarino: { name: "Submarino", emoji: "🦈", cls: "naval", str: 80, rstr: 105, range: 2, mov: 5, cost: 340, tech: "motor", desc: "Ataca barcos y costas desde el fondo del mar." },
  fragata: { name: "Fragata moderna", emoji: "🛥️", cls: "naval", str: 105, rstr: 128, range: 3, mov: 6, cost: 450, tech: "informatica", desc: "Misiles y radar." },
};

// --- mejoras del terreno (las construyen los obreros) ------------------------------------------------------------
// where: llano (tierra de labor) | mina (colinas, montañas o mineral) | bosque | cultivo (olivo, vino, seda, azafrán)
// | pasto (pastizal o ganado). up: rendimiento extra con una tecnología.
export const IMPROVEMENTS = {
  granja: { name: "Campos de labor", emoji: "🌱", turns: 4, where: "llano", f: 1, up: { tech: "vapor", f: 1 } },
  mina: { name: "Mina", emoji: "⚒️", turns: 5, where: "mina", tech: "mineria", p: 1, up: { tech: "metalurgia", p: 1 } },
  aserradero: { name: "Aserradero", emoji: "🪓", turns: 4, where: "bosque", tech: "hierro", p: 1, up: { tech: "vapor", p: 1 } },
  cultivo: { name: "Viñedo u olivar", emoji: "🍷", turns: 5, where: "cultivo", tech: "alfareria", g: 2, up: { tech: "economia", g: 1 } },
  dehesa: { name: "Dehesa", emoji: "🐖", turns: 4, where: "pasto", tech: "ganaderia", f: 1, g: 1, up: { tech: "ferrocarril", f: 1 } },
};
export const MINERALS = ["plata", "oro", "cobre", "hierro", "estano", "mercurio", "sal", "marmol"];
export const PLANTS = ["olivo", "vino", "seda", "azafran"];
export const ROAD = { name: "Camino", emoji: "🛤️", turns: 3, tech: "doma", desc: "Mover por caminos cuesta la mitad (con el ferrocarril, la cuarta parte)." };

// --- edificios --------------------------------------------------------------------------------------------------
// f, p, g, s, c: rendimiento fijo; gPct/sPct/pPct: porcentaje; housing: vivienda; def/hp: defensa; stab: estabilidad.
export const BUILDINGS = {
  dolmen: { name: "Dolmen", emoji: "🗿", cost: 40, c: 2, desc: "+2 🎭: la cultura hace crecer las fronteras." },
  granero: { name: "Granero", emoji: "🏺", cost: 55, tech: "alfareria", f: 2, housing: 2, desc: "+2 🌾 y +2 de vivienda." },
  murallas: { name: "Murallas", emoji: "🧱", cost: 70, tech: "albanileria", def: 12, hp: 100, desc: "+12 🛡️ y +100 de vida a la ciudad; le permite disparar." },
  templo: { name: "Santuario", emoji: "⛩️", cost: 70, tech: "misticismo", c: 3, stab: 1, desc: "+3 🎭 y +1 de estabilidad." },
  biblioteca: { name: "Biblioteca", emoji: "📜", cost: 80, tech: "escritura", s: 3, desc: "+3 🔬." },
  puerto: { name: "Puerto", emoji: "⚓", cost: 85, tech: "navegacion", coastal: true, g: 1, waterF: 1, desc: "+1 🌾 en cada casilla de agua y +1 💰. Solo en la costa." },
  mercado: { name: "Mercado", emoji: "⚖️", cost: 90, tech: "moneda", g: 3, gPct: 0.15, desc: "+3 💰 y +15 % de oro." },
  forja: { name: "Forja", emoji: "🔥", cost: 90, tech: "hierro", p: 3, desc: "+3 ⚙️." },
  acueducto: { name: "Acueducto", emoji: "🌉", cost: 110, tech: "ingenieria", housing: 6, desc: "+6 de vivienda: la ciudad puede crecer más." },
  teatro: { name: "Teatro", emoji: "🎭", cost: 110, tech: "drama", c: 4, stab: 1, desc: "+4 🎭 y +1 de estabilidad." },
  termas: { name: "Termas", emoji: "♨️", cost: 100, tech: "ingenieria", f: 1, c: 2, housing: 2, desc: "+1 🌾, +2 🎭 y +2 de vivienda." },
  molino: { name: "Molino", emoji: "🌬️", cost: 130, tech: "maquinaria", p: 3, f: 1, desc: "+3 ⚙️ y +1 🌾." },
  catedral: { name: "Catedral", emoji: "⛪", cost: 160, tech: "teologia", c: 5, stab: 2, desc: "+5 🎭 y +2 de estabilidad." },
  castillo: { name: "Castillo", emoji: "🏰", cost: 160, tech: "feudalismo", needs: "murallas", def: 14, hp: 100, desc: "+14 🛡️ y +100 de vida. Requiere murallas." },
  universidad: { name: "Universidad", emoji: "🎓", cost: 180, tech: "universidad", s: 5, sPct: 0.15, desc: "+5 🔬 y +15 % de ciencia." },
  lonja: { name: "Lonja", emoji: "🏛️", cost: 180, tech: "banca", g: 5, gPct: 0.2, desc: "+5 💰 y +20 % de oro." },
  imprenta: { name: "Imprenta", emoji: "🖨️", cost: 200, tech: "imprenta", s: 4, c: 3, desc: "+4 🔬 y +3 🎭." },
  academia: { name: "Real Academia", emoji: "🔭", cost: 240, tech: "metodo", s: 6, desc: "+6 🔬." },
  bolsa: { name: "Bolsa de comercio", emoji: "📈", cost: 260, tech: "economia", g: 6, gPct: 0.15, desc: "+6 💰 y +15 % de oro." },
  museo: { name: "Museo", emoji: "🖼️", cost: 260, tech: "ilustracion", c: 6, stab: 1, desc: "+6 🎭 y +1 de estabilidad." },
  fabrica: { name: "Fábrica", emoji: "🏭", cost: 320, tech: "vapor", p: 6, pPct: 0.15, desc: "+6 ⚙️ y +15 % de producción." },
  estacion: { name: "Estación de tren", emoji: "🚉", cost: 300, tech: "ferrocarril", p: 2, g: 3, housing: 4, desc: "+2 ⚙️, +3 💰 y +4 de vivienda (ensanche)." },
  hospital: { name: "Hospital", emoji: "🏥", cost: 320, tech: "medicina", f: 2, housing: 6, stab: 1, desc: "+2 🌾, +6 de vivienda y +1 de estabilidad." },
  central: { name: "Central eléctrica", emoji: "⚡", cost: 380, tech: "electricidad", p: 5, pPct: 0.15, desc: "+5 ⚙️ y +15 % de producción." },
  estadio: { name: "Estadio", emoji: "🏟️", cost: 360, tech: "radio", c: 4, stab: 3, desc: "+4 🎭 y +3 de estabilidad." },
  aeropuerto: { name: "Aeropuerto", emoji: "🛫", cost: 420, tech: "aviacion", g: 6, c: 2, desc: "+6 💰 y +2 🎭 (turismo)." },
  laboratorio: { name: "Centro de investigación", emoji: "🧪", cost: 450, tech: "informatica", s: 8, sPct: 0.15, desc: "+8 🔬 y +15 % de ciencia." },
  datos: { name: "Centro de datos", emoji: "💾", cost: 480, tech: "internet", s: 6, g: 5, desc: "+6 🔬 y +5 💰." },
  solar: { name: "Parque solar y eólico", emoji: "☀️", cost: 460, tech: "renovables", p: 6, stab: 2, desc: "+6 ⚙️ y +2 de estabilidad (energía limpia)." },
};

// --- maravillas -------------------------------------------------------------------------------------------------
// Cada una solo puede construirse en una ciudad cuyo territorio incluya su sitio real (data/game.json).
// all*: efecto en todas tus ciudades. stab: estabilidad del país.
export const WONDERS = {
  atapuerca: { name: "Atapuerca", emoji: "🦴", cost: 120, s: 3, c: 1, desc: "+3 🔬 y +1 🎭. La cuna de los primeros europeos." },
  antequera: { name: "Dólmenes de Antequera", emoji: "🗿", cost: 140, tech: "misticismo", c: 2, allC: 1, desc: "+2 🎭 aquí y +1 🎭 en todas tus ciudades." },
  altamira: { name: "Cueva de Altamira", emoji: "🐂", cost: 140, tech: "misticismo", c: 5, desc: "+5 🎭." },
  hercules: { name: "Torre de Hércules", emoji: "🗼", cost: 160, tech: "navegacion", coastG: 2, embark: 1, desc: "+2 💰 en tus ciudades costeras y +1 movimiento en el mar." },
  lugo: { name: "Muralla de Lugo", emoji: "🧱", cost: 200, tech: "ingenieria", freeWalls: true, desc: "Murallas gratis en todas tus ciudades, presentes y futuras." },
  medulas: { name: "Las Médulas", emoji: "⛰️", cost: 200, tech: "ingenieria", g: 7, desc: "+7 💰: las minas de oro más grandes del mundo antiguo." },
  segovia: { name: "Acueducto de Segovia", emoji: "🌉", cost: 230, tech: "ingenieria", allF: 1, allHousing: 2, desc: "+1 🌾 y +2 de vivienda en todas tus ciudades." },
  merida: { name: "Teatro de Mérida", emoji: "🎭", cost: 220, tech: "drama", c: 6, desc: "+6 🎭." },
  tarraco: { name: "Tarraco", emoji: "🏟️", cost: 220, tech: "leyes", g: 4, c: 2, desc: "+4 💰 y +2 🎭." },
  toledo: { name: "Escuela de Traductores de Toledo", emoji: "📚", cost: 250, tech: "filosofia", s: 6, desc: "+6 🔬." },
  mezquita: { name: "Mezquita de Córdoba", emoji: "🕌", cost: 300, tech: "teologia", c: 5, s: 4, desc: "+5 🎭 y +4 🔬." },
  azahara: { name: "Medina Azahara", emoji: "🏯", cost: 280, tech: "arquitectura", g: 6, c: 2, desc: "+6 💰 y +2 🎭." },
  alhambra: { name: "Alhambra", emoji: "🏰", cost: 320, tech: "arquitectura", c: 5, allDef: 5, desc: "+5 🎭 y +5 🛡️ en todas tus ciudades." },
  burgos: { name: "Catedral de Burgos", emoji: "⛪", cost: 300, tech: "teologia", c: 7, stab: 3, desc: "+7 🎭 y +3 de estabilidad." },
  santiago: { name: "Camino de Santiago", emoji: "🐚", cost: 280, tech: "teologia", allG: 1, allC: 1, desc: "+1 💰 y +1 🎭 en todas tus ciudades." },
  lonja: { name: "Lonja de Valencia", emoji: "🏛️", cost: 300, tech: "banca", g: 8, desc: "+8 💰." },
  salamanca: { name: "Universidad de Salamanca", emoji: "🎓", cost: 350, tech: "universidad", s: 8, desc: "+8 🔬." },
  alcala: { name: "Universidad de Alcalá", emoji: "📖", cost: 360, tech: "imprenta", s: 4, c: 4, desc: "+4 🔬 y +4 🎭. La ciudad de Cervantes." },
  ubeda: { name: "Úbeda y Baeza", emoji: "⛲", cost: 340, tech: "imprenta", c: 7, desc: "+7 🎭: el Renacimiento en Jaén." },
  sevilla: { name: "Casa de Contratación", emoji: "🧭", cost: 400, tech: "oceanica", g: 10, desc: "+10 💰. (Catedral y Alcázar de Sevilla)" },
  escorial: { name: "El Escorial", emoji: "👑", cost: 420, tech: "economia", s: 4, c: 6, stab: 3, desc: "+4 🔬, +6 🎭 y +3 de estabilidad." },
  aranjuez: { name: "Aranjuez", emoji: "🌳", cost: 420, tech: "ilustracion", c: 5, allF: 1, stab: 3, desc: "+5 🎭, +1 🌾 en todas tus ciudades y +3 de estabilidad." },
  prado: { name: "Museo del Prado", emoji: "🖼️", cost: 480, tech: "ilustracion", c: 10, desc: "+10 🎭. (Paseo del Prado y el Retiro)" },
  vizcaya: { name: "Puente de Vizcaya", emoji: "🌁", cost: 520, tech: "ferrocarril", p: 8, g: 4, desc: "+8 ⚙️ y +4 💰." },
  gaudi: { name: "Sagrada Familia", emoji: "⛪", cost: 600, tech: "electricidad", c: 12, desc: "+12 🎭. (Obras de Gaudí)" },
  palau: { name: "Palau de la Música", emoji: "🎼", cost: 560, tech: "radio", c: 8, stab: 3, desc: "+8 🎭 y +3 de estabilidad." },
  teide: { name: "Observatorio del Teide", emoji: "🔭", cost: 700, tech: "informatica", s: 14, desc: "+14 🔬." },
  donana: { name: "Reserva de Doñana", emoji: "🦩", cost: 700, tech: "renovables", allF: 1, stab: 8, desc: "+1 🌾 en todas tus ciudades y +8 de estabilidad." },
};

// --- tecnologías ------------------------------------------------------------------------------------------------
export const ERAS = ["Edad del Bronce", "Edad del Hierro", "Antigüedad clásica", "Edad Media", "Edad Moderna", "Era industrial", "Era contemporánea"];
export const TECHS = {
  agricultura: { name: "Agricultura", era: 0, cost: 0, req: [], desc: "El punto de partida." },
  alfareria: { name: "Alfarería", era: 0, cost: 20, req: ["agricultura"] },
  ganaderia: { name: "Ganadería", era: 0, cost: 20, req: ["agricultura"], desc: "+1 🌾 en los pastizales." },
  mineria: { name: "Minería", era: 0, cost: 20, req: ["agricultura"], desc: "+1 ⚙️ en las colinas." },
  honda: { name: "La honda", era: 0, cost: 25, req: ["agricultura"] },
  bronce: { name: "Bronce", era: 0, cost: 35, req: ["mineria"] },
  misticismo: { name: "Megalitismo", era: 0, cost: 35, req: ["alfareria"] },
  doma: { name: "Doma del caballo", era: 0, cost: 40, req: ["ganaderia"] },
  navegacion: { name: "Navegación de cabotaje", era: 0, cost: 45, req: ["alfareria"], desc: "Las unidades pueden embarcar por la costa." },
  escritura: { name: "Escritura", era: 1, cost: 60, req: ["alfareria", "navegacion"], desc: "El alfabeto llega por mar." },
  hierro: { name: "Hierro", era: 1, cost: 65, req: ["bronce"] },
  albanileria: { name: "Albañilería", era: 1, cost: 60, req: ["mineria"] },
  moneda: { name: "Moneda", era: 1, cost: 80, req: ["bronce", "escritura"] },
  matematicas: { name: "Matemáticas", era: 1, cost: 85, req: ["escritura", "albanileria"] },
  drama: { name: "Teatro y poesía", era: 1, cost: 85, req: ["misticismo", "escritura"] },
  filosofia: { name: "Filosofía", era: 2, cost: 110, req: ["drama"] },
  ingenieria: { name: "Ingeniería", era: 2, cost: 120, req: ["albanileria", "matematicas"] },
  leyes: { name: "Derecho", era: 2, cost: 120, req: ["moneda", "hierro"] },
  cartografia: { name: "Cartografía", era: 2, cost: 130, req: ["navegacion", "matematicas"], desc: "Las unidades pueden cruzar el mar abierto." },
  teologia: { name: "Teología", era: 3, cost: 170, req: ["filosofia"] },
  feudalismo: { name: "Feudalismo", era: 3, cost: 170, req: ["leyes", "doma"] },
  arquitectura: { name: "Arquitectura", era: 3, cost: 190, req: ["ingenieria", "filosofia"] },
  maquinaria: { name: "Maquinaria", era: 3, cost: 190, req: ["ingenieria", "hierro"] },
  banca: { name: "Banca", era: 3, cost: 220, req: ["moneda", "feudalismo"] },
  astronomia: { name: "Astronomía", era: 3, cost: 220, req: ["cartografia", "filosofia"], desc: "Las tablas alfonsíes." },
  universidad: { name: "Universidad", era: 3, cost: 240, req: ["teologia", "arquitectura"] },
  polvora: { name: "Pólvora", era: 4, cost: 280, req: ["maquinaria", "universidad"] },
  imprenta: { name: "Imprenta", era: 4, cost: 280, req: ["universidad", "banca"] },
  oceanica: { name: "Navegación oceánica", era: 4, cost: 300, req: ["astronomia", "banca"] },
  metalurgia: { name: "Metalurgia", era: 4, cost: 320, req: ["polvora"] },
  economia: { name: "Economía", era: 4, cost: 330, req: ["imprenta", "oceanica"] },
  metodo: { name: "Método científico", era: 4, cost: 340, req: ["imprenta", "astronomia"] },
  ilustracion: { name: "Ilustración", era: 4, cost: 380, req: ["metodo", "economia"] },
  vapor: { name: "Máquina de vapor", era: 5, cost: 430, req: ["metodo", "metalurgia"] },
  fusiles: { name: "Fusil de retrocarga", era: 5, cost: 440, req: ["metalurgia", "vapor"] },
  ferrocarril: { name: "Ferrocarril", era: 5, cost: 470, req: ["vapor"] },
  medicina: { name: "Medicina moderna", era: 5, cost: 470, req: ["ilustracion", "metodo"] },
  electricidad: { name: "Electricidad", era: 5, cost: 500, req: ["vapor", "ilustracion"] },
  motor: { name: "Motor de combustión", era: 6, cost: 480, req: ["ferrocarril", "electricidad"] },
  radio: { name: "Radio", era: 6, cost: 480, req: ["electricidad"] },
  aviacion: { name: "Aviación", era: 6, cost: 530, req: ["motor", "radio"] },
  informatica: { name: "Informática", era: 6, cost: 560, req: ["radio", "medicina"] },
  nuclear: { name: "Energía nuclear", era: 6, cost: 600, req: ["electricidad", "informatica"] },
  internet: { name: "Internet", era: 6, cost: 630, req: ["informatica"] },
  renovables: { name: "Energías renovables", era: 6, cost: 650, req: ["electricidad", "internet"] },
  robotica: { name: "Robótica", era: 6, cost: 680, req: ["internet", "aviacion"] },
  ia: { name: "Inteligencia artificial", era: 6, cost: 730, req: ["robotica", "internet"] },
  fusion: { name: "Fusión nuclear", era: 6, cost: 810, req: ["ia", "nuclear", "renovables"], desc: "Descubrirla es la victoria científica." },
};
export const LAST_TECH = "fusion";

// --- gobiernos --------------------------------------------------------------------------------------------------
// Efectos: pPct/gPct/sPct/cPct (porcentaje), capP (⚙️ en la capital), att (fuerza de ataque), def (defensa de las
// ciudades), stab (estabilidad), sprawl (multiplica la pérdida de estabilidad por tener muchas ciudades), weary
// (multiplica el cansancio de guerra). `title` sirve para nombrar el país.
export const GOVS = {
  jefatura: { name: "Jefatura tribal", title: "Tierra de", desc: "Sin efectos. El punto de partida." },
  monarquia: { name: "Monarquía", tech: "bronce", title: "Reino de", capP: 2, stab: 5, desc: "+2 ⚙️ en la capital y +5 de estabilidad." },
  republica: { name: "República", tech: "filosofia", title: "República de", gPct: 0.1, sPct: 0.05, weary: 1.6, desc: "+10 % 💰 y +5 % 🔬; las guerras cansan más." },
  imperio: { name: "Imperio", tech: "leyes", title: "Imperio de", att: 3, sprawl: 0.5, gPct: -0.05, desc: "+3 ⚔️ al atacar y la mitad de penalización por extensión; −5 % 💰." },
  teocracia: { name: "Teocracia", tech: "teologia", title: "Reino de", cPct: 0.2, sPct: -0.1, stab: 8, desc: "+20 % 🎭 y +8 de estabilidad; −10 % 🔬." },
  feudal: { name: "Monarquía feudal", tech: "feudalismo", title: "Reino de", def: 4, pPct: 0.05, stab: 5, sPct: -0.05, desc: "+4 🛡️ en las ciudades, +5 % ⚙️ y +5 de estabilidad; −5 % 🔬." },
  absoluta: { name: "Monarquía absoluta", tech: "economia", title: "Monarquía de", pPct: 0.12, stab: 4, sPct: -0.05, desc: "+12 % ⚙️ y +4 de estabilidad; −5 % 🔬." },
  constitucional: { name: "Monarquía parlamentaria", tech: "ilustracion", title: "Reino de", sPct: 0.1, gPct: 0.1, stab: 4, desc: "+10 % 🔬, +10 % 💰 y +4 de estabilidad." },
  federal: { name: "República federal", tech: "ilustracion", title: "Federación de", cPct: 0.1, sprawl: 0.25, gPct: 0.05, desc: "+10 % 🎭, +5 % 💰 y casi sin penalización por extensión." },
  democracia: { name: "Democracia", tech: "radio", title: "República de", sPct: 0.15, gPct: 0.15, weary: 2, stab: 3, desc: "+15 % 🔬 y 💰, +3 de estabilidad; las guerras cansan mucho." },
  autoritario: { name: "Régimen autoritario", tech: "motor", title: "Estado de", pPct: 0.15, att: 3, weary: 0.3, sPct: -0.1, stab: -6, desc: "+15 % ⚙️ y +3 ⚔️, sin cansancio de guerra; −10 % 🔬 y −6 de estabilidad." },
  tecnocracia: { name: "Tecnocracia", tech: "ia", title: "Unión de", sPct: 0.25, gPct: 0.05, desc: "+25 % 🔬 y +5 % 💰." },
};

// --- invasiones y potencias que llegan de fuera -----------------------------------------------------------------
// year: cuándo llegan; at: puntos de entrada (data/game.json → entries); n: tamaño del ejército (se escala con la
// dificultad); units: unidades (se usan las mejores que permitan sus tecnologías); settle: si toman una ciudad, se
// quedan como un pueblo más con este nombre; techs: tecnologías con las que llegan (además de las de su época).
export const INVASIONS = [
  { id: "celtas", faith: "antiguos", year: -900, name: "Celtas de allende los Pirineos", short: "Celtas", color: "#2e7d32", ink: "#fff", at: ["pirineo_oeste", "pirineo_este"], n: 4,
    units: ["guerreros", "lanceros", "jinetes"], settle: "Celtas",
    text: "Pueblos de lengua celta cruzan los Pirineos buscando tierras. Si toman una ciudad, se quedarán." },
  { id: "cartago", faith: "antiguos", year: -237, name: "Cartago (los Barca)", short: "Cartagineses", color: "#6d4c41", ink: "#fff", at: ["cadiz", "cartagena"], n: 7,
    units: ["falcateros", "honderos", "jinetes", "catapulta"], settle: "Cartago hispana",
    text: "Amílcar Barca desembarca en Gadir para hacerse con las minas de plata de la Península." },
  { id: "roma", faith: "antiguos", year: -218, name: "Roma", short: "Romanos", color: "#8e1b2e", ink: "#fff", at: ["emporion", "tarraco"], n: 12,
    units: ["legion", "catapulta", "jinetes", "honderos"], settle: "Hispania romana", techs: ["leyes", "ingenieria"],
    text: "Las legiones de Escipión desembarcan en Emporion. Roma tardará dos siglos en dominar Hispania… si la dejas." },
  { id: "germanos", faith: "cristiana", year: 409, name: "Suevos, vándalos y alanos", short: "Germanos", color: "#5d4037", ink: "#fff", at: ["pirineo_oeste", "pirineo_centro"], n: 7,
    units: ["legion", "jinetes", "falcateros"], settle: "Reino suevo",
    text: "El Imperio se desmorona: pueblos germánicos atraviesan los pasos del Pirineo." },
  { id: "visigodos", faith: "cristiana", year: 456, name: "Visigodos", short: "Visigodos", color: "#455a64", ink: "#fff", at: ["pirineo_este", "pirineo_centro"], n: 10,
    units: ["legion", "jinetes", "falcateros", "catapulta"], settle: "Reino visigodo",
    text: "Los visigodos entran desde la Galia para quedarse: buscan una capital en la Meseta." },
  { id: "bizancio", faith: "cristiana", year: 552, name: "Bizancio", short: "Bizantinos", color: "#7b1fa2", ink: "#fff", at: ["cartagena", "malaga"], n: 6,
    units: ["legion", "honderos", "catapulta"], settle: "Spania bizantina",
    text: "Justiniano quiere recuperar Occidente: sus tropas desembarcan en la costa del sureste." },
  { id: "omeyas", faith: "islamica", year: 711, name: "Ejército omeya", short: "Omeyas", color: "#00897b", ink: "#fff", at: ["estrecho", "estrecho"], n: 14,
    units: ["jinetes", "falcateros", "honderos", "catapulta", "caballeros"], settle: "Al-Ándalus", techs: ["teologia", "matematicas"],
    text: "Tariq cruza el Estrecho con un ejército. Si toma ciudades, nacerá al-Ándalus." },
  { id: "vikingos", faith: "antiguos", year: 844, name: "Vikingos", short: "Vikingos", color: "#78909c", ink: "#fff", at: ["coruna", "sevilla"], n: 5,
    units: ["falcateros", "almogavares", "legion"], settle: "Normandos",
    text: "Naves normandas asoman por la costa gallega y remontan el Guadalquivir." },
  { id: "almoravides", faith: "islamica", year: 1086, name: "Almorávides", short: "Almorávides", color: "#bf8f00", ink: "#14202c", at: ["estrecho", "malaga"], n: 10,
    units: ["caballeros", "ballesteros", "almogavares", "catapulta"], settle: "Imperio almorávide",
    text: "Los almorávides cruzan el Estrecho llamados por las taifas… y vienen a quedarse." },
  { id: "almohades", faith: "islamica", year: 1147, name: "Almohades", short: "Almohades", color: "#9e9d24", ink: "#14202c", at: ["estrecho", "cadiz"], n: 10,
    units: ["caballeros", "ballesteros", "almogavares", "catapulta"], settle: "Imperio almohade",
    text: "Una nueva ola desde el Magreb: el califato almohade desembarca en el sur." },
  { id: "benimerines", faith: "islamica", year: 1340, name: "Benimerines", short: "Benimerines", color: "#a1887f", ink: "#14202c", at: ["estrecho"], n: 8,
    units: ["caballeros", "ballesteros", "almogavares"], settle: "Reino benimerín",
    text: "Los benimerines intentan una vez más cruzar el Estrecho." },
  { id: "inglaterra", faith: "cristiana", year: 1702, name: "La Gran Alianza", short: "Aliados", color: "#c62828", ink: "#fff", at: ["cadiz", "estrecho", "coruna"], n: 9,
    units: ["tercios", "dragones", "canones"], settle: "Gibraltar",
    text: "Guerra de Sucesión: una flota anglo-holandesa ataca la costa." },
  { id: "francia", faith: "cristiana", year: 1808, name: "La Grande Armée", short: "Napoleónicos", color: "#1a237e", ink: "#fff", at: ["pirineo_oeste", "pirineo_este", "irun"], n: 14,
    units: ["fusileros", "dragones", "canones", "tercios"], settle: "Reino napoleónico", techs: ["ilustracion", "metalurgia"],
    text: "Napoleón cruza los Pirineos con el mayor ejército de Europa." },
  { id: "hijos", faith: "cristiana", year: 1823, name: "Los Cien Mil Hijos de San Luis", short: "Franceses", color: "#3949ab", ink: "#fff", at: ["irun", "pirineo_este"], n: 10,
    units: ["fusileros", "dragones", "canones"], settle: "Protectorado francés",
    text: "Las potencias absolutistas envían un ejército francés para imponer su orden." },
];

// --- decisiones (eventos narrativos), fe e identidad: en events.js ---------------------------------------
export { EVENTS, TAGS, FAITHS } from "./events.js";

// Qué desbloquea cada tecnología (para las fichas del árbol).
export function unlocksOf(techId) {
  const out = [];
  for (const [id, u] of Object.entries(UNITS)) if (u.tech === techId) out.push({ kind: "unit", id, ...u });
  for (const [id, b] of Object.entries(BUILDINGS)) if (b.tech === techId) out.push({ kind: "building", id, ...b });
  for (const [id, w] of Object.entries(WONDERS)) if (w.tech === techId) out.push({ kind: "wonder", id, ...w });
  for (const [id, g] of Object.entries(GOVS)) if (g.tech === techId) out.push({ kind: "gov", id, emoji: "👑", ...g });
  return out;
}

export const YIELD_ICON = { f: "🌾", p: "⚙️", g: "💰", s: "🔬", c: "🎭" };
