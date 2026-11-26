// Two-way linking between a dashboard and the map.
//
// createLinker(app): the dashboard's map highlight is a "base" (what the view is about: a filter, a brushed set)
// plus a transient "hover" (the bar / row / point under the pointer). The hover replaces the base while it lasts
// but keeps the base's dimming, so the map does not flash.
//   link.base(h)   link.hover(h)   link.clear()
// createBubbles(app, id): proportional circles drawn as a map overlay (world space), with hit testing.
import { fin, withAlpha } from "./util.js";
import { mapArea, frameBox, frameIfHidden } from "./frame.js";

const HOVER_COLOR = "#fff3c4";
const GOLD = "#ffd36a";
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// The beacon pulses (1.4 s each) for a couple of rounds after the hovered thing changes, then rests on the still
// frame (the reduced-motion one, p = 0.35), so an idle map draws nothing.
const PULSE_MS = 1400;
const BEACON_STILL = 0.35;
const BEACON_MS = PULSE_MS * (2 + BEACON_STILL);

export function createLinker(app) {
  let base = null, hov = null, last = null;
  let pulse = BEACON_STILL, beacon = null, ticking = false, quiet = 0, hovQuiet = false, pulseT0 = 0;
  const apply = () => {
    let h = hov ? { ...hov, color: hov.color || HOVER_COLOR } : base;
    if (hov && base?.dimOthers && hov.dimOthers == null) h = { ...h, dimOthers: true };
    last = h;
    app.setHighlight(h);
    syncBeacon();
  };

  // --- the hover beacon ------------------------------------------------------------------------------------------
  // A hovered county can be a handful of pixels across, and a hovered place can sit under the dock. While the
  // dashboard hovers something, a pulsing gold ring (≥ 10 css px) marks its centre with its name; when the centre is
  // outside the free map area, an arrow on the area's edge points to it instead.
  function syncBeacon() {
    const want = hov && !hov.noBeacon && !hovQuiet ? app.highlightBounds?.(last) || pointBox(hov) : null;
    if (!want) {
      if (beacon) { beacon.off(); beacon = null; app.requestDraw(); }
      return;
    }
    const target = { box: want, label: hov.label || "" };
    if (!beacon) {
      const ov = { id: "adv-hover-beacon", z: 120, space: "screen", draw: (ctx) => drawBeacon(ctx, beacon?.target) };
      beacon = { off: app.registerOverlay(ov), target };
      restartPulse();
    } else beacon.target = target;
    app.requestDraw();
  }
  function restartPulse() {
    pulseT0 = performance.now();
    pulse = 0;
    if (!reduceMotion() && !ticking) { ticking = true; requestAnimationFrame(tick); }
  }
  function pointBox(h) {
    // A highlight without cells: ring its cities or resource sites.
    const g = app.w.grid;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => { if (fin(x) && fin(y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } };
    for (const id of h.cities || []) {
      const c = app.cityById?.get(id);
      if (c && c.cell != null) add(g.cx(c.cell), g.cy(c.cell));
    }
    const items = app.data?.resources?.items || [];
    for (const i of h.resources || []) add(items[i]?.x, items[i]?.y);
    return fin(x0) ? { x0, y0, x1, y1 } : null;
  }
  function tick() {
    if (!beacon) { ticking = false; return; }
    const t = performance.now() - pulseT0;
    const done = t >= BEACON_MS;
    pulse = done ? BEACON_STILL : (t % PULSE_MS) / PULSE_MS;
    app.requestDraw();
    if (done) ticking = false;
    else requestAnimationFrame(tick);
  }
  function drawBeacon(ctx, t) {
    if (!t) return;
    const cam = app.cam;
    const [sx0, sy0] = cam.toScreen(t.box.x0, t.box.y0);
    const [sx1, sy1] = cam.toScreen(t.box.x1, t.box.y1);
    const w = sx1 - sx0, h = sy1 - sy0;
    const cx = (sx0 + sx1) / 2, cy = (sy0 + sy1) / 2;
    const area = mapArea(app);
    const inset = 22;
    const inside = cx >= area.x0 + 4 && cx <= area.x1 - 4 && cy >= area.y0 + 4 && cy <= area.y1 - 4;
    ctx.save();
    ctx.font = "600 12px -apple-system, 'Segoe UI', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    if (inside) {
      const big = Math.max(w, h) > 64;
      if (!big) {
        const r = Math.max(10, Math.hypot(w, h) / 2 + 5);
        const p = reduceMotion() ? 0.35 : pulse;
        // glow
        const g = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.1);
        g.addColorStop(0, "rgba(255,211,106,.28)");
        g.addColorStop(1, "rgba(255,211,106,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 2.1, 0, Math.PI * 2); ctx.fill();
        // expanding pulse
        ctx.beginPath(); ctx.arc(cx, cy, r + p * r * 1.3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,211,106,${(0.85 * (1 - p)).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        // ring
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(12,8,2,.9)"; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2.2; ctx.stroke();
        // centre dot
        ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = "#fff3c4"; ctx.fill();
        ctx.strokeStyle = "rgba(12,8,2,.9)"; ctx.lineWidth = 1.2; ctx.stroke();
        if (t.label) label(ctx, t.label, cx, cy - r - 12, area);
      } else if (t.label) label(ctx, t.label, cx, Math.max(area.y0 + 14, sy0 - 12), area);
    } else if (t.label) {
      // Off the free area: an arrow on its edge, pointing at the place.
      const ax = Math.max(area.x0 + inset, Math.min(area.x1 - inset, cx));
      const ay = Math.max(area.y0 + inset, Math.min(area.y1 - inset, cy));
      const ang = Math.atan2(cy - ay, cx - ax);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(12, 0); ctx.lineTo(-7, -9); ctx.lineTo(-3, 0); ctx.lineTo(-7, 9); ctx.closePath();
      ctx.fillStyle = GOLD;
      ctx.strokeStyle = "rgba(12,8,2,.9)";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fill();
      ctx.restore();
      label(ctx, `${t.label} (off screen)`, ax, ay + (cy > ay ? -18 : 18), area);
    }
    ctx.restore();
  }
  function label(ctx, text, x, y, area) {
    const tw = ctx.measureText(text).width;
    const lx = Math.max(area.x0 + 6 + tw / 2, Math.min(area.x1 - 6 - tw / 2, x));
    const ly = Math.max(area.y0 + 10, Math.min(area.y1 - 10, y));
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(10,8,4,.92)";
    ctx.strokeText(text, lx, ly);
    ctx.fillStyle = "#fff3c4";
    ctx.fillText(text, lx, ly);
  }

  const frameBase = () => {
    const b = base ? app.highlightBounds?.(base) : null;
    if (b) frameBox(app, padBox(b, app.w.grid.R * 3), { pad: 36 });
    return !!b;
  };
  return {
    /** Set the view's standing highlight. opts.frame: fly to it when more than 30% of it is off the free map. */
    base(h, opts = {}) {
      base = h || null;
      apply();
      if (opts.frame && base) {
        const b = app.highlightBounds?.(base);
        if (b) frameIfHidden(app, padBox(b, app.w.grid.R * 2), 0.3, { pad: 36 });
      }
    },
    hover(h) {
      const changed = (h || null) !== hov;
      hov = h || null;
      hovQuiet = quiet > 0;
      apply();
      if (changed && beacon) restartPulse(); // a new hovered thing pulses again
    },
    /** Run fn with hovers that come from the map itself (no beacon: the pointer is already there). */
    fromMap(fn) { quiet++; try { return fn(); } finally { quiet--; } },
    /** Fly to the standing highlight (the "Frame on map" buttons). */
    frame: frameBase,
    get current() { return hov || base; },
    get baseValue() { return base; },
    /** Drop our highlight (leaves one that someone else set since alone). */
    clear() {
      base = null; hov = null;
      if (last && app.state.highlight === last) app.setHighlight(null);
      last = null;
      syncBeacon();
    },
  };
}

const padBox = (b, k) => ({ x0: b.x0 - k, y0: b.y0 - k, x1: b.x1 + k, y1: b.y1 + k });

/**
 * Proportional circles on the map. items: [{key, x, y, value, color, label}] (x, y in km).
 * opts: {rMax = 22 (css px at the home zoom for vmax), vMax, minR = 2.5, zIndex = 20, alpha = 0.55}
 * Radii are in screen px and grow gently with zoom, so circles stay readable at every scale.
 */
export function createBubbles(app, id, opts = {}) {
  let items = [], hot = null, sel = null;
  let o = { rMax: 22, minR: 2.5, alpha: 0.55, ...opts };
  const zoomK = () => {
    const fs = app.cam.fitScale || app.cam.scale;
    return Math.max(0.75, Math.min(2.4, Math.sqrt(app.cam.scale / fs)));
  };
  const radius = (it) => {
    const vmax = o.vMax || 1;
    const t = fin(it.value) && it.value > 0 ? Math.sqrt(it.value / vmax) : 0;
    return Math.max(o.minR, o.rMax * t) * zoomK();
  };
  const overlay = {
    id, z: o.z ?? 20, space: "world", snapshot: true,
    draw(ctx, cam) {
      if (!items.length) return;
      const s = cam.scale;
      const v = cam.view();
      ctx.lineWidth = 1.2 / s;
      for (const it of items) {
        const rpx = radius(it);
        const r = rpx / s;
        if (it.x + r < v.x0 || it.x - r > v.x1 || it.y + r < v.y0 || it.y - r > v.y1) continue;
        const faded = sel && !sel.has(it.key);
        ctx.beginPath();
        ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
        ctx.fillStyle = withAlpha(it.color, faded ? 0.12 : o.alpha);
        ctx.fill();
        ctx.strokeStyle = faded ? "rgba(20,14,6,.35)" : "rgba(20,14,6,.85)";
        ctx.stroke();
        if (!faded && rpx > 7) {
          ctx.beginPath();
          ctx.arc(it.x, it.y, r - 1.6 / s, 0, Math.PI * 2);
          ctx.strokeStyle = withAlpha(it.color, 0.95);
          ctx.stroke();
        }
      }
      if (hot) {
        const it = items.find((x) => x.key === hot);
        if (it) {
          const r = radius(it) / s;
          ctx.beginPath();
          ctx.arc(it.x, it.y, r + 3 / s, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(10,8,4,.9)";
          ctx.lineWidth = 4.5 / s;
          ctx.stroke();
          ctx.strokeStyle = HOVER_COLOR;
          ctx.lineWidth = 2.2 / s;
          ctx.stroke();
        }
      }
    },
  };
  const off = app.registerOverlay(overlay);
  return {
    set(list, opt = {}) {
      items = [...list].sort((a, b) => (b.value || 0) - (a.value || 0)); // big ones underneath
      o = { ...o, ...opt };
      if (!o.vMax) o.vMax = Math.max(1, ...items.map((x) => x.value || 0));
      app.requestDraw();
    },
    setOpts(opt) { o = { ...o, ...opt }; app.requestDraw(); },
    setHot(key) { if (key !== hot) { hot = key; app.requestDraw(); } },
    setSelected(set) { sel = set && set.size ? set : null; app.requestDraw(); },
    /** The item under a screen point (css px), smallest first. */
    hit(sx, sy) {
      const [x, y] = app.cam.toWorld(sx, sy);
      const s = app.cam.scale;
      let best = null, br = Infinity;
      for (const it of items) {
        const r = radius(it) / s + 2 / s;
        const d = Math.hypot(it.x - x, it.y - y);
        if (d <= r && r < br) { best = it; br = r; }
      }
      return best;
    },
    get items() { return items; },
    destroy() { off(); items = []; },
  };
}

/** A floating tooltip on the map for the dashboards' own marks (hides the core cell tooltip while shown). */
export function createMapTip() {
  const tip = document.createElement("div");
  tip.className = "adv-maptip";
  tip.hidden = true;
  document.body.appendChild(tip);
  return {
    show(x, y, html) {
      tip.innerHTML = html;
      tip.hidden = false;
      document.body.classList.add("adv-tip-on");
      const r = tip.getBoundingClientRect();
      const left = Math.min(innerWidth - r.width - 8, x + 14);
      const top = y + 16 + r.height > innerHeight ? y - r.height - 12 : y + 16;
      tip.style.left = `${Math.max(8, left)}px`;
      tip.style.top = `${Math.max(44, top)}px`;
    },
    hide() {
      if (tip.hidden) return;
      tip.hidden = true;
      document.body.classList.remove("adv-tip-on");
    },
    destroy() { tip.remove(); document.body.classList.remove("adv-tip-on"); },
  };
}
