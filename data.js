/* =====================================================================
   LAS LETRAS VIVAS — DATOS (contenido del juego)
   ---------------------------------------------------------------------
   Tablas de contenido: letras y profesiones, palabras con dibujo, frases,
   cuentos, sílabas, distribución de teclados y niveles.

   Es un script CLÁSICO (no ES module): define todo en el espacio de nombres
   global `LV` para que el juego siga abriéndose con doble clic (file://).
   Carga ANTES que core.js y modos.js.
   ===================================================================== */
var LV = window.LV || (window.LV = {});

/* Colores de las letras */
LV.PALETA = ["#e6194b","#f58231","#ffb000","#3cb44b","#1f9e89",
             "#2a7fff","#7b2fbe","#e667af","#9a6324","#0aa3a3",
             "#d2691e","#c0392b"];

/* n = nombre hablado · p = profesión/ejemplo · e = emoji · s = sonido */
LV.INFO = {
  a:{n:"a",       p:"Astronauta",  e:"🚀", s:"aaa"},
  b:{n:"be",      p:"Bombero",     e:"🚒", s:"be"},
  c:{n:"ce",      p:"Cocinera",    e:"👩‍🍳", s:"ke"},
  d:{n:"de",      p:"Doctora",     e:"🩺", s:"de"},
  e:{n:"e",       p:"Electricista",e:"💡", s:"eee"},
  f:{n:"efe",     p:"Futbolista",  e:"⚽", s:"fff"},
  g:{n:"ge",      p:"Granjero",    e:"🚜", s:"gue"},
  h:{n:"hache",   p:"Heladero",    e:"🍦", s:""},
  i:{n:"i",       p:"Ingeniera",   e:"🔧", s:"iii"},
  j:{n:"jota",    p:"Jardinera",   e:"🪴", s:"jjj"},
  k:{n:"ka",      p:"Karateka",    e:"🥋", s:"ka"},
  l:{n:"ele",     p:"Lechera",     e:"🥛", s:"lll"},
  m:{n:"eme",     p:"Mago",        e:"🪄", s:"mmm"},
  n:{n:"ene",     p:"Nadador",     e:"🏊", s:"nnn"},
  "ñ":{n:"eñe",   p:"Ñu",          e:"🐃", s:"ñ"},
  o:{n:"o",       p:"Obrero",      e:"👷", s:"ooo"},
  p:{n:"pe",      p:"Pintor",      e:"🎨", s:"pe"},
  q:{n:"cu",      p:"Quesero",     e:"🧀", s:"ke"},
  r:{n:"erre",    p:"Repartidor",  e:"📦", s:"rrr"},
  s:{n:"ese",     p:"Sastre",      e:"🧵", s:"sss"},
  t:{n:"te",      p:"Taxista",     e:"🚕", s:"te"},
  u:{n:"u",       p:"Unicornio",   e:"🦄", s:"uuu"},
  v:{n:"uve",     p:"Veterinaria", e:"🐶", s:"be"},
  w:{n:"uve doble",p:"Waterpolista",e:"🤽", s:"u"},
  x:{n:"equis",   p:"Xilófono",    e:"🎶", s:"ks"},
  y:{n:"i griega",p:"Yoyó",        e:"🪀", s:"yyy"},
  z:{n:"zeta",    p:"Zapatero",    e:"👟", s:"zzz"}
};

LV.ABECEDARIO = "abcdefghijklmnñopqrstuvwxyz".split("");
LV.ORDEN_ABC  = "aeioumplstndcbvfrghjñzqkwxy".split(""); // orden de aprendizaje
LV.VOCALES    = ["a","e","i","o","u"];
LV.CONS_SIL   = ["m","p","l","s","t","n","d","f","r","c","b","v","g","j"];
LV.TRABADAS   = ["bl","br","cl","cr","dr","fl","fr","gl","gr","pl","pr","tr"];

/* Distribución del teclado en pantalla */
LV.LAYOUT_QWERTY = ["qwertyuiop", "asdfghjklñ", "zxcvbnm"];
LV.LAYOUT_ABC    = ["abcdefg", "hijklmnñ", "opqrstu", "vwxyz"];

/* Palabras con dibujo y dificultad (d: 0 fácil, 1 medio, 2 difícil) */
LV.PALABRAS = [
  {w:"sol",e:"☀️",d:0},{w:"pan",e:"🍞",d:0},{w:"oso",e:"🐻",d:0},
  {w:"pez",e:"🐟",d:0},{w:"sal",e:"🧂",d:0},{w:"ojo",e:"👁️",d:0},
  {w:"mar",e:"🌊",d:0},{w:"pie",e:"🦶",d:0},{w:"rey",e:"👑",d:0},
  {w:"luna",e:"🌙",d:1},{w:"gato",e:"🐱",d:1},{w:"pato",e:"🦆",d:1},
  {w:"casa",e:"🏠",d:1},{w:"mono",e:"🐵",d:1},{w:"rana",e:"🐸",d:1},
  {w:"vaca",e:"🐄",d:1},{w:"foca",e:"🦭",d:1},{w:"lobo",e:"🐺",d:1},
  {w:"nube",e:"☁️",d:1},{w:"sopa",e:"🍲",d:1},{w:"lupa",e:"🔍",d:1},
  {w:"dado",e:"🎲",d:1},{w:"bota",e:"👢",d:1},{w:"rosa",e:"🌹",d:1},
  {w:"queso",e:"🧀",d:1},{w:"koala",e:"🐨",d:1},{w:"camas",e:"🛏️",d:1},
  {w:"plato",e:"🍽️",d:2},{w:"libro",e:"📖",d:2},{w:"globo",e:"🎈",d:2},
  {w:"tigre",e:"🐯",d:2},{w:"fresa",e:"🍓",d:2},{w:"tren",e:"🚆",d:2},
  {w:"cebra",e:"🦓",d:2},{w:"flor",e:"🌸",d:2},{w:"grifo",e:"🚰",d:2},
  {w:"dragon",e:"🐉",d:2},{w:"brujo",e:"🧙",d:2},{w:"trompo",e:"🪀",d:2}
];

/* Palabras con SÍLABAS ya cortadas (sin tildes) para los modos de BLOQUES
   guiados (Construir palabras / Tren de palabras). Cada sil.join("") === w.
   d: 0 dos sílabas CV · 1 tres sílabas · 2 trabadas/CVC/4 sílabas. */
LV.BLOQUES_PALABRAS = [
  {w:"gato",  e:"🐱", sil:["ga","to"],       d:0}, {w:"casa",  e:"🏠", sil:["ca","sa"],       d:0},
  {w:"pato",  e:"🦆", sil:["pa","to"],       d:0}, {w:"mesa",  e:"🪑", sil:["me","sa"],       d:0},
  {w:"sopa",  e:"🍲", sil:["so","pa"],       d:0}, {w:"luna",  e:"🌙", sil:["lu","na"],       d:0},
  {w:"dedo",  e:"☝️", sil:["de","do"],       d:0}, {w:"vaca",  e:"🐄", sil:["va","ca"],       d:0},
  {w:"pino",  e:"🌲", sil:["pi","no"],       d:0}, {w:"foca",  e:"🦭", sil:["fo","ca"],       d:0},
  {w:"pelota",e:"⚽", sil:["pe","lo","ta"],  d:1}, {w:"camisa",e:"👕", sil:["ca","mi","sa"],  d:1},
  {w:"tomate",e:"🍅", sil:["to","ma","te"],  d:1}, {w:"banana",e:"🍌", sil:["ba","na","na"],  d:1},
  {w:"zapato",e:"👟", sil:["za","pa","to"],  d:1}, {w:"cabeza",e:"🗣️", sil:["ca","be","za"],  d:1},
  {w:"pajaro",e:"🐦", sil:["pa","ja","ro"],  d:1}, {w:"gusano",e:"🐛", sil:["gu","sa","no"],  d:1},
  {w:"globo", e:"🎈", sil:["glo","bo"],      d:2}, {w:"plato", e:"🍽️", sil:["pla","to"],      d:2},
  {w:"tigre", e:"🐯", sil:["ti","gre"],      d:2}, {w:"manzana",e:"🍎",sil:["man","za","na"], d:2},
  {w:"elefante",e:"🐘",sil:["e","le","fan","te"],d:2}, {w:"cocodrilo",e:"🐊",sil:["co","co","dri","lo"],d:2}
];

/* VOCABULARIO para los modos AVANZADOS (Lee palabras / Palabras nuevas).
   Son palabras de verdad, SIN emoji y SIN tildes (se teclean directamente;
   conserva ñ). Aquí el niño aprende VOCABULARIO leyendo, no dibujos. Cada
   palabra debe existir en el diccionario LV.DIC (lo verifica test/smoke.js) y
   medir 2-10 letras. d: 0 corta · 1 media · 2 larga/avanzada. */
LV.VOCAB = [
  /* d:0 — cortas (3-4 letras) */
  {w:"uva",d:0},{w:"ola",d:0},{w:"ajo",d:0},{w:"ave",d:0},{w:"ala",d:0},
  {w:"rio",d:0},{w:"red",d:0},{w:"voz",d:0},{w:"luz",d:0},{w:"col",d:0},
  {w:"mano",d:0},{w:"dedo",d:0},{w:"pelo",d:0},{w:"nido",d:0},{w:"gota",d:0},
  {w:"vela",d:0},{w:"pera",d:0},{w:"mesa",d:0},{w:"taza",d:0},{w:"rama",d:0},
  {w:"lana",d:0},{w:"cola",d:0},{w:"mapa",d:0},{w:"sapo",d:0},{w:"foco",d:0},
  {w:"humo",d:0},{w:"lago",d:0},{w:"mago",d:0},{w:"codo",d:0},{w:"pavo",d:0},
  {w:"rata",d:0},{w:"ropa",d:0},{w:"ruta",d:0},{w:"seta",d:0},{w:"tela",d:0},
  {w:"vino",d:0},{w:"vida",d:0},{w:"hada",d:0},{w:"beso",d:0},{w:"boda",d:0},
  {w:"cama",d:0},{w:"copa",d:0},{w:"cubo",d:0},{w:"faro",d:0},{w:"loro",d:0},
  {w:"lazo",d:0},{w:"moto",d:0},{w:"nota",d:0},{w:"pala",d:0},{w:"pila",d:0},
  {w:"pino",d:0},{w:"piso",d:0},{w:"polo",d:0},{w:"puma",d:0},{w:"remo",d:0},
  {w:"saco",d:0},{w:"toro",d:0},{w:"vaso",d:0},{w:"nene",d:0},{w:"leon",d:0},
  {w:"gol",d:0},{w:"sal",d:0},{w:"miel",d:0},{w:"pez",d:0},{w:"mes",d:0},
  {w:"sol",d:0},{w:"tren",d:0},{w:"flan",d:0},{w:"duna",d:0},{w:"jugo",d:0},
  /* d:1 — medias (5-7 letras) */
  {w:"conejo",d:1},{w:"caballo",d:1},{w:"gallina",d:1},{w:"ardilla",d:1},
  {w:"tortuga",d:1},{w:"ballena",d:1},{w:"delfin",d:1},{w:"camello",d:1},
  {w:"paloma",d:1},{w:"abeja",d:1},{w:"mosca",d:1},{w:"oruga",d:1},
  {w:"oveja",d:1},{w:"cabra",d:1},{w:"cerdo",d:1},{w:"burro",d:1},
  {w:"raton",d:1},{w:"pulpo",d:1},{w:"jirafa",d:1},{w:"canguro",d:1},
  {w:"erizo",d:1},{w:"lagarto",d:1},{w:"pollito",d:1},{w:"caracol",d:1},
  {w:"tomate",d:1},{w:"patata",d:1},{w:"lechuga",d:1},{w:"cebolla",d:1},
  {w:"naranja",d:1},{w:"platano",d:1},{w:"cereza",d:1},{w:"galleta",d:1},
  {w:"helado",d:1},{w:"pollo",d:1},{w:"huevo",d:1},{w:"leche",d:1},
  {w:"arroz",d:1},{w:"tarta",d:1},{w:"melon",d:1},{w:"limon",d:1},
  {w:"mango",d:1},{w:"yogur",d:1},{w:"jamon",d:1},{w:"queso",d:1},
  {w:"ventana",d:1},{w:"puerta",d:1},{w:"cocina",d:1},{w:"espejo",d:1},
  {w:"manta",d:1},{w:"sabana",d:1},{w:"escoba",d:1},{w:"cuchara",d:1},
  {w:"botella",d:1},{w:"banera",d:1},{w:"brazo",d:1},{w:"pierna",d:1},
  {w:"rodilla",d:1},{w:"hombro",d:1},{w:"espalda",d:1},{w:"lengua",d:1},
  {w:"diente",d:1},{w:"oreja",d:1},{w:"cabeza",d:1},{w:"arbol",d:1},
  {w:"bosque",d:1},{w:"camino",d:1},{w:"piedra",d:1},{w:"arena",d:1},
  {w:"nieve",d:1},{w:"lluvia",d:1},{w:"cielo",d:1},{w:"playa",d:1},
  {w:"isla",d:1},{w:"pelota",d:1},{w:"juguete",d:1},{w:"muñeca",d:1},
  {w:"coche",d:1},{w:"barco",d:1},{w:"avion",d:1},{w:"globo",d:1},
  {w:"escuela",d:1},{w:"maestra",d:1},{w:"pintura",d:1},{w:"pirata",d:1},
  {w:"tesoro",d:1},{w:"bandera",d:1},{w:"sombrero",d:1},{w:"vestido",d:1},
  {w:"girasol",d:1},{w:"castor",d:1},{w:"gamba",d:1},{w:"grillo",d:1},
  {w:"cigarra",d:1},{w:"pantera",d:1},{w:"medusa",d:1},{w:"gaviota",d:1},
  {w:"tucan",d:1},{w:"colibri",d:1},{w:"cohete",d:1},{w:"planta",d:1},
  {w:"semilla",d:1},{w:"raiz",d:1},{w:"tronco",d:1},{w:"granja",d:1},{w:"cometa",d:1},
  /* d:2 — largas / avanzadas (7-10 letras) */
  {w:"elefante",d:2},{w:"mariposa",d:2},{w:"cocodrilo",d:2},{w:"dinosaurio",d:2},
  {w:"biblioteca",d:2},{w:"telescopio",d:2},{w:"bicicleta",d:2},{w:"chocolate",d:2},
  {w:"hospital",d:2},{w:"bombero",d:2},{w:"princesa",d:2},{w:"castillo",d:2},
  {w:"planeta",d:2},{w:"estrella",d:2},{w:"montaña",d:2},{w:"serpiente",d:2},
  {w:"cangrejo",d:2},{w:"escarabajo",d:2},{w:"avestruz",d:2},{w:"flamenco",d:2},
  {w:"zanahoria",d:2},{w:"espagueti",d:2},{w:"mermelada",d:2},{w:"paraguas",d:2},
  {w:"linterna",d:2},{w:"ordenador",d:2},{w:"telefono",d:2},{w:"televisor",d:2},
  {w:"catarata",d:2},{w:"desierto",d:2},{w:"aventura",d:2},{w:"sorpresa",d:2},
  {w:"caballero",d:2},{w:"carretera",d:2},{w:"fantasma",d:2},{w:"gigante",d:2},
  {w:"vampiro",d:2},{w:"esqueleto",d:2},{w:"calabaza",d:2},{w:"mariquita",d:2},
  {w:"hormiga",d:2},{w:"mosquito",d:2},{w:"abanico",d:2},{w:"manzana",d:2},
  {w:"pantalon",d:2},{w:"chaqueta",d:2},{w:"calcetin",d:2},{w:"caramelo",d:2},
  {w:"leopardo",d:2},{w:"tiburon",d:2},{w:"camaleon",d:2},{w:"armadillo",d:2},
  {w:"libelula",d:2},{w:"hipopotamo",d:2},{w:"murcielago",d:2},{w:"golondrina",d:2},
  {w:"submarino",d:2},{w:"pelicano",d:2},{w:"escorpion",d:2}
];

/* Frases sueltas para leer (solo lectura: usamos tildes, suenan mejor) */
LV.FRASES = [
  {t:"el sol es amarillo", e:"☀️"},
  {t:"el gato bebe leche", e:"🐱"},
  {t:"la rana salta al lago", e:"🐸"},
  {t:"mi papá lee un libro", e:"📖"},
  {t:"la luna sale de noche", e:"🌙"},
  {t:"el oso come mucha miel", e:"🐻"},
  {t:"el tren va muy rápido", e:"🚆"},
  {t:"el pato nada en el mar", e:"🦆"},
  {t:"la bruja vuela en su escoba", e:"🧙"},
  {t:"el tigre corre por la selva", e:"🐯"}
];

/* Cuentos: páginas (frase corta + dibujo) que forman una historia.
   En este modo el niño TECLEA cada palabra entera para avanzar, por eso
   las frases son cortas. Las tildes/mayúsculas son solo para mostrar;
   al teclear se normalizan a letras base (ver normaliza() en modos.js). */
LV.CUENTOS = [
  { titulo:"Los tres cerditos", e:"🐷", paginas:[
    {t:"había tres cerditos", e:"🐷"}, {t:"uno usó paja", e:"🌾"},
    {t:"otro usó palos", e:"🪵"}, {t:"otro usó ladrillos", e:"🧱"},
    {t:"llegó el lobo", e:"🐺"}, {t:"sopló la paja", e:"💨"},
    {t:"sopló los palos", e:"🪵"}, {t:"los ladrillos ganaron", e:"🧱"},
    {t:"el lobo huyó", e:"🏃"}, {t:"vivieron felices", e:"🎉"}
  ]},
  { titulo:"Caperucita Roja", e:"🔴", paginas:[
    {t:"había una niña", e:"👧"}, {t:"tenía capa roja", e:"🧥"},
    {t:"era caperucita", e:"🔴"}, {t:"visitaba a la abuela", e:"👵"},
    {t:"llevaba una cesta", e:"🧺"}, {t:"vio un lobo", e:"🐺"},
    {t:"el lobo era astuto", e:"😼"}, {t:"corrió a la casa", e:"🏃"},
    {t:"llegó un cazador", e:"🪓"}, {t:"todos a salvo", e:"✅"}
  ]},
  { titulo:"Los músicos de Bremen", e:"🎶", paginas:[
    {t:"un burro se fue", e:"🫏"}, {t:"quería ser músico", e:"🎶"},
    {t:"halló un perro", e:"🐕"}, {t:"luego un gato", e:"🐈"},
    {t:"y un gallo", e:"🐓"}, {t:"iban a bremen", e:"🎵"},
    {t:"vieron una casa", e:"🏠"}, {t:"había ladrones", e:"😱"},
    {t:"los asustaron", e:"🙀"}, {t:"se quedaron felices", e:"🎉"}
  ]},
  { titulo:"Ricitos de oro", e:"🐻", paginas:[
    {t:"una niña rubia", e:"👧"}, {t:"se llama ricitos", e:"🌟"},
    {t:"entró en la casa", e:"🏠"}, {t:"probó la sopa", e:"🍲"},
    {t:"rompió una silla", e:"🪑"}, {t:"subió a dormir", e:"😴"},
    {t:"llegaron tres osos", e:"🐻"}, {t:"ricitos se asustó", e:"😨"},
    {t:"salió corriendo", e:"🏃"}, {t:"los osos rieron", e:"😄"}
  ]},
  { titulo:"El patito feo", e:"🦆", paginas:[
    {t:"nació un patito", e:"🐣"}, {t:"era diferente", e:"🦆"},
    {t:"todos se reían", e:"😢"}, {t:"el patito se fue", e:"🚶"},
    {t:"pasó el invierno", e:"❄️"}, {t:"estaba muy solo", e:"😔"},
    {t:"llegó la primavera", e:"🌸"}, {t:"se miró al agua", e:"💧"},
    {t:"era un cisne", e:"🦢"}, {t:"muy hermoso", e:"✨"}
  ]},
  { titulo:"El ratón y sus amigos", e:"🐭", paginas:[
    {t:"había un ratón", e:"🐭"}, {t:"era muy alegre", e:"😄"},
    {t:"tenía un perro", e:"🐶"}, {t:"y un pato", e:"🦆"},
    {t:"jugaban juntos", e:"🤝"}, {t:"hicieron un pastel", e:"🎂"},
    {t:"cantaron canciones", e:"🎵"}, {t:"rieron mucho", e:"😆"},
    {t:"eran felices", e:"💛"}
  ]},
  { titulo:"El gato y la luna", e:"🐱", paginas:[
    {t:"el gato mira arriba", e:"🐱"}, {t:"ve la luna", e:"🌕"},
    {t:"la luna brilla", e:"✨"}, {t:"el gato salta", e:"😺"},
    {t:"no la alcanza", e:"🌙"}, {t:"el gato se duerme", e:"😴"}
  ]},
  { titulo:"La rana valiente", e:"🐸", paginas:[
    {t:"una rana vive aquí", e:"🐸"}, {t:"llega una tormenta", e:"🌧️"},
    {t:"la rana ayuda", e:"🐸"}, {t:"salva a sus amigos", e:"🐢"},
    {t:"todos están secos", e:"🏠"}, {t:"la rana es valiente", e:"💚"}
  ]},
  { titulo:"El cohete de Ana", e:"🚀", paginas:[
    {t:"ana hace un cohete", e:"🚀"}, {t:"el cohete vuela", e:"☁️"},
    {t:"sube muy alto", e:"⬆️"}, {t:"ve las estrellas", e:"⭐"},
    {t:"saluda a la luna", e:"🌙"}, {t:"ana vuelve feliz", e:"🏡"}
  ]}
];

LV.NIVELES = ["Fácil", "Medio", "Difícil"];

/* Avatares disponibles al crear un perfil de niño */
LV.AVATARES = ["🦊","🐱","🐶","🐼","🦁","🐵","🐯","🐸","🦄","🐧","🐢","🦉","🐝","🐙","🦖","🐳"];
