/* =====================================================================
   Generador de iconos PNG para la PWA (sin dependencias, Node puro).
   Dibuja el mismo diseño que icon.svg (cuadro azul-verde + la "A" con
   carita) y exporta icon-192.png, icon-512.png e icon-512-maskable.png.

   Es una herramienta de UN SOLO USO (no forma parte del runtime del
   juego). Solo hay que volver a ejecutarla si cambia el icono:
     node tools/gen-icons.js
   ===================================================================== */
var fs = require("fs");
var zlib = require("zlib");
var path = require("path");

var SS = 4; // supersampling para suavizar bordes

// --- color del cielo según la y (0..512), igual que el degradado del SVG ---
function lerp(a, b, t) { return a + (b - a) * t; }
function mez(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
function cielo(y) {
  var t = y / 512;
  var a = [0xae, 0xe3, 0xff], b = [0xd8, 0xf3, 0xff], c = [0xb6, 0xf0, 0xa8];
  if (t < 0.55) return mez(a, b, t / 0.55);
  return mez(b, c, (t - 0.55) / 0.45);
}

function dist2seg(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  var t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  var qx = x1 + t * dx, qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}
function distPoli(px, py, pts, cerrar) {
  var d = Infinity;
  for (var i = 0; i < pts.length - 1; i++) d = Math.min(d, dist2seg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}
// Bézier cuadrática → lista de puntos
function quad(p0, p1, p2, n) {
  var pts = [];
  for (var i = 0; i <= n; i++) {
    var t = i / n, u = 1 - t;
    pts.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
              u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return pts;
}
function elip(px, py, cx, cy, rx, ry) { var a = (px - cx) / rx, b = (py - cy) / ry; return a * a + b * b <= 1; }

// Devuelve [r,g,b,a] (0..255) del diseño en coords 0..512.
// scaleC escala el "personaje" hacia el centro (para versión maskable).
// radio = radio de las esquinas del fondo (0 = cuadrado a sangre).
function pixelDiseno(x, y, scaleC, radio) {
  // fondo: dentro del rectángulo redondeado
  var dentro = true;
  if (radio > 0) {
    var rx = Math.min(Math.max(x, radio), 512 - radio);
    var ry = Math.min(Math.max(y, radio), 512 - radio);
    dentro = Math.hypot(x - rx, y - ry) <= radio;
  }
  if (!dentro) return [0, 0, 0, 0];
  var col = cielo(y), R = col[0], G = col[1], B = col[2];

  function blend(c, a) { R = lerp(R, c[0], a); G = lerp(G, c[1], a); B = lerp(B, c[2], a); }

  // coords del personaje (escaladas hacia el centro para maskable)
  var fx = 256 + (x - 256) / scaleC, fy = 256 + (y - 256) / scaleC;

  // nubes
  if (elip(fx, fy, 120, 110, 46, 26) || elip(fx, fy, 160, 118, 34, 20) || elip(fx, fy, 400, 150, 38, 22)) blend([255, 255, 255], 0.9);

  // la A (trazos rojos, ancho 58, extremos redondeados)
  var dA = Math.min(
    distPoli(fx, fy, [[175, 390], [256, 150], [337, 390]]),
    dist2seg(fx, fy, 206, 305, 306, 305)
  );
  if (dA <= 29) blend([0xe6, 0x19, 0x4b], 1);

  // ojos (blanco) + pupilas
  if (elip(fx, fy, 232, 250, 26, 30) || elip(fx, fy, 282, 250, 26, 30)) blend([255, 255, 255], 1);
  if (elip(fx, fy, 236, 256, 11, 11) || elip(fx, fy, 286, 256, 11, 11)) blend([0x22, 0x22, 0x22], 1);

  // mejillas
  if (elip(fx, fy, 206, 288, 14, 9) || elip(fx, fy, 312, 288, 14, 9)) blend([255, 120, 140], 0.6);

  // sonrisa
  if (distPoli(fx, fy, quad([228, 296], [257, 322], [286, 296], 24)) <= 4.5) blend([0x6b, 0x2e, 0x00], 1);

  return [Math.round(R), Math.round(G), Math.round(B), 255];
}

function render(size, scaleC, radio) {
  var B = size * SS;
  var px = Buffer.alloc(B * B * 4);
  var esc = 512 / B; // buffer → diseño
  for (var j = 0; j < B; j++) {
    for (var i = 0; i < B; i++) {
      var c = pixelDiseno((i + 0.5) * esc, (j + 0.5) * esc, scaleC, radio);
      var o = (j * B + i) * 4;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3];
    }
  }
  // downsample SSxSS → tamaño final (promedio)
  var out = Buffer.alloc(size * size * 4);
  for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
    var r = 0, g = 0, b = 0, a = 0;
    for (var dy = 0; dy < SS; dy++) for (var dx = 0; dx < SS; dx++) {
      var p = (((y * SS + dy) * B) + (x * SS + dx)) * 4;
      r += px[p]; g += px[p + 1]; b += px[p + 2]; a += px[p + 3];
    }
    var n = SS * SS, q = (y * size + x) * 4;
    out[q] = Math.round(r / n); out[q + 1] = Math.round(g / n); out[q + 2] = Math.round(b / n); out[q + 3] = Math.round(a / n);
  }
  return out;
}

// --- codificar PNG (RGBA) ---
var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { var c = 0xffffffff; for (var i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(tipo, datos) {
  var len = Buffer.alloc(4); len.writeUInt32BE(datos.length, 0);
  var t = Buffer.from(tipo, "ascii");
  var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, datos])), 0);
  return Buffer.concat([len, t, datos, crc]);
}
function png(size, rgba) {
  var sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  var raw = Buffer.alloc(size * (size * 4 + 1));
  for (var y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtro None
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  var idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

var raiz = path.join(__dirname, "..");
function escribir(nombre, size, scaleC, radio) {
  var p = path.join(raiz, nombre);
  fs.writeFileSync(p, png(size, render(size, scaleC, radio)));
  console.log("✔", nombre, "(" + size + "x" + size + ")");
}

escribir("icon-192.png", 192, 1, 42);
escribir("icon-512.png", 512, 1, 110);
escribir("icon-512-maskable.png", 512, 0.78, 0); // borde de seguridad para máscara
console.log("Iconos generados.");
