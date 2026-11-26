// Framing the map around what an advisor is showing.
//
// The advisors' dock covers the left ~460 px of the map (the bottom 55% on phones). These helpers work out the part
// of the screen that is really free (whether or not app.visibleArea() already accounts for docks) and fit world
// boxes into it:
//   mapArea(app)                  → {x0, y0, x1, y1} css px of map not under the top bar, docks or a sheet
//   landBox(app)                  → km bbox of the lower 48 (cached)
//   frameBox(app, box, opts)      fly so the km box fits the free area (opts: pad, maxScale, ms)
//   frameNation(app)              the whole country beside the dock
//   focusPoint(app, x, y, scale)  centre a km point in the free area
//   hiddenShare(app, box)         0..1: how much of the box is off the free area (at the camera's destination)
//   frameIfHidden(app, box, k)    frameBox when more than k (default 30%) of the box is hidden
import { fin } from "./util.js";

const isPhone = () => matchMedia("(max-width: 700px)").matches;

export function mapArea(app) {
  const cam = app.cam;
  const a = { ...(app.visibleArea?.() || { x0: 0, y0: 0, x1: cam.w, y1: cam.h }) };
  const ui = app.ui;
  if (isPhone()) {
    if (ui?.isDockOpen?.("left") || ui?.isDockOpen?.("right")) a.y1 = Math.min(a.y1, cam.h * 0.45);
  } else {
    const dl = ui?.isDockOpen?.("left") ? ui.dockWidth("left") || dockRect("left") : 0;
    const dr = ui?.isDockOpen?.("right") ? ui.dockWidth("right") || dockRect("right") : 0;
    a.x0 = Math.max(a.x0, dl);
    a.x1 = Math.min(a.x1, cam.w - dr);
  }
  if (a.x1 - a.x0 < 120) a.x0 = Math.max(0, a.x1 - 120);
  if (a.y1 - a.y0 < 120) a.y1 = Math.min(cam.h, a.y0 + 120);
  return a;
}
const dockRect = (side) => Math.round(document.querySelector(`.app-dock-${side}`)?.getBoundingClientRect().width || 0);

let land = null;
export function landBox(app) {
  if (land && land.w === app.w) return land.box;
  const g = app.w.grid, own = app.w.raw.owner;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < g.size; i++) {
    if (!(own[i] >= 0)) continue;
    const x = g.cx(i), y = g.cy(i);
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const box = fin(x0) ? { x0: x0 - g.R, y0: y0 - g.R, x1: x1 + g.R, y1: y1 + g.R } : { x0: 0, y0: 0, x1: app.w.raw.width, y1: app.w.raw.height };
  land = { w: app.w, box };
  return box;
}

/** Fly so that the km box fills the free map area (with `pad` css px around it). Returns the target scale. */
export function frameBox(app, box, { pad = 28, maxScale = 2.4, ms = 750 } = {}) {
  if (!box || !app.fitBounds) return null;
  const a = app.visibleArea?.() || { x0: 0, y0: 0, x1: app.cam.w, y1: app.cam.h };
  const m = mapArea(app);
  // app.fitBounds() frames inside app.visibleArea(); the extra padding is whatever our free area takes off it.
  return app.fitBounds(box.x0, box.y0, box.x1, box.y1, {
    padLeft: pad + Math.max(0, m.x0 - a.x0), padRight: pad + Math.max(0, a.x1 - m.x1),
    padTop: pad + Math.max(0, m.y0 - a.y0), padBottom: pad + Math.max(0, a.y1 - m.y1),
    maxScale, ms,
  });
}

/** Fly so that km point (x, y) sits in the middle of the free map area at `scale` px/km. */
export function focusPoint(app, x, y, scale = app.cam.scale) {
  const m = mapArea(app);
  const hw = (m.x1 - m.x0) / 2 / scale, hh = (m.y1 - m.y0) / 2 / scale;
  return frameBox(app, { x0: x - hw, y0: y - hh, x1: x + hw, y1: y + hh }, { pad: 0, maxScale: scale });
}

export function frameNation(app, ms = 750) {
  return frameBox(app, landBox(app), { pad: 16, maxScale: Infinity, ms });
}

/** Where the camera is heading (its flight's end), or where it is. */
function destination(cam) {
  const f = cam.flight;
  return f ? { x: f.x1, y: f.y1, s: f.s1 } : { x: cam.x, y: cam.y, s: cam.scale };
}

export function hiddenShare(app, box) {
  if (!box) return 0;
  const cam = app.cam, d = destination(cam), m = mapArea(app);
  const toW = (sx, sy) => [(sx - cam.w / 2) / d.s + d.x, (sy - cam.h / 2) / d.s + d.y];
  const [vx0, vy0] = toW(m.x0, m.y0), [vx1, vy1] = toW(m.x1, m.y1);
  const bw = Math.max(1e-6, box.x1 - box.x0), bh = Math.max(1e-6, box.y1 - box.y0);
  const iw = Math.max(0, Math.min(box.x1, vx1) - Math.max(box.x0, vx0));
  const ih = Math.max(0, Math.min(box.y1, vy1) - Math.max(box.y0, vy0));
  // A box much larger than the view counts as hidden too: we want to see all of it.
  return 1 - (iw * ih) / (bw * bh);
}

export function frameIfHidden(app, box, k = 0.3, opts = {}) {
  if (!box || hiddenShare(app, box) <= k) return false;
  frameBox(app, box, opts);
  return true;
}
