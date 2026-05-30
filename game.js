/* =====================================================================
   LAS LETRAS VIVAS
   Juego de lectura con teclado, para peques que aprenden a leer.
   - Se maneja SOLO con el teclado (sin ratón).
   - Cada letra es un personaje con ojos, sonrisa y su profesión.
   - Voz en español (lee letras, sílabas y palabras en alto).
   - 4 modos: Explorar · Encuentra la letra · Sílabas · Palabras.
   Hecho para abrirse con doble clic (JavaScript clásico, sin servidor).
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1) DATOS: cada letra con su nombre hablado, profesión, emoji y color
     ------------------------------------------------------------------ */
  var PALETA = ["#e6194b","#f58231","#ffb000","#3cb44b","#1f9e89",
                "#2a7fff","#7b2fbe","#e667af","#9a6324","#0aa3a3",
                "#d2691e","#c0392b"];

  // nombre = cómo se pronuncia la letra · palabra = profesión/ejemplo
  var INFO = {
    a:{n:"a",       p:"Astronauta",  e:"🚀"},
    b:{n:"be",      p:"Bombero",     e:"🚒"},
    c:{n:"ce",      p:"Cocinera",    e:"👩‍🍳"},
    d:{n:"de",      p:"Doctora",     e:"🩺"},
    e:{n:"e",       p:"Electricista",e:"💡"},
    f:{n:"efe",     p:"Futbolista",  e:"⚽"},
    g:{n:"ge",      p:"Granjero",    e:"🚜"},
    h:{n:"hache",   p:"Heladero",    e:"🍦"},
    i:{n:"i",       p:"Ingeniera",   e:"🔧"},
    j:{n:"jota",    p:"Jardinera",   e:"🪴"},
    k:{n:"ka",      p:"Karateka",    e:"🥋"},
    l:{n:"ele",     p:"Lechera",     e:"🥛"},
    m:{n:"eme",     p:"Mago",        e:"🪄"},
    n:{n:"ene",     p:"Nadador",     e:"🏊"},
    "ñ":{n:"eñe",   p:"Ñu",          e:"🐃"},
    o:{n:"o",       p:"Obrero",      e:"👷"},
    p:{n:"pe",      p:"Pintor",      e:"🎨"},
    q:{n:"cu",      p:"Quesero",     e:"🧀"},
    r:{n:"erre",    p:"Repartidor",  e:"📦"},
    s:{n:"ese",     p:"Sastre",      e:"🧵"},
    t:{n:"te",      p:"Taxista",     e:"🚕"},
    u:{n:"u",       p:"Unicornio",   e:"🦄"},
    v:{n:"uve",     p:"Veterinaria", e:"🐶"},
    w:{n:"uve doble",p:"Waterpolista",e:"🤽"},
    x:{n:"equis",   p:"Xilófono",    e:"🎶"},
    y:{n:"i griega",p:"Yoyó",        e:"🪀"},
    z:{n:"zeta",    p:"Zapatero",    e:"👟"}
  };

  // Color fijo por letra (cíclico sobre la paleta)
  var ORDEN_ABC = "aeioumplstndcbvfrghjñzqkwxy".split("");
  var COLOR = {};
  ORDEN_ABC.forEach(function (L, i) { COLOR[L] = PALETA[i % PALETA.length]; });

  var VOCALES = ["a","e","i","o","u"];
  // Orden de aparición en "Encuentra la letra": primero vocales, luego
  // las consonantes más fáciles/frecuentes. El grupo va creciendo.
  var ORDEN_LETRAS = ORDEN_ABC.slice();

  // Sílabas: consonantes sencillas combinadas con las 5 vocales
  var CONS_SIL = ["m","p","l","s","t","n","d"];

  // Palabras cortas (sin tildes para teclear fácil), con su dibujo
  var PALABRAS = [
    {w:"sol", e:"☀️"}, {w:"pan", e:"🍞"}, {w:"oso", e:"🐻"},
    {w:"pez", e:"🐟"}, {w:"sal", e:"🧂"}, {w:"ojo", e:"👁️"},
    {w:"luna",e:"🌙"}, {w:"gato",e:"🐱"}, {w:"pato",e:"🦆"},
    {w:"casa",e:"🏠"}, {w:"mono",e:"🐵"}, {w:"rana",e:"🐸"},
    {w:"vaca",e:"🐄"}, {w:"foca",e:"🦭"}, {w:"lobo",e:"🐺"},
    {w:"nube",e:"☁️"}, {w:"sopa",e:"🍲"}, {w:"lupa",e:"🔍"},
    {w:"dado",e:"🎲"}, {w:"bota",e:"👢"}, {w:"dedo",e:"☝️"}
  ];
  PALABRAS.sort(function (a, b) { return a.w.length - b.w.length; });

  /* ------------------------------------------------------------------
     2) ESTADO + persistencia sencilla (estrellas y ajustes)
     ------------------------------------------------------------------ */
  var guardado = {};
  try { guardado = JSON.parse(localStorage.getItem("letrasVivas") || "{}"); } catch (e) {}

  var S = {
    pantalla: "intro",      // intro · home · explora · busca · silabas · palabras
    voz: guardado.voz !== false,
    minus: guardado.minus !== false, // true = minúsculas (lectura), false = MAYÚS
    estrellas: guardado.estrellas || 0,
    selMenu: 0,
    celebrando: false,      // true mientras se festeja un acierto (Enter = siguiente)
    // sub-estados por modo:
    busca: null,
    silaba: null,
    palabra: null,
    grupo: 5                // cuántas letras activas en "Encuentra la letra"
  };

  function persistir() {
    try {
      localStorage.setItem("letrasVivas", JSON.stringify({
        voz: S.voz, minus: S.minus, estrellas: S.estrellas
      }));
    } catch (e) {}
  }

  /* ------------------------------------------------------------------
     3) AUDIO: voz (Web Speech) + efectos (WebAudio, sin archivos)
     ------------------------------------------------------------------ */
  var voces = [];
  function cargarVoces() { try { voces = window.speechSynthesis.getVoices(); } catch (e) {} }
  if ("speechSynthesis" in window) {
    cargarVoces();
    window.speechSynthesis.onvoiceschanged = cargarVoces;
  }
  function vozES() {
    return voces.filter(function (v) { return /es[-_]es/i.test(v.lang); })[0] ||
           voces.filter(function (v) { return /^es/i.test(v.lang); })[0] || null;
  }
  function hablar(texto) {
    if (!S.voz || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(texto);
      var v = vozES();
      if (v) u.voice = v;
      u.lang = (v && v.lang) || "es-ES";
      u.rate = 0.9;   // un poco lento, para que le siga bien
      u.pitch = 1.2;  // agudo y simpático
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  var actx = null;
  function ctx() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function nota(freq, t0, dur, tipo, vol) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = tipo || "sine";
    o.frequency.value = freq;
    var now = c.currentTime + t0;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(c.destination);
    o.start(now); o.stop(now + dur + 0.02);
  }
  function sfxBien()    { nota(523,0,0.12,"triangle"); nota(659,0.1,0.12,"triangle"); nota(784,0.2,0.18,"triangle"); }
  function sfxTick()    { nota(880,0,0.07,"square",0.1); }
  function sfxUps()     { nota(300,0,0.12,"sine",0.12); nota(240,0.1,0.16,"sine",0.12); }
  function sfxFanfarria(){ [523,659,784,1046].forEach(function (f,i){ nota(f,i*0.12,0.2,"triangle",0.2); }); }

  /* ------------------------------------------------------------------
     4) UTILIDADES DOM
     ------------------------------------------------------------------ */
  var app = document.getElementById("app");
  var fx = document.getElementById("fx");

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  function limpiar(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function mostrar(letra) { return S.minus ? letra : letra.toUpperCase(); }

  // Construye un personaje "letra viva"
  function personaje(letra, tamRem, conAccesorio) {
    var info = INFO[letra] || {n:letra, p:"", e:""};
    var c = el("div", "letter-char");
    c.style.fontSize = tamRem + "rem";
    c.style.setProperty("--c", COLOR[letra] || "#4363d8");
    c.dataset.letra = letra;

    if (conAccesorio && info.e) {
      var acc = el("div", "accessory", info.e);
      c.appendChild(acc);
    }
    var glyph = el("span", "glyph", mostrar(letra));
    c.appendChild(glyph);

    var face = el("div", "face");
    for (var i = 0; i < 2; i++) {
      var eye = el("div", "eye");
      eye.appendChild(el("div", "pupil"));
      face.appendChild(eye);
    }
    c.appendChild(face);
    c.appendChild(el("div", "mouth"));
    return c;
  }

  function animar(node, clase, ms) {
    if (!node) return;
    node.classList.remove(clase);
    void node.offsetWidth; // reinicia animación
    node.classList.add(clase);
    if (ms) setTimeout(function () { node.classList.remove(clase); }, ms);
  }

  /* ------------------------------------------------------------------
     5) EFECTOS: confeti y cartel de celebración
     ------------------------------------------------------------------ */
  function centro(node) {
    if (node) {
      var r = node.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  function confeti(node, cuantos) {
    var p = centro(node);
    var simbolos = ["⭐","🎉","✨","🌟","🎊","💫"];
    var n = cuantos || 26;
    for (var i = 0; i < n; i++) {
      (function () {
        var s = el("span", "confetti", simbolos[(Math.random() * simbolos.length) | 0]);
        s.style.left = p.x + "px";
        s.style.top = p.y + "px";
        s.style.fontSize = (1.2 + Math.random() * 2) + "rem";
        fx.appendChild(s);
        var ang = Math.random() * Math.PI * 2;
        var dist = 80 + Math.random() * 220;
        var dx = Math.cos(ang) * dist;
        var dy = Math.sin(ang) * dist - 120;
        requestAnimationFrame(function () {
          s.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + (Math.random()*720-360) + "deg)";
          s.style.opacity = "0";
        });
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1300);
      })();
    }
  }
  function cartel(texto) {
    var t = el("div", "toast", texto);
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 1800);
  }

  function sumarEstrella() {
    S.estrellas++;
    persistir();
    pintarHud();
    if (S.estrellas % 10 === 0) {
      confeti(null, 50);
      sfxFanfarria();
      cartel("🏆 ¡" + S.estrellas + " estrellas! 🏆");
      hablar("¡Increíble! Ya tienes " + S.estrellas + " estrellas.");
    }
  }

  /* ------------------------------------------------------------------
     6) HUD (barra superior, común a los modos de juego)
     ------------------------------------------------------------------ */
  var hud = el("div", "hud");
  var hudVolver = el("div", "volver", "⬅️ Esc");
  var hudEstrellas = el("div", "estrellas", "");
  hud.appendChild(hudVolver);
  hud.appendChild(hudEstrellas);
  function pintarHud() { hudEstrellas.textContent = "⭐ " + S.estrellas; }
  function hudVisible(v) {
    if (v && !hud.parentNode) document.body.appendChild(hud);
    else if (!v && hud.parentNode) hud.parentNode.removeChild(hud);
    pintarHud();
  }

  /* ------------------------------------------------------------------
     7) PANTALLAS
     ------------------------------------------------------------------ */
  var MODOS = [
    { id: "explora",  icono: "🅰️", nombre: "Explorar",  voz: "Explorar. Pulsa cualquier letra y mira lo que pasa." },
    { id: "busca",    icono: "🔎", nombre: "Encuentra la letra", voz: "Encuentra la letra que aparece." },
    { id: "silabas",  icono: "🧩", nombre: "Sílabas",   voz: "Sílabas. Escribe la sílaba." },
    { id: "palabras", icono: "📖", nombre: "Palabras",  voz: "Palabras. Escribe la palabra." }
  ];

  function pantallaIntro() {
    S.pantalla = "intro";
    hudVisible(false);
    limpiar(app);
    var titulo = el("h1", "titulo");
    "LETRAS VIVAS".split("").forEach(function (ch, i) {
      var sp = el("span", "t-letra", ch === " " ? " " : ch);
      sp.style.animationDelay = (i * 0.08) + "s";
      sp.style.color = ch === " " ? "" : PALETA[i % PALETA.length];
      titulo.appendChild(sp);
    });
    app.appendChild(titulo);
    app.appendChild(el("p", "subtitulo", "Un juego para leer jugando con el teclado"));
    var fila = el("div", "fila-letras");
    ["h","o","l","a"].forEach(function (L) { fila.appendChild(personaje(L, 4.5, true)); });
    app.appendChild(fila);
    app.appendChild(el("p", "intro-tip", "👉 Pulsa cualquier tecla para empezar"));
  }

  function pantallaHome() {
    S.pantalla = "home";
    S.celebrando = false;
    hudVisible(false);
    limpiar(app);

    var titulo = el("h1", "titulo", "¿A qué jugamos?");
    app.appendChild(titulo);

    var cont = el("div", "cards");
    MODOS.forEach(function (m, i) {
      var card = el("div", "card" + (i === S.selMenu ? " sel" : ""));
      card.appendChild(el("div", "num", String(i + 1)));
      card.appendChild(el("div", "icono", m.icono));
      card.appendChild(el("div", "nombre", m.nombre));
      cont.appendChild(card);
    });
    app.appendChild(cont);

    var ajustes = el("div", "ajustes");
    ajustes.appendChild(el("div", "badge", "🔊 Voz: " + (S.voz ? "Sí" : "No") + "  (tecla V)"));
    ajustes.appendChild(el("div", "badge", "🔤 Letras: " + (S.minus ? "abc" : "ABC") + "  (tecla L)"));
    ajustes.appendChild(el("div", "badge", "⭐ " + S.estrellas));
    app.appendChild(ajustes);

    app.appendChild(el("p", "ayuda-controles",
      "Flechas ⬅️➡️ y Enter para elegir · o pulsa 1 2 3 4 · V = voz · L = letras"));
  }

  function abrirModo(id) {
    var m = MODOS.filter(function (x) { return x.id === id; })[0];
    if (m) hablar(m.voz);
    if (id === "explora") iniciarExplora();
    else if (id === "busca") iniciarBusca();
    else if (id === "silabas") iniciarSilabas();
    else if (id === "palabras") iniciarPalabras();
  }

  /* ---------- MODO 1: EXPLORAR (pulsa cualquier letra) ---------- */
  function iniciarExplora() {
    S.pantalla = "explora";
    hudVisible(true);
    limpiar(app);
    app.appendChild(el("p", "prompt", "¡Pulsa cualquier letra del teclado!"));
    var stage = el("div", "stage"); stage.id = "stage";
    app.appendChild(stage);
    app.appendChild(el("div", "parade")).id = "parade";
    app.appendChild(el("p", "ayuda-controles", "Esc = volver al menú"));
    explicaExplora("a");
  }
  function explicaExplora(letra) {
    var stage = document.getElementById("stage");
    limpiar(stage);
    var ch = personaje(letra, 12, true);
    stage.appendChild(ch);
    var info = INFO[letra];
    var pie = el("p", "prompt");
    pie.style.width = "100%";
    pie.textContent = info ? (info.n + " · " + info.p + " " + info.e) : letra;
    stage.appendChild(pie);
    animar(ch, "pop", 900);
    setTimeout(function () { animar(ch, "happy", 700); }, 250);
    if (info) hablar(info.n + ", de " + info.p);
    // pequeño desfile de letras recientes
    var par = document.getElementById("parade");
    var mini = personaje(letra, 2.2, false);
    par.appendChild(mini);
    while (par.children.length > 12) par.removeChild(par.firstChild);
  }

  /* ---------- MODO 2: ENCUENTRA LA LETRA ---------- */
  function iniciarBusca() {
    S.pantalla = "busca";
    S.grupo = 5; // empieza solo con vocales
    hudVisible(true);
    S.busca = { objetivo: null, intentos: 0 };
    nuevaBusca();
  }
  function poolBusca() { return ORDEN_LETRAS.slice(0, S.grupo); }
  function nuevaBusca() {
    S.celebrando = false;
    var pool = poolBusca();
    var prev = S.busca.objetivo;
    var t;
    do { t = pool[(Math.random() * pool.length) | 0]; } while (pool.length > 1 && t === prev);
    S.busca.objetivo = t;
    S.busca.intentos = 0;

    limpiar(app);
    app.appendChild(el("p", "prompt", "Busca esta letra y púlsala:"));
    var stage = el("div", "stage"); stage.id = "stage";
    var ch = personaje(t, 13, true);
    stage.appendChild(ch);
    app.appendChild(stage);
    app.appendChild(el("p", "ayuda-controles", "Pulsa la letra · Enter = repetir voz · Esc = menú"));
    animar(ch, "pop", 900);
    hablar("Busca la letra " + INFO[t].n);
  }
  function aciertoBusca() {
    S.celebrando = true;
    var ch = document.querySelector("#stage .letter-char");
    animar(ch, "happy", 700);
    confeti(ch);
    sfxBien();
    sumarEstrella();
    var t = S.busca.objetivo;
    hablar("¡Muy bien! La " + INFO[t].n + ", de " + INFO[t].p);
    // cada 3 estrellas, crece el grupo de letras
    if (S.estrellas % 3 === 0 && S.grupo < ORDEN_LETRAS.length) S.grupo++;
    setTimeout(function () { if (S.pantalla === "busca") nuevaBusca(); }, 1500);
  }
  function falloBusca(letra) {
    S.busca.intentos++;
    sfxUps();
    var stage = document.getElementById("stage");
    var mini = personaje(letra, 3, false);
    mini.classList.add("oops");
    mini.style.position = "fixed";
    mini.style.left = (40 + Math.random() * 20) + "%";
    mini.style.bottom = "16%";
    fx.appendChild(mini);
    setTimeout(function () { if (mini.parentNode) mini.parentNode.removeChild(mini); }, 700);
    if (S.busca.intentos >= 2) {
      var ch = document.querySelector("#stage .letter-char");
      animar(ch, "happy", 700);
      hablar("Busca la letra " + INFO[S.busca.objetivo].n);
    }
  }

  /* ---------- MODO 3 y 4: SÍLABAS / PALABRAS (escribir en orden) ---------- */
  function pintarEscritura(promptTxt, objetivo, dibujo) {
    limpiar(app);
    app.appendChild(el("p", "prompt", promptTxt));
    var stage = el("div", "stage"); stage.id = "stage";
    if (dibujo) {
      var d = el("div", "dibujo", dibujo);
      d.style.width = "100%";
      stage.appendChild(d);
    }
    var fila = el("div", "fila-letras");
    objetivo.split("").forEach(function (L) {
      fila.appendChild(personaje(L, 8, false));
    });
    stage.appendChild(fila);
    app.appendChild(stage);
    app.appendChild(el("p", "ayuda-controles", "Escribe las letras en orden · Enter = repetir voz · Esc = menú"));
    marcarProgreso(0);
  }
  function marcarProgreso(hechas) {
    var chars = app.querySelectorAll("#stage .fila-letras .letter-char");
    for (var i = 0; i < chars.length; i++) {
      chars[i].classList.remove("done", "next");
      if (i < hechas) chars[i].classList.add("done");
    }
  }
  function resaltarSiguiente() {
    var st = (S.pantalla === "silabas") ? S.silaba : S.palabra;
    var chars = app.querySelectorAll("#stage .fila-letras .letter-char");
    if (chars[st.escrito]) chars[st.escrito].classList.add("next");
  }

  function iniciarSilabas() {
    S.pantalla = "silabas";
    hudVisible(true);
    S.silaba = { objetivo: "", escrito: 0, intentos: 0 };
    nuevaSilaba();
  }
  function nuevaSilaba() {
    S.celebrando = false;
    var c = CONS_SIL[(Math.random() * CONS_SIL.length) | 0];
    var v = VOCALES[(Math.random() * VOCALES.length) | 0];
    S.silaba.objetivo = c + v;
    S.silaba.escrito = 0;
    S.silaba.intentos = 0;
    pintarEscritura("Lee y escribe la sílaba:", S.silaba.objetivo, null);
    hablar(S.silaba.objetivo);
  }

  function iniciarPalabras() {
    S.pantalla = "palabras";
    S.grupo = 6; // empieza con las palabras más cortas
    hudVisible(true);
    S.palabra = { objetivo: null, escrito: 0, intentos: 0 };
    nuevaPalabra();
  }
  function nuevaPalabra() {
    S.celebrando = false;
    var pool = PALABRAS.slice(0, Math.min(S.grupo, PALABRAS.length));
    var prev = S.palabra.objetivo && S.palabra.objetivo.w;
    var item;
    do { item = pool[(Math.random() * pool.length) | 0]; } while (pool.length > 1 && item.w === prev);
    S.palabra.objetivo = item;
    S.palabra.escrito = 0;
    S.palabra.intentos = 0;
    pintarEscritura("Escribe la palabra:", item.w, item.e);
    hablar(item.w);
  }

  // Lógica común al escribir letra a letra (sílabas y palabras)
  function escribirLetra(letra) {
    var esSilaba = (S.pantalla === "silabas");
    var st = esSilaba ? S.silaba : S.palabra;
    var objetivo = esSilaba ? st.objetivo : st.objetivo.w;
    var siguiente = objetivo.charAt(st.escrito);

    if (letra === siguiente) {
      st.escrito++;
      st.intentos = 0;
      sfxTick();
      marcarProgreso(st.escrito);
      var chars = app.querySelectorAll("#stage .fila-letras .letter-char");
      animar(chars[st.escrito - 1], "happy", 500);

      if (st.escrito >= objetivo.length) {
        // ¡Completado!
        S.celebrando = true;
        sfxBien();
        confeti(document.getElementById("stage"));
        sumarEstrella();
        hablar("¡" + objetivo + "! ¡Muy bien!");
        if (esSilaba) {
          setTimeout(function () { if (S.pantalla === "silabas") nuevaSilaba(); }, 1600);
        } else {
          if (S.estrellas % 2 === 0 && S.grupo < PALABRAS.length) S.grupo++;
          setTimeout(function () { if (S.pantalla === "palabras") nuevaPalabra(); }, 1600);
        }
      } else {
        resaltarSiguiente();
      }
    } else {
      st.intentos++;
      sfxUps();
      var charsW = app.querySelectorAll("#stage .fila-letras .letter-char");
      animar(charsW[st.escrito], "oops", 400);
      if (st.intentos >= 2) {
        resaltarSiguiente();
        hablar("Busca la " + INFO[siguiente].n);
      }
    }
  }

  /* ------------------------------------------------------------------
     8) ENTRADA DE TECLADO (router por pantalla)
     ------------------------------------------------------------------ */
  function esLetra(k) { return k && k.length === 1 && /[a-zñ]/i.test(k); }

  document.addEventListener("keydown", function (ev) {
    var k = ev.key;
    ctx(); // desbloquea el audio con el primer gesto

    // INTRO: cualquier tecla empieza
    if (S.pantalla === "intro") {
      ev.preventDefault();
      hablar("¡Hola! Vamos a jugar con las letras.");
      pantallaHome();
      return;
    }

    // Esc siempre vuelve al menú (menos en el propio menú)
    if (k === "Escape") {
      if (S.pantalla !== "home") { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); pantallaHome(); }
      return;
    }

    // ---- MENÚ ----
    if (S.pantalla === "home") {
      if (k === "ArrowRight" || k === "ArrowDown") {
        ev.preventDefault();
        S.selMenu = (S.selMenu + 1) % MODOS.length;
        pantallaHome(); hablar(MODOS[S.selMenu].nombre);
      } else if (k === "ArrowLeft" || k === "ArrowUp") {
        ev.preventDefault();
        S.selMenu = (S.selMenu - 1 + MODOS.length) % MODOS.length;
        pantallaHome(); hablar(MODOS[S.selMenu].nombre);
      } else if (k === "Enter" || k === " ") {
        ev.preventDefault();
        abrirModo(MODOS[S.selMenu].id);
      } else if (k >= "1" && k <= "4") {
        var idx = parseInt(k, 10) - 1;
        S.selMenu = idx;
        abrirModo(MODOS[idx].id);
      } else if (k === "v" || k === "V") {
        S.voz = !S.voz; persistir(); pantallaHome();
        if (S.voz) hablar("Voz activada");
      } else if (k === "l" || k === "L") {
        S.minus = !S.minus; persistir(); pantallaHome();
      }
      return;
    }

    // ---- EXPLORAR ----
    if (S.pantalla === "explora") {
      if (esLetra(k)) { ev.preventDefault(); explicaExplora(k.toLowerCase()); }
      return;
    }

    // ---- ENCUENTRA LA LETRA ----
    if (S.pantalla === "busca") {
      if (S.celebrando) {
        if (k === "Enter" || k === " ") { ev.preventDefault(); nuevaBusca(); }
        return;
      }
      if (k === "Enter" || k === " ") { ev.preventDefault(); hablar("Busca la letra " + INFO[S.busca.objetivo].n); return; }
      if (esLetra(k)) {
        ev.preventDefault();
        var L = k.toLowerCase();
        if (L === S.busca.objetivo) aciertoBusca();
        else falloBusca(L);
      }
      return;
    }

    // ---- SÍLABAS / PALABRAS ----
    if (S.pantalla === "silabas" || S.pantalla === "palabras") {
      if (S.celebrando) return; // espera al siguiente automático
      if (k === "Enter" || k === " ") {
        ev.preventDefault();
        hablar(S.pantalla === "silabas" ? S.silaba.objetivo : S.palabra.objetivo.w);
        return;
      }
      if (esLetra(k)) { ev.preventDefault(); escribirLetra(k.toLowerCase()); }
      return;
    }
  });

  /* ------------------------------------------------------------------
     9) ARRANQUE
     ------------------------------------------------------------------ */
  pintarHud();
  pantallaIntro();
})();
