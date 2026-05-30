/* =====================================================================
   LAS LETRAS VIVAS
   Juego de lectura con teclado Y pantalla táctil (tablet), para peques.
   - Se juega con el teclado físico O con el teclado en pantalla (táctil).
   - Cada letra es un personaje con ojos, sonrisa y su profesión.
   - Voz en español: dice el NOMBRE (eme) o el SONIDO (mmm).
   - 3 niveles (Fácil / Medio / Difícil).
   - 9 modos, de explorar a leer cuentos enteros.
   - Botón de pantalla completa y colección de las 27 letras.
   Hecho para abrirse con doble clic (JavaScript clásico, sin servidor).
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1) DATOS
     ------------------------------------------------------------------ */
  var PALETA = ["#e6194b","#f58231","#ffb000","#3cb44b","#1f9e89",
                "#2a7fff","#7b2fbe","#e667af","#9a6324","#0aa3a3",
                "#d2691e","#c0392b"];

  // n = nombre hablado · p = profesión/ejemplo · e = emoji · s = sonido
  var INFO = {
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

  var ABECEDARIO = "abcdefghijklmnñopqrstuvwxyz".split("");
  var ORDEN_ABC = "aeioumplstndcbvfrghjñzqkwxy".split(""); // orden de aprendizaje
  var COLOR = {};
  ORDEN_ABC.forEach(function (L, i) { COLOR[L] = PALETA[i % PALETA.length]; });

  var VOCALES = ["a","e","i","o","u"];
  var ORDEN_LETRAS = ORDEN_ABC.slice();
  var CONS_SIL = ["m","p","l","s","t","n","d","f","r","c","b","v","g","j"];
  var TRABADAS = ["bl","br","cl","cr","dr","fl","fr","gl","gr","pl","pr","tr"];

  // Distribución del teclado en pantalla
  var LAYOUT_QWERTY = ["qwertyuiop", "asdfghjklñ", "zxcvbnm"];
  var LAYOUT_ABC = ["abcdefg", "hijklmnñ", "opqrstu", "vwxyz"];

  // Palabras con dibujo y dificultad (d: 0 fácil, 1 medio, 2 difícil)
  var PALABRAS = [
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

  // Frases sueltas para leer (solo lectura: usamos tildes, suenan mejor)
  var FRASES = [
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

  // Cuentos: páginas (frase corta + dibujo) que forman una historia.
  // En este modo el niño TECLEA cada palabra entera para avanzar, por eso
  // las frases son cortas. Las tildes/mayúsculas son solo para mostrar;
  // al teclear se normalizan a letras base (ver normaliza()).
  var CUENTOS = [
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

  var NIVELES = ["Fácil", "Medio", "Difícil"];

  /* ------------------------------------------------------------------
     2) ESTADO + persistencia
     ------------------------------------------------------------------ */
  var guardado = {};
  try { guardado = JSON.parse(localStorage.getItem("letrasVivas") || "{}"); } catch (e) {}

  var S = {
    pantalla: "intro",
    voz: guardado.voz !== false,
    modoVoz: guardado.modoVoz === "sonido" ? "sonido" : "nombre",
    minus: guardado.minus !== false,
    nivel: typeof guardado.nivel === "number" ? guardado.nivel : 0,
    kbLayout: guardado.kbLayout === "abc" ? "abc" : "qwerty",
    estrellas: guardado.estrellas || 0,
    desc: new Set(guardado.desc || []),
    selMenu: 0,
    celebrando: false,
    busca: null, grupo: 5,
    esc: null, falta: null, frase: null, gal: null, cuento: null, cuentoPrev: -1
  };

  function persistir() {
    try {
      localStorage.setItem("letrasVivas", JSON.stringify({
        voz: S.voz, modoVoz: S.modoVoz, minus: S.minus, nivel: S.nivel,
        kbLayout: S.kbLayout, estrellas: S.estrellas, desc: Array.from(S.desc)
      }));
    } catch (e) {}
  }

  /* ------------------------------------------------------------------
     3) AUDIO
     ------------------------------------------------------------------ */
  var voces = [];
  function cargarVoces() { try { voces = window.speechSynthesis.getVoices(); } catch (e) {} }
  if ("speechSynthesis" in window) { cargarVoces(); window.speechSynthesis.onvoiceschanged = cargarVoces; }
  function vozES() {
    return voces.filter(function (v) { return /es[-_]es/i.test(v.lang); })[0] ||
           voces.filter(function (v) { return /^es/i.test(v.lang); })[0] || null;
  }
  function hablar(texto) {
    if (!S.voz || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(texto);
      var v = vozES(); if (v) u.voice = v;
      u.lang = (v && v.lang) || "es-ES"; u.rate = 0.9; u.pitch = 1.2;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function decirLetra(letra) {
    var info = INFO[letra]; if (!info) { hablar(letra); return; }
    if (S.modoVoz === "sonido") {
      if (info.s === "") hablar("La hache no suena, como en " + info.p.toLowerCase());
      else hablar(info.s + ", como en " + info.p.toLowerCase());
    } else hablar(info.n + ", de " + info.p);
  }
  function pedirLetra(letra) {
    var info = INFO[letra];
    if (S.modoVoz === "sonido" && info && info.s) return hablar("Busca la letra que suena " + info.s);
    hablar("Busca la letra " + (info ? info.n : letra));
  }

  var actx = null;
  function ctx() {
    if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function nota(freq, t0, dur, tipo, vol) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = tipo || "sine"; o.frequency.value = freq;
    var now = c.currentTime + t0;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(c.destination);
    o.start(now); o.stop(now + dur + 0.02);
  }
  function sfxBien()     { nota(523,0,0.12,"triangle"); nota(659,0.1,0.12,"triangle"); nota(784,0.2,0.18,"triangle"); }
  function sfxTick()     { nota(880,0,0.07,"square",0.1); }
  function sfxUps()      { nota(300,0,0.12,"sine",0.12); nota(240,0.1,0.16,"sine",0.12); }
  function sfxFanfarria(){ [523,659,784,1046].forEach(function (f,i){ nota(f,i*0.12,0.2,"triangle",0.2); }); }

  /* ------------------------------------------------------------------
     4) UTILIDADES DOM + personajes + táctil
     ------------------------------------------------------------------ */
  var app = document.getElementById("app");
  var fx  = document.getElementById("fx");
  var controles = document.getElementById("controles");

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function limpiar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function mostrar(letra) { return S.minus ? letra : letra.toUpperCase(); }
  function azar(arr) { return arr[(Math.random() * arr.length) | 0]; }

  // Asocia un toque/clic a una acción (sirve para dedo y ratón)
  function tap(node, fn) {
    node.addEventListener("click", function () { ctx(); fn(); });
  }

  function construir(c, letra, accesorio) {
    c.style.setProperty("--c", COLOR[letra] || "#4363d8");
    c.dataset.letra = letra; limpiar(c);
    var info = INFO[letra];
    if (accesorio && info && info.e) c.appendChild(el("div", "accessory", info.e));
    c.appendChild(el("span", "glyph", mostrar(letra)));
    var face = el("div", "face");
    for (var i = 0; i < 2; i++) { var eye = el("div", "eye"); eye.appendChild(el("div", "pupil")); face.appendChild(eye); }
    c.appendChild(face);
    c.appendChild(el("div", "mouth"));
  }
  // El tamaño se da en "rem" pero se limita con vmin para que quepa en tablet/móvil
  function tam(rem) { return "min(" + rem + "rem, " + (rem * 1.7) + "vmin)"; }
  function personaje(letra, tamRem, accesorio) {
    var c = el("div", "letter-char"); c.style.fontSize = tam(tamRem);
    construir(c, letra, accesorio); return c;
  }
  function ranura(letra, tamRem) {
    var c = el("div", "letter-char slot"); c.style.fontSize = tam(tamRem);
    c.dataset.letra = letra; c.appendChild(el("span", "glyph", "?"));
    return c;
  }
  function revelar(c, accesorio) {
    c.classList.remove("slot", "blank", "next"); c.classList.add("done");
    construir(c, c.dataset.letra, accesorio); animar(c, "happy", 600);
  }
  function animar(node, clase, ms) {
    if (!node) return;
    node.classList.remove(clase); void node.offsetWidth; node.classList.add(clase);
    if (ms) setTimeout(function () { node.classList.remove(clase); }, ms);
  }

  /* ------------------------------------------------------------------
     5) EFECTOS
     ------------------------------------------------------------------ */
  function centro(node) {
    if (node) { var r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  function confeti(node, cuantos) {
    var p = centro(node), simbolos = ["⭐","🎉","✨","🌟","🎊","💫"], n = cuantos || 26;
    for (var i = 0; i < n; i++) (function () {
      var s = el("span", "confetti", azar(simbolos));
      s.style.left = p.x + "px"; s.style.top = p.y + "px";
      s.style.fontSize = (1.2 + Math.random() * 2) + "rem";
      fx.appendChild(s);
      var ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 220;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 120;
      requestAnimationFrame(function () {
        s.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + (Math.random()*720-360) + "deg)";
        s.style.opacity = "0";
      });
      setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1300);
    })();
  }
  function cartel(texto) {
    var t = el("div", "toast", texto); document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () { t.classList.remove("show"); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400); }, 1800);
  }
  function sumarEstrella() {
    S.estrellas++; persistir(); pintarHud();
    if (S.estrellas % 10 === 0) {
      confeti(null, 50); sfxFanfarria();
      cartel("🏆 ¡" + S.estrellas + " estrellas! 🏆");
      hablar("¡Increíble! Ya tienes " + S.estrellas + " estrellas.");
    }
  }
  function descubrir(letra) {
    if (!INFO[letra] || S.desc.has(letra)) return;
    S.desc.add(letra); persistir(); pintarHud();
    if (S.desc.size === ABECEDARIO.length) {
      confeti(null, 60); sfxFanfarria();
      cartel("🎓 ¡Ya conoces TODAS las letras!");
      hablar("¡Bravo! Has conocido todas las letras del abecedario.");
    }
  }

  /* ------------------------------------------------------------------
     6) HUD (con botones táctiles: volver y pantalla completa)
     ------------------------------------------------------------------ */
  var hud = el("div", "hud");
  var hudVolver = el("div", "boton-hud", "⬅️");
  var hudFull = el("div", "boton-hud", "⛶");
  var hudInfo = el("div", "estrellas", "");
  var hIzq = el("div", "hud-lado"), hDer = el("div", "hud-lado");
  hIzq.appendChild(hudVolver);
  hDer.appendChild(hudFull); hDer.appendChild(hudInfo);
  hud.appendChild(hIzq); hud.appendChild(hDer);
  tap(hudVolver, function () { manejarTecla("Escape"); });
  tap(hudFull, function () { pantallaCompleta(); });
  function pintarHud() { hudInfo.textContent = "⭐ " + S.estrellas + "  📚 " + S.desc.size + "/" + ABECEDARIO.length; }
  // El HUD está siempre (para el botón ⛶ pantalla completa). El botón volver y
  // las estrellas solo se muestran dentro de un juego (v = true).
  function hudVisible(v) {
    if (!hud.parentNode) document.body.appendChild(hud);
    hudVolver.style.display = v ? "" : "none";
    hudInfo.style.display = v ? "" : "none";
    pintarHud();
  }
  function pantallaCompleta() {
    var d = document, e = d.documentElement;
    var enFull = d.fullscreenElement || d.webkitFullscreenElement;
    try {
      if (!enFull) (e.requestFullscreen || e.webkitRequestFullscreen || function () {}).call(e);
      else (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d);
    } catch (err) {}
  }

  /* ------------------------------------------------------------------
     7) CONTROLES TÁCTILES (teclado en pantalla / botones de modo)
     ------------------------------------------------------------------ */
  function bctrl(label, key, extra) {
    var b = el("button", "bcontrol" + (extra ? " " + extra : ""), label);
    tap(b, function () { manejarTecla(key); });
    return b;
  }
  function teclado() {
    var filas = (S.kbLayout === "abc") ? LAYOUT_ABC : LAYOUT_QWERTY;
    var wrap = el("div", "teclado");
    filas.forEach(function (fila) {
      var r = el("div", "kfila");
      fila.split("").forEach(function (L) {
        var b = el("button", "ktecla", mostrar(L));
        b.style.setProperty("--c", COLOR[L] || "#4363d8");
        tap(b, (function (L) { return function () { manejarTecla(L); }; })(L));
        r.appendChild(b);
      });
      wrap.appendChild(r);
    });
    return wrap;
  }
  // tipo: none | teclado | galeria | frases
  function pintarControles(tipo) {
    limpiar(controles);
    if (tipo === "none") { controles.style.display = "none"; return; }
    controles.style.display = "flex";
    var barra = el("div", "barra");
    if (tipo === "galeria") {
      barra.appendChild(bctrl("◀", "ArrowLeft"));
      barra.appendChild(bctrl("🔊", "Enter"));
      barra.appendChild(bctrl("▶", "ArrowRight"));
      controles.appendChild(barra); controles.appendChild(teclado());
    } else if (tipo === "frases") {
      barra.appendChild(bctrl("🔊 Repetir", "Enter"));
      barra.appendChild(bctrl("Siguiente ▶", " ", "grande"));
      controles.appendChild(barra);
    } else { // teclado
      barra.appendChild(bctrl("🔊 Repetir", "Enter"));
      controles.appendChild(barra); controles.appendChild(teclado());
    }
  }

  /* ------------------------------------------------------------------
     8) PANTALLAS / MENÚ
     ------------------------------------------------------------------ */
  var MODOS = [
    { id:"explora",  icono:"🅰️", nombre:"Explorar",          voz:"Explorar. Pulsa cualquier letra y mira lo que pasa." },
    { id:"galeria",  icono:"📚", nombre:"Conoce las letras",  voz:"Conoce las letras. Usa las flechas para verlas todas." },
    { id:"busca",    icono:"🔎", nombre:"Encuentra la letra", voz:"Encuentra la letra que aparece." },
    { id:"silabas",  icono:"🧩", nombre:"Sílabas",            voz:"Sílabas. Lee y escribe la sílaba." },
    { id:"palabras", icono:"📖", nombre:"Palabras",           voz:"Palabras. Escribe la palabra." },
    { id:"falta",    icono:"🕵️", nombre:"Letra que falta",    voz:"Letra que falta. ¿Qué letra falta en la palabra?" },
    { id:"dictado",  icono:"👂", nombre:"Escucha y escribe",  voz:"Escucha y escribe. Escribe la palabra que oigas." },
    { id:"frases",   icono:"💬", nombre:"Frases",             voz:"Frases. Lee una frase, palabra a palabra." },
    { id:"cuentos",  icono:"📕", nombre:"Cuentos",            voz:"Cuentos. Lee un cuento entero, palabra a palabra." }
  ];

  function pantallaIntro() {
    S.pantalla = "intro"; hudVisible(false); pintarControles("none"); limpiar(app);
    var titulo = el("h1", "titulo");
    "LETRAS VIVAS".split("").forEach(function (ch, i) {
      var sp = el("span", "t-letra", ch === " " ? " " : ch);
      sp.style.animationDelay = (i * 0.08) + "s";
      sp.style.color = ch === " " ? "" : PALETA[i % PALETA.length];
      titulo.appendChild(sp);
    });
    app.appendChild(titulo);
    app.appendChild(el("p", "subtitulo", "Un juego para leer jugando"));
    var fila = el("div", "fila-letras");
    ["h","o","l","a"].forEach(function (L) { fila.appendChild(personaje(L, 4.5, true)); });
    app.appendChild(fila);
    app.appendChild(el("p", "intro-tip", "👉 Toca la pantalla o pulsa una tecla para empezar"));
  }

  function pantallaHome() {
    S.pantalla = "home"; S.celebrando = false; hudVisible(false); pintarControles("none"); limpiar(app);
    app.appendChild(el("h1", "titulo", "¿A qué jugamos?"));

    var cont = el("div", "cards");
    MODOS.forEach(function (m, i) {
      var card = el("div", "card" + (i === S.selMenu ? " sel" : ""));
      card.appendChild(el("div", "num", String(i + 1)));
      card.appendChild(el("div", "icono", m.icono));
      card.appendChild(el("div", "nombre", m.nombre));
      tap(card, (function (id, ix) { return function () { S.selMenu = ix; abrirModo(id); }; })(m.id, i));
      cont.appendChild(card);
    });
    app.appendChild(cont);

    function badge(txt, key) { var b = el("div", "badge", txt); if (key) tap(b, function () { manejarTecla(key); }); return b; }
    var ajustes = el("div", "ajustes");
    ajustes.appendChild(badge("🔊 Voz: " + (S.voz ? "Sí" : "No"), "v"));
    ajustes.appendChild(badge("🗣️ Dice: " + (S.modoVoz === "sonido" ? "Sonido" : "Nombre"), "f"));
    ajustes.appendChild(badge("🔤 " + (S.minus ? "abc" : "ABC"), "l"));
    ajustes.appendChild(badge("📊 Nivel: " + NIVELES[S.nivel], "n"));
    ajustes.appendChild(badge("⌨️ " + (S.kbLayout === "abc" ? "ABC" : "QWERTY"), "t"));
    ajustes.appendChild(badge("⭐ " + S.estrellas + " · 📚 " + S.desc.size + "/" + ABECEDARIO.length));
    app.appendChild(ajustes);

    app.appendChild(el("p", "ayuda-controles",
      "Toca una tarjeta para jugar · o teclas 1-9 · ajustes: toca o pulsa V F L N T"));
  }

  function abrirModo(id) {
    var m = MODOS.filter(function (x) { return x.id === id; })[0];
    if (m) hablar(m.voz);
    ({ explora:iniciarExplora, galeria:iniciarGaleria, busca:iniciarBusca,
       silabas:iniciarSilabas, palabras:iniciarPalabras, falta:iniciarFalta,
       dictado:iniciarDictado, frases:iniciarFrases, cuentos:iniciarCuentos }[id] || function(){})();
  }

  /* ---------- EXPLORAR ---------- */
  function iniciarExplora() {
    S.pantalla = "explora"; hudVisible(true); limpiar(app);
    app.appendChild(el("p", "prompt", "¡Pulsa una letra! (teclado o pantalla)"));
    var stage = el("div", "stage"); stage.id = "stage"; app.appendChild(stage);
    var par = el("div", "parade"); par.id = "parade"; app.appendChild(par);
    pintarControles("teclado");
    explicaExplora("a");
  }
  function explicaExplora(letra) {
    var stage = document.getElementById("stage"); limpiar(stage);
    var ch = personaje(letra, 11, true); stage.appendChild(ch);
    var info = INFO[letra];
    var pie = el("p", "prompt"); pie.style.width = "100%";
    pie.textContent = info ? (info.n + " · " + info.p + " " + info.e) : letra;
    stage.appendChild(pie);
    animar(ch, "pop", 900);
    setTimeout(function () { animar(ch, "happy", 700); }, 250);
    decirLetra(letra); descubrir(letra);
    var par = document.getElementById("parade");
    par.appendChild(personaje(letra, 2.2, false));
    while (par.children.length > 12) par.removeChild(par.firstChild);
  }

  /* ---------- CONOCE LAS LETRAS (galería) ---------- */
  function iniciarGaleria() { S.pantalla = "galeria"; hudVisible(true); S.gal = { i: 0 }; pintarControles("galeria"); pintarGaleria(); }
  function pintarGaleria() {
    var letra = ABECEDARIO[S.gal.i]; limpiar(app);
    app.appendChild(el("p", "prompt", "Letra " + (S.gal.i + 1) + " de " + ABECEDARIO.length));
    var stage = el("div", "stage"); stage.id = "stage";
    stage.appendChild(personaje(letra, 12, true));
    var info = INFO[letra];
    var pie = el("p", "prompt"); pie.style.width = "100%";
    pie.appendChild(el("span", null, info.n.toUpperCase() + "  ·  " + info.p + " " + info.e));
    stage.appendChild(pie); app.appendChild(stage);
    animar(stage.querySelector(".letter-char"), "pop", 800);
    decirLetra(letra); descubrir(letra);
  }
  function moverGaleria(paso) { S.gal.i = (S.gal.i + paso + ABECEDARIO.length) % ABECEDARIO.length; pintarGaleria(); }
  function saltarGaleria(letra) { var idx = ABECEDARIO.indexOf(letra); if (idx >= 0) { S.gal.i = idx; pintarGaleria(); } }

  /* ---------- ENCUENTRA LA LETRA ---------- */
  function iniciarBusca() {
    S.pantalla = "busca"; S.grupo = 5; hudVisible(true);
    S.busca = { objetivo: null, intentos: 0 }; pintarControles("teclado"); nuevaBusca();
  }
  function nuevaBusca() {
    S.celebrando = false;
    var pool = ORDEN_LETRAS.slice(0, S.grupo), prev = S.busca.objetivo, t;
    do { t = azar(pool); } while (pool.length > 1 && t === prev);
    S.busca.objetivo = t; S.busca.intentos = 0;
    limpiar(app);
    app.appendChild(el("p", "prompt", "Busca esta letra y púlsala:"));
    var stage = el("div", "stage"); stage.id = "stage";
    stage.appendChild(personaje(t, 12, true)); app.appendChild(stage);
    animar(stage.querySelector(".letter-char"), "pop", 900);
    pedirLetra(t);
  }
  function aciertoBusca() {
    S.celebrando = true;
    var ch = document.querySelector("#stage .letter-char");
    animar(ch, "happy", 700); confeti(ch); sfxBien(); sumarEstrella();
    var t = S.busca.objetivo; descubrir(t);
    hablar("¡Muy bien! La " + INFO[t].n + ", de " + INFO[t].p);
    if (S.estrellas % 3 === 0 && S.grupo < ORDEN_LETRAS.length) S.grupo++;
    setTimeout(function () { if (S.pantalla === "busca") nuevaBusca(); }, 1500);
  }
  function falloBusca(letra) {
    S.busca.intentos++; sfxUps();
    var mini = personaje(letra, 3, false);
    mini.classList.add("oops");
    mini.style.position = "fixed"; mini.style.left = (40 + Math.random() * 20) + "%"; mini.style.top = "40%";
    fx.appendChild(mini);
    setTimeout(function () { if (mini.parentNode) mini.parentNode.removeChild(mini); }, 700);
    if (S.busca.intentos >= 2) { animar(document.querySelector("#stage .letter-char"), "happy", 700); pedirLetra(S.busca.objetivo); }
  }

  /* ---------- ESCRIBIR EN ORDEN: sílabas / palabras / dictado ---------- */
  function poolPalabras() { return PALABRAS.filter(function (p) { return p.d <= S.nivel; }); }

  function pintarEscritura(promptTxt, objetivo, dibujo, oculto) {
    limpiar(app);
    app.appendChild(el("p", "prompt", promptTxt));
    var stage = el("div", "stage"); stage.id = "stage";
    if (dibujo) { var d = el("div", "dibujo", dibujo); d.style.width = "100%"; stage.appendChild(d); }
    var fila = el("div", "fila-letras");
    objetivo.split("").forEach(function (L) { fila.appendChild(oculto ? ranura(L, 7) : personaje(L, 7, false)); });
    stage.appendChild(fila); app.appendChild(stage);
    resaltarSiguiente();
  }
  function resaltarSiguiente() {
    var chars = app.querySelectorAll("#stage .fila-letras .letter-char");
    for (var i = 0; i < chars.length; i++) chars[i].classList.remove("next");
    if (S.esc && chars[S.esc.escrito]) chars[S.esc.escrito].classList.add("next");
  }

  function iniciarSilabas() { S.pantalla = "silabas"; hudVisible(true); pintarControles("teclado"); nuevaSilaba(); }
  function nuevaSilaba() {
    S.celebrando = false;
    var onset = (S.nivel >= 2 && Math.random() < 0.5) ? azar(TRABADAS) : azar(CONS_SIL);
    S.esc = { objetivo: onset + azar(VOCALES), escrito: 0, intentos: 0, oculto: false };
    pintarEscritura("Lee y escribe la sílaba:", S.esc.objetivo, null, false);
    hablar(S.esc.objetivo);
  }

  function iniciarPalabras() { S.pantalla = "palabras"; hudVisible(true); S.esc = { prev: null }; pintarControles("teclado"); nuevaPalabra(); }
  function nuevaPalabra() {
    S.celebrando = false;
    var pool = poolPalabras(), prev = S.esc && S.esc.prev, item;
    do { item = azar(pool); } while (pool.length > 1 && item.w === prev);
    S.esc = { objetivo: item.w, escrito: 0, intentos: 0, oculto: false, prev: item.w };
    pintarEscritura("Escribe la palabra:", item.w, item.e, false);
    hablar(item.w);
  }

  function iniciarDictado() { S.pantalla = "dictado"; hudVisible(true); S.esc = { prev: null }; pintarControles("teclado"); nuevoDictado(); }
  function nuevoDictado() {
    S.celebrando = false;
    var pool = poolPalabras(), prev = S.esc && S.esc.prev, item;
    do { item = azar(pool); } while (pool.length > 1 && item.w === prev);
    var dibujo = (S.nivel >= 2) ? null : item.e;
    S.esc = { objetivo: item.w, escrito: 0, intentos: 0, oculto: true, prev: item.w };
    pintarEscritura("Escucha y escribe:", item.w, dibujo, true);
    hablar("Escucha. " + item.w);
  }

  function escribirLetra(letra) {
    var st = S.esc, sig = st.objetivo.charAt(st.escrito);
    var chars = app.querySelectorAll("#stage .fila-letras .letter-char");
    if (letra === sig) {
      st.escrito++; st.intentos = 0; sfxTick();
      var c = chars[st.escrito - 1];
      if (st.oculto) revelar(c, false); else { c.classList.add("done"); animar(c, "happy", 500); }
      if (st.escrito >= st.objetivo.length) completarEscritura();
      else resaltarSiguiente();
    } else {
      st.intentos++; sfxUps();
      animar(chars[st.escrito], "oops", 400);
      if (st.intentos >= 2) { resaltarSiguiente(); hablar("Busca la " + INFO[sig].n); }
    }
  }
  function completarEscritura() {
    S.celebrando = true; sfxBien(); confeti(document.getElementById("stage")); sumarEstrella();
    hablar("¡" + S.esc.objetivo + "! ¡Muy bien!");
    var p = S.pantalla;
    var next = p === "silabas" ? nuevaSilaba : (p === "dictado" ? nuevoDictado : nuevaPalabra);
    setTimeout(function () { if (S.pantalla === p) next(); }, 1600);
  }

  /* ---------- LETRA QUE FALTA ---------- */
  function iniciarFalta() { S.pantalla = "falta"; hudVisible(true); S.falta = { prev: null }; pintarControles("teclado"); nuevaFalta(); }
  function nuevaFalta() {
    S.celebrando = false;
    var pool = poolPalabras(), prev = S.falta && S.falta.prev, item;
    do { item = azar(pool); } while (pool.length > 1 && item.w === prev);
    var word = item.w, nB = Math.min(S.nivel >= 2 ? 2 : 1, word.length - 1), idxs = [];
    while (idxs.length < nB) { var r = (Math.random() * word.length) | 0; if (idxs.indexOf(r) < 0) idxs.push(r); }
    idxs.sort(function (a, b) { return a - b; });
    S.falta = { word: word, item: item, blanks: idxs, idx: 0, intentos: 0, prev: word };
    limpiar(app);
    app.appendChild(el("p", "prompt", "¿Qué letra falta?"));
    var stage = el("div", "stage"); stage.id = "stage";
    var d = el("div", "dibujo", item.e); d.style.width = "100%"; stage.appendChild(d);
    var fila = el("div", "fila-letras");
    word.split("").forEach(function (L, i) { fila.appendChild(idxs.indexOf(i) >= 0 ? ranura(L, 7) : personaje(L, 7, false)); });
    stage.appendChild(fila); app.appendChild(stage);
    marcarFalta();
    hablar("¿Qué letra falta? " + word);
  }
  function marcarFalta() {
    var chars = app.querySelectorAll("#stage .fila-letras .letter-char");
    for (var i = 0; i < chars.length; i++) chars[i].classList.remove("next");
    var pos = S.falta.blanks[S.falta.idx]; if (chars[pos]) chars[pos].classList.add("next");
  }
  function letraFalta(letra) {
    var pos = S.falta.blanks[S.falta.idx], objetivo = S.falta.word.charAt(pos);
    var chars = app.querySelectorAll("#stage .fila-letras .letter-char");
    if (letra === objetivo) {
      sfxTick(); revelar(chars[pos], false); descubrir(objetivo);
      S.falta.idx++; S.falta.intentos = 0;
      if (S.falta.idx >= S.falta.blanks.length) {
        S.celebrando = true; sfxBien(); confeti(document.getElementById("stage")); sumarEstrella();
        hablar("¡" + S.falta.word + "! ¡Muy bien!");
        setTimeout(function () { if (S.pantalla === "falta") nuevaFalta(); }, 1600);
      } else marcarFalta();
    } else {
      S.falta.intentos++; sfxUps(); animar(chars[pos], "oops", 400);
      if (S.falta.intentos >= 2) hablar("Es la " + INFO[objetivo].n);
    }
  }

  /* ---------- FRASES ---------- */
  function iniciarFrases() { S.pantalla = "frases"; hudVisible(true); S.frase = { prev: null }; pintarControles("frases"); nuevaFrase(); }
  function pintarLectura(promptTxt, tokens, dibujo) {
    limpiar(app);
    app.appendChild(el("p", "prompt", promptTxt));
    var stage = el("div", "stage"); stage.id = "stage";
    var d = el("div", "dibujo", dibujo); d.style.width = "100%"; stage.appendChild(d);
    var fr = el("div", "frase");
    tokens.forEach(function (w) { fr.appendChild(el("span", "palabra-frase", w)); });
    stage.appendChild(fr); app.appendChild(stage);
  }
  function nuevaFrase() {
    var prev = S.frase && S.frase.prev, item;
    do { item = azar(FRASES); } while (FRASES.length > 1 && item.t === prev);
    S.frase = { tokens: item.t.split(" "), idx: 0, fase: 0, item: item, prev: item.t };
    pintarLectura("Lee la frase, palabra a palabra:", S.frase.tokens, item.e);
    hablar("Lee la frase.");
  }
  function avanzarFrase() {
    var f = S.frase, spans = app.querySelectorAll("#stage .frase .palabra-frase");
    if (f.fase === 0 && f.idx < f.tokens.length) {
      for (var i = 0; i < spans.length; i++) spans[i].classList.remove("activa");
      if (f.idx > 0) spans[f.idx - 1].classList.add("leida");
      spans[f.idx].classList.add("activa"); hablar(f.tokens[f.idx]); sfxTick(); f.idx++;
    } else if (f.fase === 0) {
      for (var j = 0; j < spans.length; j++) { spans[j].classList.remove("activa"); spans[j].classList.add("leida"); }
      f.fase = 1; sfxBien(); confeti(document.getElementById("stage")); sumarEstrella(); hablar(f.item.t);
    } else { nuevaFrase(); }
  }

  /* ---------- CUENTOS (se teclea cada palabra para avanzar) ---------- */
  // Quita tildes (pero conserva la ñ) y deja solo letras: lo que hay que teclear.
  function normaliza(w) {
    return w.toLowerCase()
      .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i")
      .replace(/[óòö]/g, "o").replace(/[úùü]/g, "u")
      .replace(/[^a-zñ]/g, "");
  }
  function palabrasDe(frase) {
    return frase.split(/\s+/)
      .map(function (w) { return { orig: w, type: normaliza(w) }; })
      .filter(function (x) { return x.type.length > 0; });
  }
  function iniciarCuentos() {
    S.pantalla = "cuentos"; hudVisible(true); pintarControles("teclado");
    var i; do { i = (Math.random() * CUENTOS.length) | 0; } while (CUENTOS.length > 1 && i === S.cuentoPrev);
    S.cuentoPrev = i;
    S.cuento = { story: CUENTOS[i], pag: 0 };
    nuevaPaginaCuento(0);
  }
  function nuevaPaginaCuento(pag) {
    var c = S.cuento, st = c.story, pagina = st.paginas[pag];
    c.pag = pag; c.words = palabrasDe(pagina.t); c.wIdx = 0; c.escrito = 0; c.intentos = 0; c.fin = false;
    S.celebrando = false;
    limpiar(app);
    app.appendChild(el("p", "prompt", "📕 " + st.titulo + "  ·  página " + (pag + 1) + " de " + st.paginas.length));
    var stage = el("div", "stage"); stage.id = "stage";
    var d = el("div", "dibujo cuento-dibujo", pagina.e); d.style.width = "100%"; stage.appendChild(d);
    var fr = el("div", "frase");
    c.words.forEach(function (w) { fr.appendChild(el("span", "palabra-frase", w.orig)); });
    stage.appendChild(fr);
    var fila = el("div", "fila-letras"); fila.id = "cuento-word"; stage.appendChild(fila);
    app.appendChild(stage);
    activarPalabraCuento();
  }
  function activarPalabraCuento() {
    var c = S.cuento;
    var spans = app.querySelectorAll("#stage .frase .palabra-frase");
    for (var i = 0; i < spans.length; i++) {
      spans[i].classList.remove("activa", "leida");
      if (i < c.wIdx) spans[i].classList.add("leida");
      else if (i === c.wIdx) spans[i].classList.add("activa");
    }
    var fila = document.getElementById("cuento-word"); limpiar(fila);
    if (c.wIdx < c.words.length) {
      c.words[c.wIdx].type.split("").forEach(function (L) { fila.appendChild(personaje(L, 6, false)); });
      resaltarCuento();
      hablar(c.words[c.wIdx].orig);
    }
  }
  function resaltarCuento() {
    var c = S.cuento, chars = document.querySelectorAll("#cuento-word .letter-char");
    for (var i = 0; i < chars.length; i++) { chars[i].classList.remove("next"); if (i < c.escrito) chars[i].classList.add("done"); }
    if (chars[c.escrito]) chars[c.escrito].classList.add("next");
  }
  function escribirCuento(letra) {
    var c = S.cuento, target = c.words[c.wIdx].type, sig = target.charAt(c.escrito);
    var chars = document.querySelectorAll("#cuento-word .letter-char");
    if (letra === sig) {
      c.escrito++; c.intentos = 0; sfxTick();
      var ch = chars[c.escrito - 1]; if (ch) { ch.classList.add("done"); animar(ch, "happy", 450); }
      if (c.escrito >= target.length) {
        descubrir(c.words[c.wIdx].type.charAt(0));
        var spans = app.querySelectorAll("#stage .frase .palabra-frase");
        if (spans[c.wIdx]) { spans[c.wIdx].classList.remove("activa"); spans[c.wIdx].classList.add("leida"); }
        c.wIdx++; c.escrito = 0;
        if (c.wIdx < c.words.length) activarPalabraCuento();
        else paginaCompletaCuento();
      } else resaltarCuento();
    } else {
      c.intentos++; sfxUps(); animar(chars[c.escrito], "oops", 400);
      if (c.intentos >= 2) { resaltarCuento(); hablar("Busca la " + INFO[sig].n); }
    }
  }
  function paginaCompletaCuento() {
    var c = S.cuento, st = c.story;
    sfxBien(); confeti(document.getElementById("stage")); sumarEstrella();
    hablar(st.paginas[c.pag].t);
    if (c.pag < st.paginas.length - 1) {
      S.celebrando = true;
      setTimeout(function () { if (S.pantalla === "cuentos" && S.celebrando) { S.celebrando = false; nuevaPaginaCuento(c.pag + 1); } }, 1700);
    } else {
      c.fin = true; S.celebrando = true;
      setTimeout(function () { sfxFanfarria(); confeti(null, 60); }, 300);
      cartel("📕 ¡Has leído " + st.titulo + "!");
      hablar("¡Bravo! Has leído el cuento " + st.titulo + " tú solo. ¡Eres un campeón!");
      setTimeout(function () { if (S.pantalla === "cuentos" && S.cuento && S.cuento.fin) iniciarCuentos(); }, 5000);
    }
  }

  /* ------------------------------------------------------------------
     9) ENTRADA (teclado físico + táctil unificados)
     ------------------------------------------------------------------ */
  function esLetra(k) { return k && k.length === 1 && /[a-zñ]/i.test(k); }

  function manejarTecla(k) {
    ctx();
    if (S.pantalla === "intro") { hablar("¡Hola! Vamos a jugar con las letras."); pantallaHome(); return; }
    if (k === "Escape") { if (S.pantalla !== "home") { try { window.speechSynthesis.cancel(); } catch (e) {} pantallaHome(); } return; }

    if (S.pantalla === "home") {
      if (k === "ArrowRight" || k === "ArrowDown") { S.selMenu = (S.selMenu + 1) % MODOS.length; pantallaHome(); hablar(MODOS[S.selMenu].nombre); }
      else if (k === "ArrowLeft" || k === "ArrowUp") { S.selMenu = (S.selMenu - 1 + MODOS.length) % MODOS.length; pantallaHome(); hablar(MODOS[S.selMenu].nombre); }
      else if (k === "Enter" || k === " ") { abrirModo(MODOS[S.selMenu].id); }
      else if (k >= "1" && k <= "9") { var idx = parseInt(k, 10) - 1; if (idx < MODOS.length) { S.selMenu = idx; abrirModo(MODOS[idx].id); } }
      else if (k === "v" || k === "V") { S.voz = !S.voz; persistir(); pantallaHome(); if (S.voz) hablar("Voz activada"); }
      else if (k === "f" || k === "F") { S.modoVoz = S.modoVoz === "sonido" ? "nombre" : "sonido"; persistir(); pantallaHome(); hablar(S.modoVoz === "sonido" ? "Diré el sonido" : "Diré el nombre"); }
      else if (k === "l" || k === "L") { S.minus = !S.minus; persistir(); pantallaHome(); }
      else if (k === "n" || k === "N") { S.nivel = (S.nivel + 1) % NIVELES.length; persistir(); pantallaHome(); hablar("Nivel " + NIVELES[S.nivel]); }
      else if (k === "t" || k === "T") { S.kbLayout = S.kbLayout === "abc" ? "qwerty" : "abc"; persistir(); pantallaHome(); }
      return;
    }
    if (S.pantalla === "explora") { if (esLetra(k)) explicaExplora(k.toLowerCase()); return; }
    if (S.pantalla === "galeria") {
      if (k === "ArrowRight" || k === "ArrowDown") moverGaleria(1);
      else if (k === "ArrowLeft" || k === "ArrowUp") moverGaleria(-1);
      else if (k === "Enter" || k === " ") decirLetra(ABECEDARIO[S.gal.i]);
      else if (esLetra(k)) saltarGaleria(k.toLowerCase());
      return;
    }
    if (S.pantalla === "busca") {
      if (S.celebrando) { if (k === "Enter" || k === " ") nuevaBusca(); return; }
      if (k === "Enter" || k === " ") { pedirLetra(S.busca.objetivo); return; }
      if (esLetra(k)) { var L = k.toLowerCase(); if (L === S.busca.objetivo) aciertoBusca(); else falloBusca(L); }
      return;
    }
    if (S.pantalla === "silabas" || S.pantalla === "palabras" || S.pantalla === "dictado") {
      if (S.celebrando) return;
      if (k === "Enter" || k === " ") { hablar(S.pantalla === "dictado" ? ("Escucha. " + S.esc.objetivo) : S.esc.objetivo); return; }
      if (esLetra(k)) escribirLetra(k.toLowerCase());
      return;
    }
    if (S.pantalla === "falta") {
      if (S.celebrando) { if (k === "Enter" || k === " ") nuevaFalta(); return; }
      if (k === "Enter" || k === " ") { hablar(S.falta.word); return; }
      if (esLetra(k)) letraFalta(k.toLowerCase());
      return;
    }
    if (S.pantalla === "frases") {
      if (k === " ") avanzarFrase(); else if (k === "Enter") hablar(S.frase.item.t);
      return;
    }
    if (S.pantalla === "cuentos") {
      if (S.celebrando) { if (S.cuento.fin && (k === "Enter" || k === " ")) iniciarCuentos(); return; }
      if (k === "Enter" || k === " ") { if (S.cuento.wIdx < S.cuento.words.length) hablar(S.cuento.words[S.cuento.wIdx].orig); return; }
      if (esLetra(k)) escribirCuento(k.toLowerCase());
      return;
    }
  }

  function teclaUsada(k) {
    return k === " " || k === "Enter" || k === "Escape" || /^Arrow/.test(k) || esLetra(k) || (k >= "0" && k <= "9");
  }
  document.addEventListener("keydown", function (ev) {
    if (teclaUsada(ev.key)) ev.preventDefault();
    manejarTecla(ev.key);
  });
  // Tocar la pantalla de inicio empieza el juego (gesto que desbloquea el audio)
  tap(app, function () { if (S.pantalla === "intro") manejarTecla(" "); });

  /* ------------------------------------------------------------------
     10) ARRANQUE
     ------------------------------------------------------------------ */
  pintarHud();
  pantallaIntro();
})();
