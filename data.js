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
