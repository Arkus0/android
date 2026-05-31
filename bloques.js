/* =====================================================================
   LAS LETRAS VIVAS — SISTEMA DE BLOQUES (motor reutilizable)
   ---------------------------------------------------------------------
   Piezas tipo Lego con LETRAS, SÍLABAS o PALABRAS que se juntan tocándolas.
   Pensado como base para MUCHOS juegos (taller libre, construir, tren,
   y futuros: tetris, construcciones…). El motor NO conoce objetivos ni
   victorias: solo sabe crear bloques, descomponer palabras, decir si algo
   es una palabra de verdad (LV.DIC) y animar un "encaje". La lógica de
   cada juego vive en modos.js.

   Script CLÁSICO. Carga DESPUÉS de core.js y ANTES de modos.js. Toma del
   núcleo (LV) las utilidades que necesita. El diccionario (LV.DIC) lo
   rellena diccionario.js (carga diferida); aquí se consulta en el momento.
   ===================================================================== */
(function () {
  "use strict";

  var el = LV.el, tap = LV.tap, mostrar = LV.mostrar, animar = LV.animar, tam = LV.tam,
      sfxPop = LV.sfxPop, COLOR = LV.COLOR, PALETA = LV.PALETA,
      VOCALES = LV.VOCALES, CONS_SIL = LV.CONS_SIL, TRABADAS = LV.TRABADAS,
      ORDEN_LETRAS = LV.ORDEN_LETRAS, PALABRAS = LV.PALABRAS;

  /* ------------------------------------------------------------------
     Texto: normalizar (quita acentos, conserva ñ) y reconocer palabra
     ------------------------------------------------------------------ */
  function normalizar(w) {
    return String(w || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zñ]/g, "");
  }
  // ¿es una palabra de verdad? Consulta el diccionario grande (si ya cargó).
  function esPalabra(w) {
    var n = normalizar(w);
    return n.length >= 2 && !!(LV.DIC && LV.DIC.has(n));
  }

  /* ------------------------------------------------------------------
     Color de un bloque: por su primera letra; si no, por hash sobre PALETA
     ------------------------------------------------------------------ */
  function colorBloque(texto) {
    var L = (texto || "").charAt(0);
    if (COLOR[L]) return COLOR[L];
    var h = 0; for (var i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
    return PALETA[Math.abs(h) % PALETA.length];
  }

  /* ------------------------------------------------------------------
     crearBloque / bloqueFantasma — el nodo DOM con aspecto Lego
     spec: { tipo:"letra"|"silaba"|"palabra", texto, color?, e? }
     opts: { tamRem(=4), onTap(spec,node), estuds, fantasma }
     ------------------------------------------------------------------ */
  function pintarBloque(spec, opts, fantasma) {
    opts = opts || {};
    var tipo = spec.tipo || "silaba";
    var b = el("div", "bloque bloque-" + tipo + (fantasma ? " fantasma" : ""));
    b.dataset.texto = spec.texto;
    b.dataset.tipo = tipo;
    b.style.setProperty("--c", spec.color || colorBloque(spec.texto));
    b.style.fontSize = tam(opts.tamRem || 4);
    var nEst = opts.estuds || Math.max(2, Math.min(4, spec.texto.length));
    var top = el("div", "bloque-estuds");
    for (var i = 0; i < nEst; i++) top.appendChild(el("span", "estud"));
    b.appendChild(top);
    if (spec.e) b.appendChild(el("span", "bloque-emoji", spec.e));
    b.appendChild(el("span", "bloque-texto", mostrar(spec.texto)));
    if (!fantasma && opts.onTap) tap(b, function () { opts.onTap(spec, b); });
    return b;
  }
  function crearBloque(spec, opts) { return pintarBloque(spec, opts, false); }
  function bloqueFantasma(spec, opts) { return pintarBloque(spec, opts, true); }

  /* ------------------------------------------------------------------
     encajar — efecto + sonido al colocar un bloque (sin lógica de juego)
     ------------------------------------------------------------------ */
  function encajar(node) { if (node) animar(node, "encaja", 480); sfxPop(); }

  /* ------------------------------------------------------------------
     silabear(palabra) — SILABEADOR HEURÍSTICO español (best-effort).
     OJO: aproximado. Los modos guiados usan sílabas CURADAS (data.js), no
     esto. Útil para reutilización en juegos futuros donde no importe tanto.
     ------------------------------------------------------------------ */
  function silabear(palabra) {
    var w = normalizar(palabra);
    if (w.length <= 1) return w ? [w] : [];
    function vocal(c) { return "aeiou".indexOf(c) >= 0; }
    function fuerte(c) { return "aeo".indexOf(c) >= 0; }
    // 1) núcleos: agrupar vocales en diptongos (separar hiatos fuerte+fuerte)
    var nucleos = [], i = 0; // cada núcleo: {ini, fin} índices [ini,fin)
    while (i < w.length) {
      if (vocal(w[i])) {
        var j = i + 1;
        while (j < w.length && vocal(w[j]) && !(fuerte(w[j - 1]) && fuerte(w[j]))) j++;
        nucleos.push([i, j]); i = j;
      } else i++;
    }
    if (nucleos.length <= 1) return [w]; // 0 o 1 vocal: una sílaba
    // 2) repartir consonantes entre núcleos consecutivos
    var DIG = { ch: 1, ll: 1, rr: 1 };
    function trabada(a, b) { return TRABADAS.indexOf(a + b) >= 0 || DIG[a + b] === 1; }
    var cortes = []; // índices donde empieza cada sílaba (el primero es 0)
    cortes.push(0);
    for (var n = 0; n < nucleos.length - 1; n++) {
      var finV = nucleos[n][1];            // fin del núcleo actual (inicio de consonantes)
      var iniV2 = nucleos[n + 1][0];       // inicio del siguiente núcleo
      var cons = w.slice(finV, iniV2);     // consonantes entre vocales
      var corte;
      if (cons.length === 0) corte = finV;                                   // hiato V-V
      else if (cons.length === 1) corte = finV;                              // V-CV
      else if (cons.length === 2) corte = trabada(cons[0], cons[1]) ? finV : finV + 1;
      else if (cons.length === 3) corte = trabada(cons[1], cons[2]) ? finV + 1 : finV + 2;
      else corte = finV + 2;                                                 // 4+: mitad
      cortes.push(corte);
    }
    cortes.push(w.length);
    var sil = [];
    for (var c = 0; c < cortes.length - 1; c++) sil.push(w.slice(cortes[c], cortes[c + 1]));
    return sil.filter(function (s) { return s.length > 0; });
  }

  /* ------------------------------------------------------------------
     descomponer(item, gran) -> [spec,...] según granularidad
     item: string  o  {w, sil?, e?}
     gran: "letra" | "silaba" | "palabra"
     ------------------------------------------------------------------ */
  function descomponer(item, gran) {
    var w = (typeof item === "string") ? item : item.w;
    if (gran === "letra") {
      return w.split("").map(function (L) { return { tipo: "letra", texto: L }; });
    }
    if (gran === "palabra") {
      return [{ tipo: "palabra", texto: w, e: (item && item.e) || null }];
    }
    var sil = (item && item.sil) ? item.sil : silabear(w);
    return sil.map(function (s) { return { tipo: "silaba", texto: s, color: colorBloque(s) }; });
  }

  /* ------------------------------------------------------------------
     INVENTARIOS de piezas para las bandejas/paletas (reutilizable)
     ------------------------------------------------------------------ */
  function invLetras() {
    return ORDEN_LETRAS.map(function (L) { return { tipo: "letra", texto: L }; });
  }
  function invSilabas() {
    var out = [];
    CONS_SIL.forEach(function (c) {
      VOCALES.forEach(function (v) { out.push({ tipo: "silaba", texto: c + v }); });
    });
    TRABADAS.forEach(function (t) {
      VOCALES.forEach(function (v) { out.push({ tipo: "silaba", texto: t + v }); });
    });
    return out;
  }
  function invPalabras() {
    return PALABRAS.map(function (p) { return { tipo: "palabra", texto: p.w, e: p.e }; });
  }

  /* ------------------------------------------------------------------
     Exponer en LV
     ------------------------------------------------------------------ */
  LV.crearBloque = crearBloque; LV.bloqueFantasma = bloqueFantasma;
  LV.descomponer = descomponer; LV.silabear = silabear;
  LV.colorBloque = colorBloque; LV.encajar = encajar;
  LV.normalizar = normalizar; LV.esPalabra = esPalabra;
  LV.invLetras = invLetras; LV.invSilabas = invSilabas; LV.invPalabras = invPalabras;
})();
