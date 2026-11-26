// Small shared helpers for the advisor kit: numbers, scales, colour ramps, DOM.
export { esc } from "../../../format.js";

export const fin = Number.isFinite;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ratio = (a, b) => (fin(a) && fin(b) && b !== 0 ? a / b : null);
export const sum = (list, f = (x) => x) => list.reduce((a, x) => { const v = f(x); return fin(v) ? a + v : a; }, 0);
export const uid = (() => { let n = 0; return (p = "adv") => `${p}-${++n}`; })();

export function quantile(sortedVals, q) {
  if (!sortedVals.length) return null;
  const k = (sortedVals.length - 1) * q;
  const lo = Math.floor(k), hi = Math.ceil(k);
  return sortedVals[lo] + (sortedVals[hi] - sortedVals[lo]) * (k - lo);
}

/** Extent [min, max] of the finite values (positive only when `positive`), or null. */
export function extent(vals, positive = false) {
  let a = Infinity, b = -Infinity;
  for (const v of vals) {
    if (!fin(v) || (positive && v <= 0)) continue;
    if (v < a) a = v;
    if (v > b) b = v;
  }
  return a <= b ? [a, b] : null;
}

/** Robust domain: the [q, 1-q] quantiles of the finite values. */
export function robustDomain(vals, q = 0.02, positive = false) {
  const s = vals.filter((v) => fin(v) && (!positive || v > 0)).sort((a, b) => a - b);
  if (!s.length) return null;
  let lo = quantile(s, q), hi = quantile(s, 1 - q);
  if (!(hi > lo)) { lo = s[0]; hi = s[s.length - 1]; }
  if (!(hi > lo)) hi = lo + 1;
  return [lo, hi];
}

// --- scales ----------------------------------------------------------------------------------------------------

/** A scale maps a domain value to [r0, r1]; `log` uses log10 (non-positive values map to null). */
export function scale(domain, range, { log = false, clampOut = false } = {}) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const t = log ? (v) => (v > 0 ? Math.log10(v) : null) : (v) => v;
  const a = t(d0), b = t(d1);
  const f = (v) => {
    if (!fin(v)) return null;
    const tv = t(v);
    if (tv == null) return null;
    let k = b === a ? 0.5 : (tv - a) / (b - a);
    if (clampOut) k = clamp(k, 0, 1);
    return r0 + k * (r1 - r0);
  };
  f.invert = (p) => {
    const k = (p - r0) / (r1 - r0 || 1);
    const tv = a + k * (b - a);
    return log ? 10 ** tv : tv;
  };
  f.domain = domain;
  f.range = range;
  f.log = log;
  return f;
}

/** Nice linear ticks (about `n`). */
export function ticks(d0, d1, n = 5) {
  if (!(d1 > d0)) return [d0];
  const step0 = (d1 - d0) / Math.max(1, n);
  const mag = 10 ** Math.floor(Math.log10(step0));
  const err = step0 / mag;
  const step = mag * (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1);
  const out = [];
  for (let v = Math.ceil(d0 / step) * step; v <= d1 + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  return out;
}

/** Log ticks: powers of ten, plus 2 and 5 multiples when the range is short. */
export function logTicks(d0, d1) {
  if (!(d0 > 0) || !(d1 > d0)) return [d0];
  const e0 = Math.floor(Math.log10(d0)), e1 = Math.ceil(Math.log10(d1));
  const mult = e1 - e0 <= 2 ? [1, 2, 5] : e1 - e0 <= 4 ? [1, 3] : [1];
  const out = [];
  for (let e = e0; e <= e1; e++) for (const m of mult) {
    const v = m * 10 ** e;
    if (v >= d0 * 0.999 && v <= d1 * 1.001) out.push(v);
  }
  return out.length >= 2 ? out : [d0, d1];
}

/** Expand a domain by a fraction of its span (or by a factor on a log axis). */
export function pad(domain, k = 0.04, log = false) {
  const [a, b] = domain;
  if (log) { const f = (b / a) ** k; return [a / f, b * f]; }
  const p = (b - a) * k || Math.abs(a) * 0.1 || 1;
  return [a - p, b + p];
}

// --- colour ----------------------------------------------------------------------------------------------------

export const RAMPS = {
  // dark blue → teal → yellow (perceptually ordered; reads on the dark panels)
  seq: ["#2c3e78", "#3d6aa0", "#3e98a8", "#5fbf8e", "#b5d65c", "#f6e05a"],
  gold: ["#4a3416", "#7a5a22", "#b4872f", "#e0b54c", "#f6dc8a", "#fff6d6"],
  // red ← grey → teal, for signed values (growth)
  div: ["#c2463d", "#e08a6a", "#cfc4ae", "#7dc2b0", "#2e9c8a"],
  heat: ["#3b1f4a", "#7a2c62", "#bb3f5a", "#e8774a", "#f6b94a", "#fbe8a6"],
};

const hex2rgb = (h) => {
  const n = parseInt(h.replace("#", "").replace(/^(.)(.)(.)$/, "$1$1$2$2$3$3"), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
export function rampColor(ramp, t) {
  if (!fin(t)) return "#7d7466";
  t = clamp(t, 0, 1) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(t)), f = t - i;
  const a = hex2rgb(ramp[i]), b = hex2rgb(ramp[i + 1]);
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(",")})`;
}
export function withAlpha(color, a) {
  if (color.startsWith("#")) return `rgba(${hex2rgb(color).join(",")},${a})`;
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) return color;
  const p = m[1].split(",").slice(0, 3);
  return `rgba(${p.join(",")},${a})`;
}

/** A colour scale: {type: "seq"|"div"|"cat", domain, ramp, log, categories: Map<value, color>} → fn(v) → css. */
export function colorScale(spec) {
  if (!spec) return () => "#d9c79a";
  if (spec.type === "cat") {
    const m = spec.categories instanceof Map ? spec.categories : new Map(Object.entries(spec.categories || {}));
    return (v) => m.get(v) || spec.other || "#8b8070";
  }
  const ramp = spec.ramp || (spec.type === "div" ? RAMPS.div : RAMPS.seq);
  if (spec.type === "div") {
    const m = Math.max(Math.abs(spec.domain[0]), Math.abs(spec.domain[1])) || 1;
    const mid = spec.mid ?? 0;
    return (v) => (fin(v) ? rampColor(ramp, 0.5 + (v - mid) / (2 * m)) : "#6d665a");
  }
  const s = scale(spec.domain, [0, 1], { log: !!spec.log, clampOut: true });
  return (v) => {
    const t = s(v);
    return t == null ? "#6d665a" : rampColor(ramp, t);
  };
}

// --- DOM -------------------------------------------------------------------------------------------------------

export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/** Calls fn at most once per animation frame. */
export function rafThrottle(fn) {
  let queued = false, args = null;
  return (...a) => {
    args = a;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(...args); });
  };
}

/** Observe an element's width; calls fn(width) when it changes (debounced to a frame). Returns a disconnect fn. */
export function onWidth(node, fn) {
  if (typeof ResizeObserver !== "function") return () => {};
  let last = -1;
  const run = rafThrottle(() => {
    const w = Math.round(node.clientWidth);
    if (w > 0 && w !== last) { last = w; fn(w); }
  });
  const ro = new ResizeObserver(run);
  ro.observe(node);
  return () => ro.disconnect();
}

/** Set up a canvas for the device pixel ratio; returns the 2D context in css px. */
export function sizeCanvas(cv, w, h) {
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
  const c = cv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return c;
}
