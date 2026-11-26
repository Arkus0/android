// Formato de números en castellano: coma decimal, "k" miles, "M" millones, "mM" miles de millones, "B" billones
// (10¹²), euros al final. Incluye el arreglo de usaciv para que 999.600 se lea "1,0M" y no "1000k".
const dec = (s) => s.replace(".", ",");
const UNITS = [[1e12, "B"], [1e9, "mM"], [1e6, "M"], [1e3, "k"]];

function compactRaw(n) {
  if (n == null || Number.isNaN(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e12) return dec((n / 1e12).toFixed(a >= 1e13 ? 1 : 2)) + "B";
  if (a >= 1e9) return dec((n / 1e9).toFixed(a >= 1e11 ? 0 : 1)) + "mM";
  if (a >= 1e6) return dec((n / 1e6).toFixed(a >= 1e8 ? 0 : 1)) + "M";
  if (a >= 1e3) return dec((n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, "")) + "k";
  return String(Math.round(n));
}

function rollover(n, fmt) {
  if (n == null || Number.isNaN(n)) return fmt(n);
  const s = fmt(n);
  const m = /^-?1000(?:,0+)?(k|M|mM)$/.exec(s);
  if (!m) return s;
  const i = UNITS.findIndex(([, u]) => u === m[1]);
  return i > 0 ? fmt(Math.sign(n) * UNITS[i - 1][0]) : s;
}

export const compact = (n) => rollover(n, compactRaw);
export const money = (n) => (n == null ? "–" : compact(n) + "\u00a0€");
export const dollars = (n) => (n == null ? "–" : Math.round(n).toLocaleString("es-ES") + "\u00a0€");
export const euros = dollars;
export const int = (n) => (n == null ? "–" : Math.round(n).toLocaleString("es-ES"));
export const pct = (x, d = 1) => (x == null ? "–" : dec((x * 100).toFixed(d)) + "%");
export const num1 = (x, d = 1) => (x == null ? "–" : dec(Number(x).toFixed(d)));

export const isMoney = (y) => y?.unit === "usd" || y?.unit === "eur";

export function yieldValue(y, v) {
  return isMoney(y) ? money(v) : compact(v);
}

function popShortRaw(n) {
  if (n >= 1e7) return Math.round(n / 1e6) + "M";
  if (n >= 1e6) return dec((n / 1e6).toFixed(1)) + "M";
  return Math.round(n / 1e3) + "k";
}
export const popShort = (n) => rollover(n, popShortRaw);

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
