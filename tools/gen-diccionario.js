/* =====================================================================
   GENERADOR DEL DICCIONARIO (herramienta de un solo uso, Node puro)
   ---------------------------------------------------------------------
   Crea ../diccionario.js con un Set grande de palabras en español para que
   el "Taller de bloques" reconozca cuándo el niño ha construido una palabra
   de verdad ("¡es una palabra!") frente a una inventada.

   Fuente: paquete npm `an-array-of-spanish-words` (MIT, ~636k palabras, ya
   en minúsculas, SIN acentos y solo [a-zñ]). Atribución abajo.

   Estrategia de tamaño: filtramos por longitud (2..MAXLEN) y comprimimos con
   FRONT-CODING (prefijo compartido con la palabra anterior, lista ordenada):
   cada token = base36(longitudPrefijoComún) + sufijo, separados por espacio.
   Así ~366k palabras (<=10 letras) caben en ~1,24 MB (vs ~3,3 MB en plano).

   Uso:
     npm install an-array-of-spanish-words --no-save --prefix /tmp/dicttest
     node tools/gen-diccionario.js            # busca el paquete en sitios típicos
     # o indicando la ruta del index.json:
     WORDS_JSON=/ruta/index.json node tools/gen-diccionario.js
   ===================================================================== */
"use strict";
var fs = require("fs");
var path = require("path");

var MAXLEN = 10;       // longitud máxima de palabra a incluir
var MINLEN = 2;        // mínima (evita letras sueltas como "palabra")

/* localizar la lista de palabras */
function cargarPalabras() {
  if (process.env.WORDS_JSON) return JSON.parse(fs.readFileSync(process.env.WORDS_JSON, "utf8"));
  var candidatos = [
    "an-array-of-spanish-words",
    "/tmp/dicttest/node_modules/an-array-of-spanish-words",
    path.join(__dirname, "..", "node_modules", "an-array-of-spanish-words")
  ];
  for (var i = 0; i < candidatos.length; i++) {
    try { return require(candidatos[i]); } catch (e) {}
  }
  console.error("No se encuentra la lista de palabras. Instálala:\n" +
    "  npm install an-array-of-spanish-words --no-save --prefix /tmp/dicttest");
  process.exit(2);
}

var todas = cargarPalabras();

/* filtrar + normalizar (por si la fuente trae algo raro) + dedupe */
var set = new Set();
for (var i = 0; i < todas.length; i++) {
  var w = String(todas[i]).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // quita acentos, conserva ñ
    .replace(/[^a-zñ]/g, "");
  if (w.length >= MINLEN && w.length <= MAXLEN) set.add(w);
}
var palabras = Array.from(set).sort();

/* front-coding */
var toks = [];
var prev = "";
for (var j = 0; j < palabras.length; j++) {
  var s = palabras[j];
  var k = 0, m = Math.min(prev.length, s.length);
  while (k < m && prev.charCodeAt(k) === s.charCodeAt(k)) k++;
  toks.push(k.toString(36) + s.slice(k));
  prev = s;
}
var packed = toks.join(" ");

/* escribir diccionario.js */
var salida = path.join(__dirname, "..", "diccionario.js");
var cabecera =
"/* =====================================================================\n" +
"   LAS LETRAS VIVAS — DICCIONARIO (autogenerado por tools/gen-diccionario.js)\n" +
"   NO EDITAR A MANO. Regenerar con: node tools/gen-diccionario.js\n" +
"   ---------------------------------------------------------------------\n" +
"   " + palabras.length + " palabras en español (longitud " + MINLEN + "-" + MAXLEN + "),\n" +
"   minúsculas y sin acentos (conserva ñ). Comprimido con front-coding.\n" +
"   Reconstruye LV.DIC (Set) al cargar. Se carga con <script defer>.\n" +
"\n" +
"   Fuente de datos: paquete npm `an-array-of-spanish-words` (MIT)\n" +
"   Copyright (c) 2016 Zeke Sikelianos. Derivado de la lista de Letterpress.\n" +
"   ===================================================================== */\n";

var cuerpo =
"(function () {\n" +
"  \"use strict\";\n" +
"  var root = (typeof window !== \"undefined\") ? window\n" +
"    : (typeof globalThis !== \"undefined\" ? globalThis : this);\n" +
"  var LV = root.LV || (root.LV = {});\n" +
"  var P = \"" + packed + "\";\n" +
"  var dic = new Set();\n" +
"  var toks = P.split(\" \");\n" +
"  var prev = \"\";\n" +
"  for (var i = 0; i < toks.length; i++) {\n" +
"    var t = toks[i];\n" +
"    var k = parseInt(t.charAt(0), 36);\n" +
"    var w = prev.slice(0, k) + t.slice(1);\n" +
"    dic.add(w); prev = w;\n" +
"  }\n" +
"  LV.DIC = dic;\n" +
"})();\n";

fs.writeFileSync(salida, cabecera + cuerpo);
var bytes = fs.statSync(salida).size;
console.log("OK: " + palabras.length + " palabras → " + salida +
  " (" + (bytes / 1048576).toFixed(2) + " MB)");
