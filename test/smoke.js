/* =====================================================================
   Test de humo de "Las Letras Vivas" con jsdom.
   Simula teclado FÍSICO y TÁCTIL en los 9 modos y comprueba que no salta
   ninguna excepción. No es exhaustivo: detecta errores de carga/runtime.

   Uso:
     node --check game.js
     npm install jsdom --no-save --prefix /tmp/jsdomtest
     JSDOM_DIR=/tmp/jsdomtest node test/smoke.js
   (también funciona si jsdom está instalado normalmente como dependencia)
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

// --- cargar el juego ---
const code = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const script = window.document.createElement('script');
script.textContent = code;
try { window.document.body.appendChild(script); } catch (e) { errores.push('carga: ' + e.message); }

const doc = window.document;
const press = key => { try { doc.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); } catch (e) { errores.push('press ' + key + ': ' + e.stack); } };
const click = (n, et) => { if (!n) return errores.push('click no encontrado: ' + et); try { n.click(); } catch (e) { errores.push('click ' + et + ': ' + e.stack); } };
const clickSel = sel => click(doc.querySelector(sel), sel);
const chars = () => [...doc.querySelectorAll('#stage .fila-letras .letter-char')];
const kteclas = () => [...doc.querySelectorAll('#controles .ktecla')];
const clickLetra = L => { const b = kteclas().find(x => x.textContent.toLowerCase() === L); b ? b.click() : errores.push('ktecla no encontrada: ' + L); };

// ===== recorrido =====
click(doc.getElementById('app'), '#app (intro->home)');
if (doc.querySelectorAll('.card').length !== 9) errores.push('Se esperaban 9 tarjetas, hay ' + doc.querySelectorAll('.card').length);
click(doc.querySelectorAll('.boton-hud')[1], 'fullscreen');
click(doc.querySelector('.ajustes .badge'), 'badge');

// Palabras tocando el teclado en pantalla
click(doc.querySelectorAll('.card')[4], 'card palabras');
if (kteclas().length === 0) errores.push('No hay teclado en pantalla en modo palabras');
chars().map(c => c.dataset.letra).forEach(clickLetra);
click(doc.querySelectorAll('.boton-hud')[0], 'volver');

// Galería táctil
click(doc.querySelectorAll('.card')[1], 'card galeria');
[...doc.querySelectorAll('#controles .barra .bcontrol')].forEach((b, i) => i < 1 && b.click());
clickLetra('m');
press('Escape');

// Cuentos leídos enteros por toque
click(doc.querySelectorAll('.card')[8], 'card cuentos');
for (let i = 0; i < 60; i++) clickSel('.bcontrol.grande');
press('Escape');

// Frases por toque
click(doc.querySelectorAll('.card')[7], 'card frases');
const nw = doc.querySelectorAll('#stage .frase .palabra-frase').length;
for (let i = 0; i < nw + 2; i++) clickSel('.bcontrol.grande');
press('Escape');

// Teclado físico + nivel + dictado + layout ABC
press('t'); press('n');         // ABC + nivel Medio
press('3');                      // busca
const t = doc.querySelector('#stage .letter-char').dataset.letra;
clickLetra(t);                   // acertar tocando el teclado ABC
press('Escape');
press('7');                      // dictado
chars().map(c => c.dataset.letra).forEach(clickLetra);
press('Escape');
press('4'); chars().map(c => c.dataset.letra).forEach(press); // sílabas con teclado físico
press('Escape');
press('6'); chars().filter(c => c.classList.contains('slot')).map(c => c.dataset.letra).forEach(press); // letra que falta

setTimeout(() => {
  if (errores.length === 0) { console.log('✅ SIN ERRORES (teclado físico + táctil, 9 modos)'); process.exit(0); }
  console.log('❌ ERRORES:'); errores.forEach(e => console.log(' - ' + e)); process.exit(1);
}, 3000);
