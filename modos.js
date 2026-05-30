/* =====================================================================
   LAS LETRAS VIVAS — MODOS (pantallas y juego)
   ---------------------------------------------------------------------
   Menú, perfiles (pantalla), los modos de juego y la entrada unificada
   (teclado físico + táctil) a través de manejarTecla().

   Script CLÁSICO. Carga DESPUÉS de data.js y core.js. Toma del núcleo (LV)
   las utilidades que necesita.
   ===================================================================== */
(function () {
  "use strict";

  /* ---- atajos a lo que expone el núcleo (core.js) y los datos (data.js) ---- */
  var S = LV.S, INFO = LV.INFO, COLOR = LV.COLOR, ABECEDARIO = LV.ABECEDARIO,
      ORDEN_LETRAS = LV.ORDEN_LETRAS, VOCALES = LV.VOCALES, CONS_SIL = LV.CONS_SIL,
      TRABADAS = LV.TRABADAS, NIVELES = LV.NIVELES, PALABRAS = LV.PALABRAS,
      FRASES = LV.FRASES, CUENTOS = LV.CUENTOS, AVATARES = LV.AVATARES;
  var app = LV.app, fx = LV.fx;
  var el = LV.el, limpiar = LV.limpiar, mostrar = LV.mostrar, azar = LV.azar, barajar = LV.barajar,
      tap = LV.tap, personaje = LV.personaje, ranura = LV.ranura, revelar = LV.revelar, animar = LV.animar;
  var hablar = LV.hablar, cancelarVoz = LV.cancelarVoz, decirLetra = LV.decirLetra, pedirLetra = LV.pedirLetra;
  var sfxBien = LV.sfxBien, sfxTick = LV.sfxTick, sfxUps = LV.sfxUps, sfxFanfarria = LV.sfxFanfarria, sfxPop = LV.sfxPop;
  var confeti = LV.confeti, cartel = LV.cartel, sumarEstrella = LV.sumarEstrella, descubrir = LV.descubrir, registrar = LV.registrar;
  var pintarHud = LV.pintarHud, hudVisible = LV.hudVisible, pantallaCompleta = LV.pantallaCompleta, pintarControles = LV.pintarControles;
  var persistir = LV.persistir, ctx = LV.ctx, PALETA = LV.PALETA;

  /* ------------------------------------------------------------------
     MENÚ: lista de modos. Los juegos de PULSAR (sin teclear) van primero
     porque son los que más enganchan. card.dataset.modo identifica cada uno.
     ------------------------------------------------------------------ */
  var MODOS = [
    { id:"explora",  icono:"🅰️",  nombre:"Explorar",          voz:"Explorar. Pulsa cualquier letra y mira lo que pasa." },
    { id:"toca",     icono:"🖐️",  nombre:"Toca y descubre",    voz:"Toca y descubre. Toca un dibujo y aparece su palabra." },
    { id:"empieza",  icono:"🔤",  nombre:"¿Empieza por…?",     voz:"¿Cuál empieza por la letra? Toca el dibujo correcto." },
    { id:"caza",     icono:"⚡",   nombre:"Caza la letra",      voz:"Caza la letra. Toca la letra que te pido, rápido." },
    { id:"parejas",  icono:"🃏",  nombre:"Parejas",            voz:"Parejas. Encuentra la letra y su dibujo." },
    { id:"galeria",  icono:"📚",  nombre:"Conoce las letras",  voz:"Conoce las letras. Usa las flechas para verlas todas." },
    { id:"busca",    icono:"🔎",  nombre:"Encuentra la letra", voz:"Encuentra la letra que aparece." },
    { id:"silabas",  icono:"🧩",  nombre:"Sílabas",            voz:"Sílabas. Lee y escribe la sílaba." },
    { id:"palabras", icono:"📖",  nombre:"Palabras",           voz:"Palabras. Escribe la palabra." },
    { id:"falta",    icono:"🕵️",  nombre:"Letra que falta",    voz:"Letra que falta. ¿Qué letra falta en la palabra?" },
    { id:"dictado",  icono:"👂",  nombre:"Escucha y escribe",  voz:"Escucha y escribe. Escribe la palabra que oigas." },
    { id:"frases",   icono:"💬",  nombre:"Frases",             voz:"Frases. Lee una frase, palabra a palabra." },
    { id:"cuentos",  icono:"📕",  nombre:"Cuentos",            voz:"Cuentos. Lee un cuento entero, palabra a palabra." }
  ];

  var INICIAR = {}; // id -> función de arranque (se rellena más abajo)

  function abrirModo(id) {
    var m = MODOS.filter(function (x) { return x.id === id; })[0];
    if (m) hablar(m.voz);
    (INICIAR[id] || function () {})();
  }

  /* ------------------------------------------------------------------
     INTRO / HOME / PERFIL
     ------------------------------------------------------------------ */
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
      card.dataset.modo = m.id;
      if (i < 9) card.appendChild(el("div", "num", String(i + 1)));
      card.appendChild(el("div", "icono", m.icono));
      card.appendChild(el("div", "nombre", m.nombre));
      tap(card, (function (id, ix) { return function () { S.selMenu = ix; abrirModo(id); }; })(m.id, i));
      cont.appendChild(card);
    });
    app.appendChild(cont);

    function badge(txt, key, cls) { var b = el("div", "badge" + (cls ? " " + cls : ""), txt); if (key) tap(b, function () { manejarTecla(key); }); return b; }
    var p = LV.perfilActivo();
    var ajustes = el("div", "ajustes");
    ajustes.appendChild(badge("👤 " + (p ? p.emoji + " " + p.nombre : "Perfil"), "p", "perfil-badge"));
    ajustes.appendChild(badge("🔊 Voz: " + (S.voz ? "Sí" : "No"), "v"));
    ajustes.appendChild(badge("🗣️ Dice: " + (S.modoVoz === "sonido" ? "Sonido" : "Nombre"), "f"));
    ajustes.appendChild(badge("🔤 " + (S.minus ? "abc" : "ABC"), "l"));
    ajustes.appendChild(badge("📊 Nivel: " + NIVELES[S.nivel], "n"));
    ajustes.appendChild(badge("⌨️ " + (S.kbLayout === "abc" ? "ABC" : "QWERTY"), "t"));
    ajustes.appendChild(badge("📱 Teclado: " + kbModoTxt(), "k"));
    ajustes.appendChild(badge("⭐ " + S.estrellas + " · 📚 " + S.desc.size + "/" + ABECEDARIO.length));
    app.appendChild(ajustes);

    app.appendChild(el("p", "ayuda-controles",
      "Toca una tarjeta para jugar · teclas 1-9 · ajustes: P V F L N T K"));
  }
  function kbModoTxt() { return S.kbModo === "si" ? "Siempre" : (S.kbModo === "no" ? "Nunca" : "Auto"); }

  /* ---------- PERFILES (quién juega) ---------- */
  function pantallaPerfil() {
    S.pantalla = "perfil"; hudVisible(false); pintarControles("none"); limpiar(app);
    S.perfilUI = S.perfilUI || { creando: false, avatar: AVATARES[0] };
    app.appendChild(el("h1", "titulo", "👤 ¿Quién juega?"));

    var lista = el("div", "cards perfiles");
    LV.listarPerfiles().forEach(function (pf) {
      var card = el("div", "card perfil-card");
      if (pf.id === LV.activoId()) card.classList.add("sel");
      card.dataset.perfil = pf.id;
      card.appendChild(el("div", "icono", pf.emoji));
      card.appendChild(el("div", "nombre", pf.nombre));
      card.appendChild(el("div", "num-mini", "⭐ " + pf.estrellas + " · 📚 " + pf.desc));
      tap(card, (function (id) { return function () { LV.cambiarPerfil(id); hablar("Hola " + LV.perfilActivo().nombre); pantallaHome(); }; })(pf.id));
      lista.appendChild(card);
    });
    app.appendChild(lista);

    // Formulario para crear / renombrar
    var form = el("div", "perfil-form");
    var input = el("input", "perfil-nombre"); input.type = "text"; input.maxLength = 12;
    input.placeholder = "Nombre del niño/a"; input.value = "";
    form.appendChild(input);
    var avatares = el("div", "avatares");
    AVATARES.forEach(function (em) {
      var b = el("button", "avatar-op" + (em === S.perfilUI.avatar ? " sel" : ""), em);
      tap(b, function () { S.perfilUI.avatar = em; refrescarAvatares(avatares); });
      avatares.appendChild(b);
    });
    form.appendChild(avatares);

    var acciones = el("div", "barra");
    var bCrear = el("button", "bcontrol grande", "➕ Crear niño/a");
    tap(bCrear, function () {
      var nombre = (input.value || "").trim() || "Peque";
      LV.crearPerfil(nombre, S.perfilUI.avatar);
      hablar("¡Hola " + nombre + "!"); pantallaHome();
    });
    acciones.appendChild(bCrear);
    var bRen = el("button", "bcontrol", "✏️ Renombrar actual");
    tap(bRen, function () {
      var nombre = (input.value || "").trim();
      LV.renombrarPerfil(LV.activoId(), nombre || null, S.perfilUI.avatar);
      pintarHud(); pantallaPerfil();
    });
    acciones.appendChild(bRen);
    form.appendChild(acciones);

    var acciones2 = el("div", "barra");
    var bExp = el("button", "bcontrol", "💾 Guardar copia");
    tap(bExp, function () { descargar("letras-vivas-perfiles.json", LV.exportarTexto()); cartel("💾 Copia descargada"); });
    acciones2.appendChild(bExp);
    var bImp = el("button", "bcontrol", "📂 Cargar copia");
    tap(bImp, function () { importarDesdeArchivo(); });
    acciones2.appendChild(bImp);
    if (LV.listarPerfiles().length > 1) {
      var bDel = el("button", "bcontrol borrar", "🗑️ Borrar actual");
      tap(bDel, function () {
        if (LV.borrarPerfil(LV.activoId())) { cartel("Perfil borrado"); pantallaPerfil(); }
      });
      acciones2.appendChild(bDel);
    }
    form.appendChild(acciones2);
    app.appendChild(form);

    app.appendChild(el("p", "ayuda-controles", "Toca un niño para jugar · Esc/⬅️ para volver · 💾 guarda y 📂 recupera el progreso"));
  }
  function refrescarAvatares(cont) {
    [].forEach.call(cont.children, function (b) {
      if (b.textContent === S.perfilUI.avatar) b.classList.add("sel"); else b.classList.remove("sel");
    });
  }
  function descargar(nombre, texto) {
    try {
      var blob = new Blob([texto], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = el("a"); a.href = url; a.download = nombre;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 600);
    } catch (e) { cartel("No se pudo descargar"); }
  }
  function importarDesdeArchivo() {
    var inp = el("input"); inp.type = "file"; inp.accept = "application/json,.json";
    inp.style.display = "none"; document.body.appendChild(inp);
    inp.addEventListener("change", function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var n = LV.importarTexto(String(rd.result));
        cartel(n ? ("✅ " + n + " perfil(es)") : "Archivo no válido");
        if (inp.parentNode) inp.parentNode.removeChild(inp);
        pantallaPerfil();
      };
      rd.readAsText(f);
    });
    inp.click();
  }

  /* ------------------------------------------------------------------
     MODO 1: EXPLORAR
     ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     MODO 2 (NUEVO): TOCA Y DESCUBRE
     Tablero de dibujos; al tocar uno dice su palabra y la muestra con
     letras-personaje. Sin teclear. Al tocarlos todos, ⭐ y tablero nuevo.
     ------------------------------------------------------------------ */
  function poolPalabras() { return PALABRAS.filter(function (p) { return p.d <= S.nivel; }); }

  function iniciarToca() { S.pantalla = "toca"; hudVisible(true); pintarControles("none"); nuevaToca(); }
  function nuevaToca() {
    S.celebrando = false; limpiar(app);
    app.appendChild(el("p", "prompt", "¡Toca un dibujo y aparece su palabra!"));
    var stage = el("div", "stage toca-stage"); stage.id = "stage";
    var banner = el("div", "toca-banner"); banner.id = "toca-banner"; stage.appendChild(banner);
    var pool = poolPalabras();
    var nmax = Math.min(pool.length, S.nivel >= 2 ? 8 : 6);
    var items = barajar(pool).slice(0, nmax);
    S.toca = { restantes: items.length };
    var grid = el("div", "grid-toca");
    items.forEach(function (item) {
      var tile = el("button", "emoji-tile");
      tile.appendChild(el("span", "emoji-grande", item.e));
      tap(tile, (function (item, tile) { return function () { revelarToca(item, tile); }; })(item, tile));
      grid.appendChild(tile);
    });
    stage.appendChild(grid); app.appendChild(stage);
  }
  function revelarToca(item, tile) {
    var em = tile.querySelector(".emoji-grande");
    animar(em, "pop", 700); sfxPop();
    var banner = document.getElementById("toca-banner"); limpiar(banner);
    var fila = el("div", "fila-letras");
    item.w.split("").forEach(function (L) { fila.appendChild(personaje(L, 5, false)); });
    banner.appendChild(fila);
    hablar(item.w); descubrir(item.w.charAt(0));
    if (!tile.classList.contains("tocado")) {
      tile.classList.add("tocado");
      S.toca.restantes--;
      if (S.toca.restantes <= 0 && !S.celebrando) {
        S.celebrando = true; sfxBien(); confeti(document.getElementById("stage")); sumarEstrella();
        cartel("🌟 ¡Muy bien!");
        setTimeout(function () { if (S.pantalla === "toca") nuevaToca(); }, 1600);
      }
    }
  }

  /* ------------------------------------------------------------------
     MODO 3 (NUEVO): ¿CUÁL EMPIEZA POR…?
     Una letra grande + varios dibujos; toca el que empieza por esa letra.
     ------------------------------------------------------------------ */
  function iniciarEmpieza() { S.pantalla = "empieza"; S.grupo = 5; hudVisible(true); pintarControles("none"); S.empieza = { objetivo: null, intentos: 0 }; nuevaEmpieza(); }
  function nuevaEmpieza() {
    S.celebrando = false; limpiar(app);
    var conEmoji = function (L) { return INFO[L] && INFO[L].e; };
    var pool = ORDEN_LETRAS.slice(0, S.grupo).filter(conEmoji);
    if (!pool.length) pool = ABECEDARIO.filter(conEmoji);
    var L = azar(pool);
    var nOpc = S.nivel >= 2 ? 4 : 3;
    var otras = barajar(ABECEDARIO.filter(function (x) { return x !== L && conEmoji(x); })).slice(0, nOpc - 1);
    var opciones = barajar(otras.concat([L]));
    S.empieza = { objetivo: L, intentos: 0 };
    app.appendChild(el("p", "prompt", "¿Cuál empieza por…"));
    var stage = el("div", "stage"); stage.id = "stage";
    var fila = el("div", "fila-letras"); fila.appendChild(personaje(L, 8, false)); stage.appendChild(fila);
    app.appendChild(stage);
    var grid = el("div", "grid-opciones");
    opciones.forEach(function (op) {
      var tile = el("button", "emoji-tile"); tile.dataset.letra = op;
      tile.appendChild(el("span", "emoji-grande", INFO[op].e));
      tap(tile, (function (op, tile) { return function () { elegirEmpieza(op, tile); }; })(op, tile));
      grid.appendChild(tile);
    });
    app.appendChild(grid);
    hablar("¿Cuál empieza por la " + INFO[L].n + "?");
  }
  function elegirEmpieza(op, tile) {
    if (S.celebrando) return;
    var L = S.empieza.objetivo;
    if (op === L) {
      S.celebrando = true; registrar(L, true);
      animar(tile, "happy", 700); confeti(tile); sfxBien(); sumarEstrella(); descubrir(L);
      tile.classList.add("acierto");
      hablar("¡Sí! " + INFO[L].p + " empieza por " + INFO[L].n);
      if (S.estrellas % 3 === 0 && S.grupo < ORDEN_LETRAS.length) S.grupo++;
      setTimeout(function () { if (S.pantalla === "empieza") nuevaEmpieza(); }, 1700);
    } else {
      S.empieza.intentos++; registrar(L, false); sfxUps(); animar(tile, "oops", 400);
      if (S.empieza.intentos >= 2) hablar("Escucha: " + INFO[L].p + " empieza por " + INFO[L].n);
    }
  }

  /* ------------------------------------------------------------------
     MODO 4 (NUEVO): CAZA LA LETRA
     Varias letras-personaje en pantalla; toca la que te piden. Sin teclado.
     ------------------------------------------------------------------ */
  function iniciarCaza() { S.pantalla = "caza"; S.grupo = 5; hudVisible(true); pintarControles("none"); S.caza = { objetivo: null, intentos: 0 }; nuevaCaza(); }
  function nCaza() { return Math.min(ORDEN_LETRAS.length, S.nivel >= 2 ? 9 : (S.nivel >= 1 ? 7 : 5)); }
  function nuevaCaza() {
    S.celebrando = false; limpiar(app);
    var n = Math.max(S.grupo, nCaza());
    var pool = ORDEN_LETRAS.slice(0, n);
    var objetivo = azar(pool);
    var resto = barajar(pool.filter(function (L) { return L !== objetivo; }));
    var letras = [objetivo].concat(resto.slice(0, nCaza() - 1));
    letras = barajar(letras);
    S.caza = { objetivo: objetivo, intentos: 0 };
    app.appendChild(el("p", "prompt", "¡Caza la letra!"));
    var top = el("div", "caza-objetivo"); top.appendChild(personaje(objetivo, 5, false)); app.appendChild(top);
    var stage = el("div", "stage caza-campo"); stage.id = "stage";
    var grid = el("div", "grid-caza");
    letras.forEach(function (L) {
      var cont = el("div", "caza-tile"); cont.dataset.letra = L;
      cont.appendChild(personaje(L, 4, false));
      tap(cont, (function (L, cont) { return function () { cazar(L, cont); }; })(L, cont));
      grid.appendChild(cont);
    });
    stage.appendChild(grid); app.appendChild(stage);
    pedirLetra(objetivo);
  }
  function cazar(L, cont) {
    if (S.celebrando) return;
    var obj = S.caza.objetivo;
    if (L === obj) {
      S.celebrando = true; registrar(L, true);
      animar(cont.querySelector(".letter-char"), "happy", 700); confeti(cont); sfxBien(); sumarEstrella(); descubrir(L);
      hablar("¡Muy bien! La " + INFO[obj].n);
      if (S.estrellas % 3 === 0 && S.grupo < ORDEN_LETRAS.length) S.grupo++;
      setTimeout(function () { if (S.pantalla === "caza") nuevaCaza(); }, 1300);
    } else {
      S.caza.intentos++; registrar(obj, false); sfxUps(); animar(cont.querySelector(".letter-char"), "oops", 400);
      if (S.caza.intentos >= 2) pedirLetra(obj);
    }
  }
  function cazaPorTecla(L) {
    if (S.celebrando) return;
    var grid = document.querySelector(".grid-caza"); if (!grid) return;
    var cont = grid.querySelector('.caza-tile[data-letra="' + L + '"]');
    if (cont) cazar(L, cont); else { sfxUps(); }
  }

  /* ------------------------------------------------------------------
     MODO 5 (NUEVO): PAREJAS (memory)
     Encuentra la pareja letra ↔ dibujo. Solo a base de toques.
     ------------------------------------------------------------------ */
  function iniciarParejas() { S.pantalla = "parejas"; hudVisible(true); pintarControles("none"); nuevaParejas(); }
  function nuevaParejas() {
    S.celebrando = false; limpiar(app);
    var nPares = S.nivel >= 2 ? 6 : (S.nivel >= 1 ? 5 : 4);
    var letras = barajar(ORDEN_LETRAS.filter(function (L) { return INFO[L] && INFO[L].e; })).slice(0, nPares);
    var cartas = [];
    letras.forEach(function (L) { cartas.push({ letra: L, tipo: "letra" }); cartas.push({ letra: L, tipo: "emoji" }); });
    cartas = barajar(cartas);
    S.parejas = { cartas: cartas, primera: null, bloqueo: false, encontradas: 0, total: letras.length };
    app.appendChild(el("p", "prompt", "Encuentra la letra y su dibujo"));
    var stage = el("div", "stage"); stage.id = "stage";
    var grid = el("div", "grid-parejas"); grid.id = "grid-parejas";
    grid.style.setProperty("--cols", cartas.length <= 8 ? 4 : (cartas.length <= 10 ? 5 : 6));
    cartas.forEach(function (c, i) {
      var carta = el("button", "carta"); carta.dataset.idx = i; carta.dataset.letra = c.letra;
      carta.appendChild(el("span", "carta-dorso", "❓"));
      tap(carta, (function (i) { return function () { voltearCarta(i); }; })(i));
      grid.appendChild(carta);
    });
    stage.appendChild(grid); app.appendChild(stage);
    hablar("Encuentra las parejas.");
  }
  function caraCarta(carta, c) {
    limpiar(carta); carta.classList.add("abierta");
    if (c.tipo === "letra") carta.appendChild(personaje(c.letra, 3, false));
    else carta.appendChild(el("span", "emoji-grande", INFO[c.letra].e));
  }
  function taparCarta(carta) {
    limpiar(carta); carta.classList.remove("abierta");
    carta.appendChild(el("span", "carta-dorso", "❓"));
  }
  function voltearCarta(i) {
    var P = S.parejas; if (!P || P.bloqueo) return;
    var grid = document.getElementById("grid-parejas"); if (!grid) return;
    var carta = grid.querySelector('.carta[data-idx="' + i + '"]'); if (!carta) return;
    if (carta.classList.contains("abierta") || carta.classList.contains("hecha")) return;
    var c = P.cartas[i];
    caraCarta(carta, c); sfxTick();
    if (c.tipo === "letra") decirLetra(c.letra); else hablar(INFO[c.letra].p);
    if (!P.primera) { P.primera = { idx: i, carta: carta, c: c }; return; }
    var a = P.primera, b = { idx: i, carta: carta, c: c }; P.primera = null;
    if (a.c.letra === b.c.letra && a.idx !== b.idx) {
      P.bloqueo = true;
      setTimeout(function () {
        a.carta.classList.add("hecha"); b.carta.classList.add("hecha");
        confeti(b.carta); sfxBien(); registrar(a.c.letra, true); descubrir(a.c.letra);
        P.encontradas++; P.bloqueo = false;
        if (P.encontradas >= P.total) parejasCompletas();
      }, 500);
    } else {
      P.bloqueo = true;
      setTimeout(function () { taparCarta(a.carta); taparCarta(b.carta); sfxUps(); P.bloqueo = false; }, 900);
    }
  }
  function parejasCompletas() {
    S.celebrando = true; sumarEstrella(); confeti(null, 40); sfxFanfarria(); cartel("🎉 ¡Todas las parejas!");
    hablar("¡Genial! Encontraste todas las parejas.");
    setTimeout(function () { if (S.pantalla === "parejas") nuevaParejas(); }, 2200);
  }

  /* ------------------------------------------------------------------
     CONOCE LAS LETRAS (galería)
     ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     ENCUENTRA LA LETRA
     ------------------------------------------------------------------ */
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
    var t = S.busca.objetivo; registrar(t, true); descubrir(t);
    hablar("¡Muy bien! La " + INFO[t].n + ", de " + INFO[t].p);
    if (S.estrellas % 3 === 0 && S.grupo < ORDEN_LETRAS.length) S.grupo++;
    setTimeout(function () { if (S.pantalla === "busca") nuevaBusca(); }, 1500);
  }
  function falloBusca(letra) {
    S.busca.intentos++; sfxUps(); registrar(S.busca.objetivo, false);
    var mini = personaje(letra, 3, false);
    mini.classList.add("oops");
    mini.style.position = "fixed"; mini.style.left = (40 + Math.random() * 20) + "%"; mini.style.top = "40%";
    fx.appendChild(mini);
    setTimeout(function () { if (mini.parentNode) mini.parentNode.removeChild(mini); }, 700);
    if (S.busca.intentos >= 2) { animar(document.querySelector("#stage .letter-char"), "happy", 700); pedirLetra(S.busca.objetivo); }
  }

  /* ------------------------------------------------------------------
     ESCRIBIR EN ORDEN: sílabas / palabras / dictado
     ------------------------------------------------------------------ */
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
      st.escrito++; st.intentos = 0; sfxTick(); registrar(sig, true);
      var c = chars[st.escrito - 1];
      if (st.oculto) revelar(c, false); else { c.classList.add("done"); animar(c, "happy", 500); }
      if (st.escrito >= st.objetivo.length) completarEscritura();
      else resaltarSiguiente();
    } else {
      st.intentos++; sfxUps(); registrar(sig, false);
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

  /* ------------------------------------------------------------------
     LETRA QUE FALTA
     ------------------------------------------------------------------ */
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
      sfxTick(); revelar(chars[pos], false); registrar(objetivo, true); descubrir(objetivo);
      S.falta.idx++; S.falta.intentos = 0;
      if (S.falta.idx >= S.falta.blanks.length) {
        S.celebrando = true; sfxBien(); confeti(document.getElementById("stage")); sumarEstrella();
        hablar("¡" + S.falta.word + "! ¡Muy bien!");
        setTimeout(function () { if (S.pantalla === "falta") nuevaFalta(); }, 1600);
      } else marcarFalta();
    } else {
      S.falta.intentos++; sfxUps(); registrar(objetivo, false); animar(chars[pos], "oops", 400);
      if (S.falta.intentos >= 2) hablar("Es la " + INFO[objetivo].n);
    }
  }

  /* ------------------------------------------------------------------
     FRASES
     ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------
     CUENTOS (se teclea cada palabra para avanzar)
     ------------------------------------------------------------------ */
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
      c.escrito++; c.intentos = 0; sfxTick(); registrar(sig, true);
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
      c.intentos++; sfxUps(); registrar(sig, false); animar(chars[c.escrito], "oops", 400);
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

  /* Registrar todas las funciones de arranque */
  INICIAR = {
    explora: iniciarExplora, toca: iniciarToca, empieza: iniciarEmpieza, caza: iniciarCaza,
    parejas: iniciarParejas, galeria: iniciarGaleria, busca: iniciarBusca, silabas: iniciarSilabas,
    palabras: iniciarPalabras, falta: iniciarFalta, dictado: iniciarDictado, frases: iniciarFrases,
    cuentos: iniciarCuentos
  };

  /* ------------------------------------------------------------------
     ENTRADA (teclado físico + táctil unificados)
     ------------------------------------------------------------------ */
  function esLetra(k) { return k && k.length === 1 && /[a-zñ]/i.test(k); }

  function manejarTecla(k) {
    ctx();
    if (S.pantalla === "intro") { hablar("¡Hola! Vamos a jugar con las letras."); pantallaHome(); return; }
    if (k === "Escape") {
      if (S.pantalla === "perfil") { pantallaHome(); return; }
      if (S.pantalla !== "home") { cancelarVoz(); pantallaHome(); }
      return;
    }

    if (S.pantalla === "home") { teclaHome(k); return; }
    if (S.pantalla === "perfil") { return; } // se maneja todo por toque
    if (S.pantalla === "explora") { if (esLetra(k)) explicaExplora(k.toLowerCase()); return; }

    if (S.pantalla === "toca") { if (k === "Enter" || k === " ") nuevaToca(); return; }
    if (S.pantalla === "empieza") {
      if (S.celebrando) return;
      if (k === "Enter" || k === " ") { hablar("¿Cuál empieza por la " + INFO[S.empieza.objetivo].n + "?"); return; }
      if (esLetra(k)) {
        var L = k.toLowerCase();
        var tile = document.querySelector('.grid-opciones .emoji-tile[data-letra="' + L + '"]');
        if (tile) elegirEmpieza(L, tile);
      }
      return;
    }
    if (S.pantalla === "caza") {
      if (S.celebrando) return;
      if (k === "Enter" || k === " ") { pedirLetra(S.caza.objetivo); return; }
      if (esLetra(k)) cazaPorTecla(k.toLowerCase());
      return;
    }
    if (S.pantalla === "parejas") { return; } // solo toque

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
      if (esLetra(k)) { var Lb = k.toLowerCase(); if (Lb === S.busca.objetivo) aciertoBusca(); else falloBusca(Lb); }
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

  function teclaHome(k) {
    if (k === "ArrowRight" || k === "ArrowDown") { S.selMenu = (S.selMenu + 1) % MODOS.length; pantallaHome(); hablar(MODOS[S.selMenu].nombre); }
    else if (k === "ArrowLeft" || k === "ArrowUp") { S.selMenu = (S.selMenu - 1 + MODOS.length) % MODOS.length; pantallaHome(); hablar(MODOS[S.selMenu].nombre); }
    else if (k === "Enter" || k === " ") { abrirModo(MODOS[S.selMenu].id); }
    else if (k >= "1" && k <= "9") { var idx = parseInt(k, 10) - 1; if (idx < MODOS.length) { S.selMenu = idx; abrirModo(MODOS[idx].id); } }
    else if (k === "p" || k === "P") { pantallaPerfil(); }
    else if (k === "v" || k === "V") { S.voz = !S.voz; persistir(); pantallaHome(); if (S.voz) hablar("Voz activada"); }
    else if (k === "f" || k === "F") { S.modoVoz = S.modoVoz === "sonido" ? "nombre" : "sonido"; persistir(); pantallaHome(); hablar(S.modoVoz === "sonido" ? "Diré el sonido" : "Diré el nombre"); }
    else if (k === "l" || k === "L") { S.minus = !S.minus; persistir(); pantallaHome(); }
    else if (k === "n" || k === "N") { S.nivel = (S.nivel + 1) % NIVELES.length; persistir(); pantallaHome(); hablar("Nivel " + NIVELES[S.nivel]); }
    else if (k === "t" || k === "T") { S.kbLayout = S.kbLayout === "abc" ? "qwerty" : "abc"; persistir(); pantallaHome(); }
    else if (k === "k" || k === "K") { S.kbModo = S.kbModo === "auto" ? "si" : (S.kbModo === "si" ? "no" : "auto"); persistir(); pantallaHome(); hablar("Teclado en pantalla " + kbModoTxt()); }
  }

  function teclaUsada(k) {
    return k === " " || k === "Enter" || k === "Escape" || /^Arrow/.test(k) || esLetra(k) || (k >= "0" && k <= "9");
  }
  document.addEventListener("keydown", function (ev) {
    if (teclaUsada(ev.key)) ev.preventDefault();
    manejarTecla(ev.key);
  });
  tap(app, function () { if (S.pantalla === "intro") manejarTecla(" "); });

  /* Exponer para que el HUD/controles del núcleo lo invoquen */
  LV.manejarTecla = manejarTecla;

  /* ------------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------------ */
  pintarHud();
  LV.registrarSW();
  pantallaIntro();
})();
