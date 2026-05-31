/* =====================================================================
   Test de humo de "Las Letras Vivas" con jsdom.
   Carga los scripts (data.js → core.js → bloques.js → modos.js → diccionario.js)
   y simula teclado FÍSICO y TÁCTIL en los 16 modos (incluidos los juegos de
   pulsar y los de bloques: taller libre, construir y tren) + perfiles +
   separación PC/tablet, comprobando que no salta ninguna excepción.
   No es exhaustivo: detecta errores de carga/runtime.

   Uso:
     node --check data.js && node --check core.js && node --check bloques.js && node --check modos.js
     npm install jsdom --no-save --prefix /tmp/jsdomtest
     JSDOM_DIR=/tmp/jsdomtest node test/smoke.js
   ===================================================================== */
const fs = require('fs');
const path = require('path');

// --- localizar jsdom (instalado o en una carpeta temporal) ---
let JSDOM, VirtualConsole;
(function () {
  const candidatos = [];
  if (process.env.JSDOM_DIR) candidatos.push(path.join(process.env.JSDOM_DIR, 'node_modules', 'jsdom'));
  candidatos.push('jsdom', '/tmp/jsdomtest/node_modules/jsdom');
  for (const c of candidatos) {
    try { ({ JSDOM, VirtualConsole } = require(c)); return; } catch (e) {}
  }
  console.error('No se encuentra jsdom. Instálalo:\n' +
    '  npm install jsdom --no-save --prefix /tmp/jsdomtest\n' +
    '  JSDOM_DIR=/tmp/jsdomtest node test/smoke.js');
  process.exit(2);
})();

const errores = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errores.push('jsdomError: ' + (e.stack || e.detail || e.message || e)));
vc.on('error', (...a) => errores.push('console.error: ' + a.join(' ')));

const html = `<!DOCTYPE html><html><body><div id="app"></div><div id="controles"></div><div id="fx"></div></body></html>`;
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;

// --- stubs de APIs del navegador ---
window.speechSynthesis = { getVoices: () => [], cancel() {}, speak() {}, onvoiceschanged: null };
window.SpeechSynthesisUtterance = function (t) { this.text = t; };
function FakeAC() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
FakeAC.prototype.createOscillator = () => ({ frequency: {}, type: '', connect() {}, start() {}, stop() {} });
FakeAC.prototype.createGain = () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} });
FakeAC.prototype.resume = () => {};
window.AudioContext = FakeAC;
window.requestAnimationFrame = cb => setTimeout(cb, 0);
window.HTMLElement.prototype.getBoundingClientRect = () => ({ left: 100, top: 100, width: 50, height: 50 });
window.document.documentElement.requestFullscreen = () => {};
window.HTMLElement.prototype.requestFullscreen = function () {};
Object.defineProperty(window.document, 'fullscreenElement', { get() { return null; }, configurable: true });
// Simulamos una TABLET (puntero "grueso"): así se pinta el teclado en pantalla.
window.matchMedia = q => ({ matches: /coarse/.test(q), media: q, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } });

// --- cargar el juego (scripts en orden; diccionario.js al final) ---
['data.js', 'core.js', 'bloques.js', 'modos.js', 'diccionario.js'].forEach(f => {
  const code = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const script = window.document.createElement('script');
  script.textContent = code;
  try { window.document.body.appendChild(script); } catch (e) { errores.push('carga ' + f + ': ' + e.message); }
});

const doc = window.document;
const press = key => { try { doc.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); } catch (e) { errores.push('press ' + key + ': ' + e.stack); } };
const click = (n, et) => { if (!n) return errores.push('click no encontrado: ' + et); try { n.click(); } catch (e) { errores.push('click ' + et + ': ' + e.stack); } };
const clickSel = sel => click(doc.querySelector(sel), sel);
const card = id => doc.querySelector('.card[data-modo="' + id + '"]');
const chars = () => [...doc.querySelectorAll('#stage .fila-letras .letter-char')];
const kteclas = () => [...doc.querySelectorAll('#controles .ktecla')];
const clickLetra = L => { const b = kteclas().find(x => x.textContent.toLowerCase() === L); b ? b.click() : errores.push('ktecla no encontrada: ' + L); };

// ===== recorrido =====
click(doc.getElementById('app'), '#app (intro->home)');
if (doc.querySelectorAll('.card').length !== 16) errores.push('Se esperaban 16 tarjetas, hay ' + doc.querySelectorAll('.card').length);
click(doc.querySelectorAll('.boton-hud')[1], 'fullscreen');
click(doc.querySelectorAll('.ajustes .badge')[1], 'badge voz'); // toggla la voz

// --- PERFILES: abrir, crear uno nuevo y volver ---
press('p');
if (!doc.querySelector('.perfiles')) errores.push('No se abrió la pantalla de perfiles');
const inp = doc.querySelector('.perfil-nombre'); if (inp) inp.value = 'Test';
click(doc.querySelector('.perfil-form .bcontrol.grande'), 'crear perfil');
if (!card('explora')) errores.push('Tras crear perfil no se volvió al menú');

// --- JUEGO 1: TOCA Y DESCUBRE (pulsar emojis) ---
click(card('toca'), 'card toca');
const tilesToca = [...doc.querySelectorAll('.grid-toca .emoji-tile')];
if (tilesToca.length === 0) errores.push('Toca y descubre: no hay dibujos');
tilesToca.forEach(t => t.click());
if (!doc.querySelector('#toca-banner .letter-char')) errores.push('Toca y descubre: no apareció la palabra');
press('Escape');

// --- JUEGO 2: ¿CUÁL EMPIEZA POR…? ---
click(card('empieza'), 'card empieza');
let objE = (doc.querySelector('#stage .fila-letras .letter-char') || {}).dataset;
const opc = doc.querySelectorAll('.grid-opciones .emoji-tile');
if (opc.length === 0) errores.push('Empieza por: no hay opciones');
if (objE) { const ok = doc.querySelector('.grid-opciones .emoji-tile[data-letra="' + objE.letra + '"]'); click(ok, 'opcion correcta empieza'); }
press('Escape');

// --- JUEGO 3: CAZA LA LETRA ---
click(card('caza'), 'card caza');
const objC = (doc.querySelector('.caza-objetivo .letter-char') || {}).dataset;
if (doc.querySelectorAll('.grid-caza .caza-tile').length === 0) errores.push('Caza: no hay letras');
if (objC) click(doc.querySelector('.grid-caza .caza-tile[data-letra="' + objC.letra + '"]'), 'caza correcta');
press('Escape');

// --- JUEGO 4: PAREJAS (memory) ---
click(card('parejas'), 'card parejas');
const cartas = [...doc.querySelectorAll('.grid-parejas .carta')];
if (cartas.length === 0) errores.push('Parejas: no hay cartas');
// localizar una pareja (dos cartas con la misma letra) y voltearlas
const porLetra = {};
cartas.forEach(c => { (porLetra[c.dataset.letra] = porLetra[c.dataset.letra] || []).push(c); });
const par = Object.values(porLetra).find(a => a.length >= 2);
if (par) { par[0].click(); par[1].click(); if (!doc.querySelector('.grid-parejas .carta.hecha') && !doc.querySelector('.grid-parejas .carta.abierta')) { /* la marca llega por temporizador */ } }
press('Escape');

// --- Palabras tocando el teclado en pantalla (tablet) ---
click(card('palabras'), 'card palabras');
if (kteclas().length === 0) errores.push('No hay teclado en pantalla en modo palabras (tablet)');
chars().map(c => c.dataset.letra).forEach(clickLetra);
press('Escape');

// --- Galería táctil ---
click(card('galeria'), 'card galeria');
[...doc.querySelectorAll('#controles .barra .bcontrol')].forEach((b, i) => i < 1 && b.click());
clickLetra('m');
press('Escape');

// --- Cuentos: tecleando cada palabra (teclado en pantalla) hasta acabar una página ---
click(card('cuentos'), 'card cuentos');
if (kteclas().length === 0) errores.push('Cuentos: no hay teclado en pantalla');
const palabrasPag = doc.querySelectorAll('#stage .frase .palabra-frase').length;
const prim = [...doc.querySelectorAll('#cuento-word .letter-char')].map(c => c.dataset.letra);
prim.forEach(clickLetra);
if (!doc.querySelector('#stage .frase .palabra-frase.leida')) errores.push('Cuentos: la palabra tecleada no avanzó');
for (let w = 1; w < palabrasPag; w++) {
  const letras = [...doc.querySelectorAll('#cuento-word .letter-char')].map(c => c.dataset.letra);
  if (letras.length === 0) break;
  letras.forEach(clickLetra);
}
const leidas = doc.querySelectorAll('#stage .frase .palabra-frase.leida').length;
if (leidas !== palabrasPag) errores.push('Cuentos: página no completada (' + leidas + '/' + palabrasPag + ' palabras leídas)');
press('a'); // tecla durante la transición de página: debe ignorarse sin error
press('Escape');

// --- Frases por toque ---
click(card('frases'), 'card frases');
const nw = doc.querySelectorAll('#stage .frase .palabra-frase').length;
for (let i = 0; i < nw + 2; i++) clickSel('.bcontrol.grande');
press('Escape');

// --- Teclado físico + nivel + dictado + layout ABC ---
press('t'); press('n');          // ABC + nivel Medio (ajustes del menú)
click(card('dictado'), 'card dictado');
chars().map(c => c.dataset.letra).forEach(clickLetra);
press('Escape');
click(card('silabas'), 'card silabas');
chars().map(c => c.dataset.letra).forEach(press); // sílabas con teclado físico
press('Escape');
click(card('busca'), 'card busca');
{ const t = doc.querySelector('#stage .letter-char').dataset.letra; clickLetra(t); } // acertar tocando el teclado ABC
press('Escape');
click(card('falta'), 'card falta'); // letra que falta: rellenar huecos con el teclado físico
chars().filter(c => c.classList.contains('slot')).map(c => c.dataset.letra).forEach(press);
press('Escape');

// --- SEPARACIÓN PC: forzar "teclado en pantalla = Nunca" y comprobar que NO se pinta ---
press('k'); press('k');           // auto -> si -> no
click(card('palabras'), 'card palabras (PC)');
if (kteclas().length !== 0) errores.push('En modo "Nunca" no debería haber teclado en pantalla');
chars().map(c => c.dataset.letra).forEach(press); // se juega con teclado físico
press('Escape');

// ===== BLOQUES: diccionario + sílabas curadas + los 3 modos =====
// Integridad de las sílabas curadas (cada sil.join('') === la palabra)
window.LV.BLOQUES_PALABRAS.forEach(p => { if (p.sil.join('') !== p.w) errores.push('Silabeo curado mal: ' + p.w); });
// Diccionario cargado y funcionando
if (!window.LV.DIC || window.LV.DIC.size < 100000) errores.push('Diccionario no cargado o demasiado pequeño');
if (!window.LV.esPalabra('casa')) errores.push('esPalabra("casa") debería ser true');
if (window.LV.esPalabra('xqzpt')) errores.push('esPalabra inventada debería ser false');

const bloquesTray = () => [...doc.querySelectorAll('#tray .bloque')];
const clickBloqueTray = txt => { const b = bloquesTray().find(x => x.dataset.texto === txt && !x.classList.contains('usado')); b ? b.click() : errores.push('bloque (tray) no encontrado: ' + txt); };
const tocarPaleta = txt => { const b = [...doc.querySelectorAll('#paleta .bloque')].find(x => x.dataset.texto === txt); b ? b.click() : errores.push('paleta sin pieza: ' + txt); };

// --- TALLER LIBRE: tocar piezas, leer, quitar, vaciar, teclear ---
click(card('taller'), 'card taller');
if (!doc.querySelector('#paleta .bloque')) errores.push('Taller: paleta vacía');
tocarPaleta('ca'); tocarPaleta('sa');                 // construir "casa" (palabra real)
if (doc.querySelectorAll('#obra .bloque').length !== 2) errores.push('Taller: no se añadieron 2 piezas');
press('Enter');                                       // leer (no debe romper)
press('Backspace');                                   // quitar una pieza
if (doc.querySelectorAll('#obra .bloque').length !== 1) errores.push('Taller: Backspace no quitó pieza');
const tabLetras = [...doc.querySelectorAll('.tab-bloque')].find(b => /Letras/.test(b.textContent));
click(tabLetras, 'tab Letras');
press('s');                                           // añadir letra por teclado físico
press('Delete');                                      // vaciar
if (doc.querySelectorAll('#obra .bloque').length !== 0) errores.push('Taller: Delete no vació');
press('Escape');

// --- CONSTRUIR (torre): tocar las sílabas en orden ---
click(card('construir'), 'card construir');
if (!doc.querySelector('#obra.torre')) errores.push('Construir: la obra no es una torre');
const objCons = [...doc.querySelectorAll('#obra .fantasma')].map(h => h.dataset.texto);
if (objCons.length === 0) errores.push('Construir: no hay huecos');
objCons.forEach(clickBloqueTray);
if (doc.querySelectorAll('#obra .bloque.puesto').length !== objCons.length) errores.push('Construir: no se colocaron todas las sílabas');
press('Escape');

// --- TREN: teclear letra a letra para enganchar los vagones ---
click(card('tren'), 'card tren');
if (!doc.querySelector('#obra.tren .loco')) errores.push('Tren: falta la locomotora');
const objT = [...doc.querySelectorAll('#obra .fantasma')].map(h => h.dataset.texto);
objT.forEach(sil => sil.split('').forEach(press));
if (doc.querySelectorAll('#obra .bloque.puesto').length !== objT.length) errores.push('Tren: el tecleo no enganchó todos los vagones');
press('Escape');

setTimeout(() => {
  if (errores.length === 0) { console.log('✅ SIN ERRORES (16 modos · bloques + diccionario · teclado físico + táctil · perfiles · PC/tablet)'); process.exit(0); }
  console.log('❌ ERRORES:'); errores.forEach(e => console.log(' - ' + e)); process.exit(1);
}, 3000);
