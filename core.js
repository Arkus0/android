/* =====================================================================
   LAS LETRAS VIVAS — CORE (motor)
   ---------------------------------------------------------------------
   Estado + PERFILES por niño (con exportar/importar), persistencia,
   detección de dispositivo (PC vs tablet), audio (voz + sonidos),
   utilidades del DOM y personajes-letra, efectos, HUD y controles
   táctiles (teclado en pantalla).

   Script CLÁSICO. Carga DESPUÉS de data.js y ANTES de modos.js.
   Expone en `LV` todo lo que modos.js necesita. La función central de
   entrada `manejarTecla` y las pantallas viven en modos.js; aquí se la
   invoca como `LV.manejarTecla(...)` (se resuelve en el momento del clic).
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     0) Datos (desde data.js) + derivados
     ------------------------------------------------------------------ */
  var PALETA = LV.PALETA, INFO = LV.INFO, ABECEDARIO = LV.ABECEDARIO,
      ORDEN_ABC = LV.ORDEN_ABC, NIVELES = LV.NIVELES;

  var COLOR = {};
  ORDEN_ABC.forEach(function (L, i) { COLOR[L] = PALETA[i % PALETA.length]; });
  var ORDEN_LETRAS = ORDEN_ABC.slice();

  /* ------------------------------------------------------------------
     1) PERFILES + persistencia
     localStorage "letrasVivas" = { v, activo, perfiles:{ id:{...} } }
     Cada perfil guarda ajustes, estrellas, colección y estadísticas.
     ------------------------------------------------------------------ */
  var CLAVE = "letrasVivas";

  function nuevoId() { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function perfilNuevo(nombre, emoji) {
    return {
      nombre: nombre || "Peque", emoji: emoji || "🦊",
      voz: true, modoVoz: "nombre", minus: true, nivel: 0,
      kbLayout: "qwerty", kbModo: "auto",
      estrellas: 0, desc: [], stats: {}
    };
  }
  // Garantiza que un perfil tenga todos los campos (por si viene de una versión vieja)
  function sanearPerfil(p) {
    var d = perfilNuevo(p && p.nombre, p && p.emoji);
    if (!p || typeof p !== "object") return d;
    d.voz = p.voz !== false;
    d.modoVoz = p.modoVoz === "sonido" ? "sonido" : "nombre";
    d.minus = p.minus !== false;
    d.nivel = typeof p.nivel === "number" ? p.nivel : 0;
    d.kbLayout = p.kbLayout === "abc" ? "abc" : "qwerty";
    d.kbModo = (p.kbModo === "si" || p.kbModo === "no") ? p.kbModo : "auto";
    d.estrellas = p.estrellas | 0;
    d.desc = Array.isArray(p.desc) ? p.desc.slice() : [];
    d.stats = (p.stats && typeof p.stats === "object") ? p.stats : {};
    return d;
  }

  function cargarBD() {
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch (e) {}
    // Formato nuevo (con perfiles)
    if (raw && raw.perfiles && typeof raw.perfiles === "object") {
      var bd = { v: 2, activo: raw.activo, perfiles: {} };
      var ids = Object.keys(raw.perfiles);
      ids.forEach(function (id) { bd.perfiles[id] = sanearPerfil(raw.perfiles[id]); });
      if (!ids.length) { var id0 = nuevoId(); bd.perfiles[id0] = perfilNuevo(); bd.activo = id0; }
      if (!bd.perfiles[bd.activo]) bd.activo = Object.keys(bd.perfiles)[0];
      return bd;
    }
    // Migración del formato plano antiguo → un único perfil "Peque"
    var p = sanearPerfil(raw);
    var id = nuevoId(), bd2 = { v: 2, activo: id, perfiles: {} };
    bd2.perfiles[id] = p;
    return bd2;
  }

  var BD = cargarBD();

  function guardarBD() { try { localStorage.setItem(CLAVE, JSON.stringify(BD)); } catch (e) {} }
  function perfilActivo() { return BD.perfiles[BD.activo]; }
  function activoId() { return BD.activo; }

  /* Estado en memoria (S) — espejo del perfil activo + sub-estados de cada modo */
  var S = {
    pantalla: "intro",
    voz: true, modoVoz: "nombre", minus: true, nivel: 0,
    kbLayout: "qwerty", kbModo: "auto",
    estrellas: 0, desc: new Set(), stats: {},
    selMenu: 0, celebrando: false,
    busca: null, grupo: 5,
    esc: null, falta: null, frase: null, gal: null, cuento: null, cuentoPrev: -1,
    // sub-estados de los juegos de pulsar
    toca: null, empieza: null, caza: null, parejas: null, perfilUI: null
  };

  // Copia el perfil activo a S (al arrancar y al cambiar de niño)
  function aplicarPerfil() {
    var p = perfilActivo();
    S.voz = p.voz; S.modoVoz = p.modoVoz; S.minus = p.minus; S.nivel = p.nivel;
    S.kbLayout = p.kbLayout; S.kbModo = p.kbModo;
    S.estrellas = p.estrellas; S.desc = new Set(p.desc);
    S.stats = p.stats || {};
  }
  aplicarPerfil();

  // Vuelca S al perfil activo y guarda
  function persistir() {
    var p = perfilActivo();
    p.voz = S.voz; p.modoVoz = S.modoVoz; p.minus = S.minus; p.nivel = S.nivel;
    p.kbLayout = S.kbLayout; p.kbModo = S.kbModo;
    p.estrellas = S.estrellas; p.desc = Array.from(S.desc); p.stats = S.stats;
    guardarBD();
  }

  // --- Gestión de perfiles (la UI vive en modos.js) ---
  function listarPerfiles() {
    return Object.keys(BD.perfiles).map(function (id) {
      var p = BD.perfiles[id];
      return { id: id, nombre: p.nombre, emoji: p.emoji, estrellas: p.estrellas, desc: p.desc.length };
    });
  }
  function crearPerfil(nombre, emoji) {
    var id = nuevoId();
    BD.perfiles[id] = perfilNuevo(nombre, emoji);
    BD.activo = id; aplicarPerfil(); guardarBD(); pintarHud();
    return id;
  }
  function cambiarPerfil(id) {
    if (!BD.perfiles[id]) return;
    BD.activo = id; aplicarPerfil(); guardarBD(); pintarHud();
  }
  function renombrarPerfil(id, nombre, emoji) {
    var p = BD.perfiles[id]; if (!p) return;
    if (nombre != null) p.nombre = nombre;
    if (emoji != null) p.emoji = emoji;
    guardarBD();
  }
  function borrarPerfil(id) {
    if (!BD.perfiles[id]) return false;
    if (Object.keys(BD.perfiles).length <= 1) return false; // nunca quedarse sin perfiles
    delete BD.perfiles[id];
    if (BD.activo === id) { BD.activo = Object.keys(BD.perfiles)[0]; aplicarPerfil(); }
    guardarBD(); pintarHud(); return true;
  }
  // Exportar: copia de seguridad de TODOS los perfiles (texto JSON)
  function exportarTexto() { return JSON.stringify(BD, null, 2); }
  // Importar: fusiona los perfiles del JSON en la base actual (no borra los que ya hay)
  function importarTexto(texto) {
    var datos;
    try { datos = JSON.parse(texto); } catch (e) { return 0; }
    if (!datos || !datos.perfiles || typeof datos.perfiles !== "object") return 0;
    var n = 0;
    Object.keys(datos.perfiles).forEach(function (id) {
      var destino = BD.perfiles[id] ? nuevoId() : id; // evita pisar uno existente
      BD.perfiles[destino] = sanearPerfil(datos.perfiles[id]);
      n++;
    });
    guardarBD(); return n;
  }

  // Registrar acierto/fallo por letra (alimenta el resumen para padres)
  function registrar(letra, ok) {
    if (!INFO[letra]) return;
    var st = S.stats[letra] || (S.stats[letra] = { ok: 0, fail: 0 });
    if (ok) st.ok++; else st.fail++;
  }

  /* ------------------------------------------------------------------
     2) DETECCIÓN DE DISPOSITIVO (PC vs tablet)
     En PC NO se muestra el teclado en pantalla (se usa el físico).
     En tablet SÍ. Se puede forzar con el ajuste kbModo (auto/si/no).
     ------------------------------------------------------------------ */
  function mq(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
  function esTactil() { return ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0; }
  function tabletProbable() {
    if (mq("(pointer: coarse)") && !mq("(pointer: fine)")) return true;
    if (mq("(pointer: fine)")) return false;
    return esTactil();
  }
  // ¿Hay que pintar el teclado en pantalla?
  function tecladoEnPantalla() {
    if (S.kbModo === "si") return true;
    if (S.kbModo === "no") return false;
    return tabletProbable();
  }

  /* ------------------------------------------------------------------
     3) AUDIO (voz + sonidos)
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
  function cancelarVoz() { try { window.speechSynthesis.cancel(); } catch (e) {} }
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
  function sfxPop()      { nota(660,0,0.08,"triangle",0.16); nota(990,0.06,0.1,"triangle",0.16); }

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
  // Baraja una copia del array (Fisher–Yates)
  function barajar(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

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
     6) HUD (botones táctiles: volver y pantalla completa)
     ------------------------------------------------------------------ */
  var hud = el("div", "hud");
  var hudVolver = el("div", "boton-hud", "⬅️");
  var hudFull = el("div", "boton-hud", "⛶");
  var hudInfo = el("div", "estrellas", "");
  var hIzq = el("div", "hud-lado"), hDer = el("div", "hud-lado");
  hIzq.appendChild(hudVolver);
  hDer.appendChild(hudFull); hDer.appendChild(hudInfo);
  hud.appendChild(hIzq); hud.appendChild(hDer);
  tap(hudVolver, function () { LV.manejarTecla("Escape"); });
  tap(hudFull, function () { pantallaCompleta(); });
  function pintarHud() {
    var p = perfilActivo();
    hudInfo.textContent = (p ? p.emoji + " " : "") + "⭐ " + S.estrellas + "  📚 " + S.desc.size + "/" + ABECEDARIO.length;
  }
  // El HUD está siempre (para el botón ⛶). El botón volver y las estrellas
  // solo se muestran dentro de un juego (v = true).
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
    tap(b, function () { LV.manejarTecla(key); });
    return b;
  }
  function teclado() {
    var filas = (S.kbLayout === "abc") ? LV.LAYOUT_ABC : LV.LAYOUT_QWERTY;
    var wrap = el("div", "teclado");
    filas.forEach(function (fila) {
      var r = el("div", "kfila");
      fila.split("").forEach(function (L) {
        var b = el("button", "ktecla", mostrar(L));
        b.style.setProperty("--c", COLOR[L] || "#4363d8");
        tap(b, (function (L) { return function () { LV.manejarTecla(L); }; })(L));
        r.appendChild(b);
      });
      wrap.appendChild(r);
    });
    return wrap;
  }
  // tipo: none | teclado | galeria | frases
  // El teclado de letras solo se pinta si el dispositivo lo necesita (tablet)
  // o si el ajuste lo fuerza. Las barras de botones (flechas, repetir…) sí
  // se muestran siempre porque son pequeñas y útiles también con ratón.
  function pintarControles(tipo) {
    limpiar(controles);
    document.body.classList.remove("con-teclado");
    if (tipo === "none") { controles.style.display = "none"; return; }

    var conTeclado = (tipo === "teclado" || tipo === "galeria") && tecladoEnPantalla();
    var barra = el("div", "barra"), hayBarra = true;

    if (tipo === "galeria") {
      barra.appendChild(bctrl("◀", "ArrowLeft"));
      barra.appendChild(bctrl("🔊", "Enter"));
      barra.appendChild(bctrl("▶", "ArrowRight"));
    } else if (tipo === "frases") {
      barra.appendChild(bctrl("🔊 Repetir", "Enter"));
      barra.appendChild(bctrl("Siguiente ▶", " ", "grande"));
    } else { // teclado
      barra.appendChild(bctrl("🔊 Repetir", "Enter"));
    }

    controles.style.display = "flex";
    controles.appendChild(barra);
    if (conTeclado) { controles.appendChild(teclado()); document.body.classList.add("con-teclado"); }
    if (!hayBarra && !conTeclado) controles.style.display = "none";
  }

  /* ------------------------------------------------------------------
     8) Service Worker (PWA) — solo bajo http/https, nunca en file://
     ------------------------------------------------------------------ */
  function registrarSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "http:" && location.protocol !== "https:") return;
    try { navigator.serviceWorker.register("sw.js"); } catch (e) {}
  }

  /* ------------------------------------------------------------------
     9) EXPONER en LV para modos.js
     ------------------------------------------------------------------ */
  LV.S = S;
  LV.COLOR = COLOR; LV.ORDEN_LETRAS = ORDEN_LETRAS;
  LV.app = app; LV.fx = fx; LV.controles = controles;
  // perfiles
  LV.persistir = persistir; LV.perfilActivo = perfilActivo; LV.activoId = activoId; LV.listarPerfiles = listarPerfiles;
  LV.crearPerfil = crearPerfil; LV.cambiarPerfil = cambiarPerfil; LV.renombrarPerfil = renombrarPerfil;
  LV.borrarPerfil = borrarPerfil; LV.exportarTexto = exportarTexto; LV.importarTexto = importarTexto;
  LV.registrar = registrar;
  // dispositivo
  LV.tabletProbable = tabletProbable; LV.tecladoEnPantalla = tecladoEnPantalla;
  // audio
  LV.hablar = hablar; LV.cancelarVoz = cancelarVoz; LV.decirLetra = decirLetra; LV.pedirLetra = pedirLetra; LV.ctx = ctx;
  LV.sfxBien = sfxBien; LV.sfxTick = sfxTick; LV.sfxUps = sfxUps; LV.sfxFanfarria = sfxFanfarria; LV.sfxPop = sfxPop;
  // dom
  LV.el = el; LV.limpiar = limpiar; LV.mostrar = mostrar; LV.azar = azar; LV.barajar = barajar; LV.tap = tap;
  LV.personaje = personaje; LV.ranura = ranura; LV.revelar = revelar; LV.animar = animar; LV.tam = tam;
  // efectos
  LV.confeti = confeti; LV.cartel = cartel; LV.sumarEstrella = sumarEstrella; LV.descubrir = descubrir;
  // hud / controles
  LV.pintarHud = pintarHud; LV.hudVisible = hudVisible; LV.pantallaCompleta = pantallaCompleta; LV.pintarControles = pintarControles;
  // pwa
  LV.registrarSW = registrarSW;
})();
