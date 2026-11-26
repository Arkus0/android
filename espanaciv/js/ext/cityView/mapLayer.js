// City View map layer: the metro's glowing border (world space) and, in screen space, the per-hex "tile yields"
// (estimated residents + dominant land use), labels for the metro's resource sites and the district plaques (the
// metro's real districts from districts.json, at schematic positions: see model.js placeDistricts). The border sits under the banners; the marks draw over the faded neighbour banners but under the open
// city's own (see drawMarks). Share images get both (snapshot: true).
import { drawIcon, hasIcon } from "../../icons.js";
import { compact } from "./fmt.js";
import { css } from "../../color.js";
import { LAND, resourceValue } from "./model.js";

const SANS = "-apple-system, 'Segoe UI', system-ui, sans-serif";
const SERIF = '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
const reduced = (() => {
  try { return matchMedia("(prefers-reduced-motion: reduce)"); } catch { return { matches: false }; }
})();

function edgePath(grid, mask) {
  const p = new Path2D();
  const C = grid.corners;
  for (const i of mask) {
    const x = grid.cx(i), y = grid.cy(i);
    for (let d = 0; d < 6; d++) {
      const j = grid.neighbour(i, d);
      if (j >= 0 && mask.has(j)) continue;
      p.moveTo(x + C[d][0], y + C[d][1]);
      p.lineTo(x + C[(d + 1) % 6][0], y + C[(d + 1) % 6][1]);
    }
  }
  return p;
}

function fillPath(grid, mask) {
  const p = new Path2D();
  const C = grid.corners;
  for (const i of mask) {
    const x = grid.cx(i), y = grid.cy(i);
    p.moveTo(x + C[0][0], y + C[0][1]);
    for (let k = 1; k < 6; k++) p.lineTo(x + C[k][0], y + C[k][1]);
    p.closePath();
  }
  return p;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexScreen(ctx, sx, sy, r) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = ((60 * k - 30) * Math.PI) / 180;
    const x = sx + r * Math.cos(a), y = sy + r * Math.sin(a);
    if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// A district without an icon in the set (the Encampment): a small tent on a disc in its colour.
function tentMark(ctx, x, y, r) {
  const k = r * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y - k);
  ctx.lineTo(x + k * 0.95, y + k * 0.7);
  ctx.lineTo(x - k * 0.95, y + k * 0.7);
  ctx.closePath();
  ctx.fillStyle = "#f3e6c4";
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.strokeStyle = "#120d06";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - k * 0.1);
  ctx.lineTo(x + k * 0.32, y + k * 0.7);
  ctx.lineTo(x - k * 0.32, y + k * 0.7);
  ctx.closePath();
  ctx.fillStyle = "#3a2a1a";
  ctx.fill();
}

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * createMapLayer(app, {focusRect}) registers the overlays; set(model) shows a city (null: none).
 * focusRect(ctx, cam) → the open city's banner rect on screen (css px) or null: the marks keep out of its way.
 * Returns {set, focus(cell), landColor(key), dispose(), animates()}.
 */
// The border glows and marches for a short while after a city opens, then rests on a still frame, so an idle map
// draws nothing. The pulse period is 2π·520 ms; the animation stops one period plus a little in, where the pulse is
// 0.6 again (the still / reduced-motion value).
const ANIM_MS = Math.round(520 * (2 * Math.PI + Math.asin(0.2))); // ≈ 3.37 s

export function createMapLayer(app, { focusRect = () => null } = {}) {
  let view = null; // {model, edge, fill}
  let focusCell = -1;
  let animT0 = 0;

  function set(model) {
    if (!model) { view = null; return; }
    const g = app.w.grid;
    if (view?.model !== model) animT0 = performance.now();
    view = { model, edge: edgePath(g, model.mask), fill: fillPath(g, model.mask) };
  }
  // ms into the border animation (it rests at ANIM_MS), or -1 for the still frame.
  const animTime = () => (reduced.matches ? -1 : Math.min(ANIM_MS, Math.max(0, performance.now() - animT0)));

  const border = {
    id: "cityview-border", z: 6, space: "world", snapshot: true,
    draw(ctx, cam) {
      if (!view) return;
      const s = cam.scale;
      const col = view.model.stateRGB;
      const t = animTime();
      const pulse = t >= 0 ? 0.5 + 0.5 * Math.sin(t / 520) : 0.6;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      // A faint wash of the state colour lifts the metro off the dimmed map.
      ctx.fillStyle = css(col, 0.07);
      ctx.fill(view.fill);
      // Glow: wide soft strokes in the state colour, then a crisp bronze-and-colour line.
      ctx.strokeStyle = css(col, 0.14 + 0.08 * pulse);
      ctx.lineWidth = 16 / s;
      ctx.stroke(view.edge);
      ctx.strokeStyle = css(col, 0.32 + 0.12 * pulse);
      ctx.lineWidth = 8 / s;
      ctx.stroke(view.edge);
      ctx.strokeStyle = "rgba(20,14,4,.9)";
      ctx.lineWidth = 4.2 / s;
      ctx.stroke(view.edge);
      ctx.strokeStyle = css(col, 1);
      ctx.lineWidth = 2.6 / s;
      ctx.stroke(view.edge);
      ctx.strokeStyle = "rgba(255,240,200,.75)";
      ctx.lineWidth = 0.9 / s;
      ctx.setLineDash([10 / s, 7 / s]);
      ctx.lineDashOffset = -((Math.max(0, t) / 1000) * 18) / s;
      ctx.stroke(view.edge);
      ctx.setLineDash([]);
      // The focused hex (a resource row hovered in the city screen).
      if (focusCell >= 0) {
        const g = app.w.grid;
        const x = g.cx(focusCell), y = g.cy(focusCell);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const px = x + g.corners[k][0] * 0.92, py = y + g.corners[k][1] * 0.92;
          if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(255,230,150,${0.12 + 0.1 * pulse})`;
        ctx.fill();
        ctx.strokeStyle = "#ffe9a8";
        ctx.lineWidth = 2.5 / s;
        ctx.stroke();
      }
    },
  };

  // The marks: tile-yield pills, district plaques and site labels, laid out together so they keep clear of each
  // other and of the open city's banner. Live, they draw in two passes around the banners (render/banners.js runs
  // between overlay z < 100 and z >= 100): whatever overlaps the open city's banner goes under it (z 8), everything
  // else over the faded neighbour banners (z 120), so no other city's plate can bury the metro. Share images keep
  // a single pass under all banners (they only take overlays below z 100).
  function drawMarks(ctx, cam, pass) {
    if (!view) return;
    const m = view.model;
    const g = app.w.grid;
    const Rpx = g.R * cam.scale;
    if (Rpx < 7) return;
    const onScreen = (sx, sy, pad) => sx > -pad && sy > -pad && sx < cam.w + pad && sy < cam.h + pad;
    ctx.textBaseline = "middle";
    const banner = cam === app.cam ? focusRect(ctx, cam) : null; // measured for the live view only
    // Draw `fn` in this pass? Under the banner → the "under" pass; else the "over" pass; "all" draws both.
    const mine = (rect) => pass === "all" || (pass === "under") === !!(banner && overlaps(rect, banner));

    // 2. Districts (real, from districts.json; schematic positions): hex plaques with the industry icon and, nearer, its name and LQ. Their screen
    //    rects (with the label) and the open city's banner are the obstacles the site labels keep clear of.
    const obstacles = banner ? [{ x: banner.x - 2, y: banner.y - 2, w: banner.w + 4, h: banner.h + 4 }] : [];
    const plaques = []; // laid out first (they win every collision), drawn after the pills
    const plaque = (d, sx, sy, r, label) => plaques.push([d, sx, sy, r, label]);
    const drawPlaque = (d, sx, sy, r, label) => {
      let txt = "", tw = 0;
      if (label) {
        ctx.font = `600 ${Math.round(Math.min(11, Math.max(9, r * 0.32)))}px ${SANS}`;
        txt = `${clip(d.short || "", 18)}${d.lq != null ? ` ×${d.lq.toFixed(1)}` : ""}`;
        tw = ctx.measureText(txt).width + 10;
      }
      const rect = label
        ? { x: Math.min(sx - r, sx - tw / 2), y: sy - r, w: Math.max(2 * r, tw), h: r * 0.98 + 7 + r }
        : { x: sx - r, y: sy - r, w: 2 * r, h: 2 * r };
      if (!mine(rect)) return;
      hexScreen(ctx, sx, sy, r);
      const grd = ctx.createLinearGradient(sx, sy - r, sx, sy + r);
      grd.addColorStop(0, d.color);
      grd.addColorStop(1, "rgba(10,14,20,.92)");
      ctx.fillStyle = grd;
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(1.5, r * 0.09);
      ctx.strokeStyle = "#120d06";
      ctx.stroke();
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.strokeStyle = "#e8c77a";
      ctx.stroke();
      const iy = sy - (label ? r * 0.08 : 0);
      if (!(d.icon && hasIcon(d.icon) && drawIcon(ctx, d.icon, sx, iy, r * 1.05, { bg: d.color }))) tentMark(ctx, sx, iy, r);
      if (label) {
        const ty = sy + r * 0.98;
        roundRect(ctx, sx - tw / 2, ty - 7, tw, 14, 7);
        ctx.fillStyle = "rgba(8,12,18,.92)";
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(232,199,122,.7)";
        ctx.stroke();
        ctx.fillStyle = "#f3e6c4";
        ctx.textAlign = "center";
        ctx.fillText(txt, sx, ty + 0.5);
      }
    };
    if (Rpx >= 9) {
      const r = Math.max(9, Math.min(30, Rpx * 0.42));
      const label = Rpx >= 36;
      const lift = Rpx >= 18 ? Rpx * 0.12 : 0; // room for the tile-yield pill below
      for (const d of m.placed) {
        const [sx, sy] = cam.toScreen(g.cx(d.cell), g.cy(d.cell));
        if (onScreen(sx, sy, r * 3)) plaque(d, sx, sy - lift, r, label);
      }
      if (m.inCity.length && m.city.cell != null && Rpx >= 22) {
        // Small metros: the remaining districts in a row across the lower part of the city's hex.
        const [cx, cy] = cam.toScreen(g.cx(m.city.cell), g.cy(m.city.cell));
        const n = m.inCity.length;
        const rMax = Math.max(8, Math.min(15, Rpx * 0.17));
        const step = Math.min(rMax * 2.3, (Rpx * 1.6) / Math.max(1, n));
        const rr = Math.max(6, Math.min(rMax, step / 2.15));
        m.inCity.forEach((d, k) => plaque(d, cx + (k - (n - 1) / 2) * step, cy + Rpx * 0.62, rr, false));
      }
    }

    const plaqueRects = plaques.map(([d, sx, sy, r, label]) => {
      if (!label) return { x: sx - r, y: sy - r, w: 2 * r, h: 2 * r };
      ctx.font = `600 ${Math.round(Math.min(11, Math.max(9, r * 0.32)))}px ${SANS}`;
      const tw = ctx.measureText(`${clip(d.short || "", 18)}${d.lq != null ? ` ×${d.lq.toFixed(1)}` : ""}`).width + 10;
      return { x: Math.min(sx - r, sx - tw / 2), y: sy - r, w: Math.max(2 * r, tw), h: r * 0.98 + 7 + r };
    });

    // 1. Tile yields: [people ≈12K | land 41%] under each footprint hex (not the city's own hex: its banner). They
    //    give way to the plaques and to each other; on phones only the five most populous hexes get one.
    if (Rpx >= 18) {
      const full = Rpx >= 30;
      const phone = cam.w <= 700;
      let tiles = m.tiles.filter((t) => !t.isCity);
      if (phone) tiles = [...tiles].sort((a, b) => (b.residents || 0) - (a.residents || 0)).slice(0, 5);
      const taken = [];
      for (const t of tiles) {
        const [sx, sy0] = cam.toScreen(t.x, t.y);
        if (!onScreen(sx, sy0, Rpx * 1.2)) continue;
        const sy = sy0 + Rpx * (m.placed.some((d) => d.cell === t.cell) ? 0.74 : 0.56);
        const W = pillWidth(ctx, t, full), h = full ? 16 : 13;
        const rect = { x: sx - W / 2 - 2, y: sy - h / 2 - 2, w: W + 4, h: h + 4 };
        if (taken.some((o) => overlaps(o, rect)) || plaqueRects.some((o) => overlaps(o, rect))) continue;
        taken.push(rect);
        obstacles.push(rect);
        if (mine(rect)) pill(ctx, sx, sy, t, full);
      }
    }
    for (const q of plaques) drawPlaque(...q);
    obstacles.push(...plaqueRects);

    // 3. Resource sites of the metro: a label per hex (the biggest site, "+N" more). Each label tries a few spots
    //    around its hex (above, higher, below the yield pill) and takes the first one clear of the plaques, the
    //    city's banner and the labels already placed; with no clear spot the name is left out (the site keeps its
    //    ring, and the Resources list names it). The focused site is placed first and always shown.
    if (Rpx >= 14) {
      const cells = [...m.siteCells.keys()];
      if (focusCell >= 0 && m.siteCells.has(focusCell)) cells.sort((a, b) => (b === focusCell) - (a === focusCell));
      const pillH = Rpx >= 18 ? (Rpx >= 30 ? 16 : 13) : 0;
      for (const cell of cells) {
        const list = m.siteCells.get(cell);
        const [sx, sy0] = cam.toScreen(g.cx(cell), g.cy(cell));
        if (!onScreen(sx, sy0, 160)) continue;
        const top = list[0];
        const isCity = cell === m.city.cell;
        const name = clip(top.item.name || top.type?.name || "", Rpx >= 40 ? 26 : 16);
        const val = Rpx >= 30 ? resourceValue(top.item, top.type, compact) : "";
        const more = list.length > 1 ? ` +${list.length - 1}` : "";
        const W = siteLabelWidth(ctx, name, val, more), H = 17;
        const below = sy0 + Rpx * 0.56 + (pillH ? pillH / 2 + 2 : 0) + H / 2;
        const spots = isCity
          ? [sy0 + Rpx * 0.98, sy0 + Rpx * 0.98 + H + 3]
          : [sy0 - Rpx * 0.56, sy0 - Rpx * 0.56 - H - 3, below];
        const focused = cell === focusCell;
        const boxAt = (y) => ({ x: sx - W / 2 - 2, y: y - H / 2 - 2, w: W + 4, h: H + 4 });
        let sy = spots.find((y) => !obstacles.some((o) => overlaps(o, boxAt(y))));
        if (sy == null && focused) sy = spots[0];
        if (sy == null) continue;
        const box = boxAt(sy);
        obstacles.push(box);
        // A focused label forced onto the banner still goes over it: it is what the viewer is pointing at.
        if (pass === "all" || (pass === "over") === (focused || !(banner && overlaps(box, banner)))) {
          siteLabel(ctx, sx, sy, name, val, more, top.type?.color || "#c9a45c", focused);
        }
      }
    }
  }

  const live = (cam) => cam === app.cam;
  const marksUnder = {
    id: "cityview-marks", z: 8, space: "screen", snapshot: true,
    draw(ctx, cam) { drawMarks(ctx, cam, live(cam) ? "under" : "all"); },
  };
  const marksOver = {
    id: "cityview-marks-over", z: 120, space: "screen",
    draw(ctx, cam) { if (live(cam)) drawMarks(ctx, cam, "over"); },
  };

  function pillWidth(ctx, t, full) {
    const h = full ? 16 : 13;
    ctx.font = `600 ${full ? 10 : 9}px ${SANS}`;
    const resTxt = t.residents != null ? `≈${compact(t.residents)}` : "–";
    const landTxt = t.land && full ? `${Math.round(t.land.share * 100)}%` : "";
    const ic = h - 4;
    const wRes = ic + 2 + ctx.measureText(resTxt).width;
    const wLand = t.land ? ic + (landTxt ? 2 + ctx.measureText(landTxt).width : 0) : 0;
    return 8 + wRes + (t.land ? 6 : 0) + wLand;
  }

  function pill(ctx, sx, sy, t, full) {
    const h = full ? 16 : 13;
    const fs = full ? 10 : 9;
    ctx.font = `600 ${fs}px ${SANS}`;
    const resTxt = t.residents != null ? `≈${compact(t.residents)}` : "–";
    const landTxt = t.land && full ? `${Math.round(t.land.share * 100)}%` : "";
    const ic = h - 4;
    const wRes = ic + 2 + ctx.measureText(resTxt).width;
    const wLand = t.land ? ic + (landTxt ? 2 + ctx.measureText(landTxt).width : 0) : 0;
    const gap = t.land ? 6 : 0;
    const W = 8 + wRes + gap + wLand;
    const x = sx - W / 2, y = sy - h / 2;
    roundRect(ctx, x, y, W, h, h / 2);
    ctx.fillStyle = "rgba(8,12,18,.86)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(201,164,92,.55)";
    ctx.stroke();
    let px = x + 4;
    drawIcon(ctx, "pop", px + ic / 2, sy, ic, { medallion: false, color: "#dfe8f2", shadow: false });
    px += ic + 2;
    ctx.fillStyle = "#f3e6c4";
    ctx.textAlign = "left";
    ctx.fillText(resTxt, px, sy + 0.5);
    px += wRes - ic - 2 + gap;
    if (t.land) {
      const rgb = LAND_COLORS[t.land.key];
      if (t.land.icon && hasIcon(t.land.icon)) {
        drawIcon(ctx, t.land.icon, px + ic / 2, sy, ic, { medallion: false, color: rgb, shadow: false });
      } else {
        ctx.beginPath();
        ctx.arc(px + ic / 2, sy, ic * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = rgb;
        ctx.fill();
      }
      if (landTxt) {
        ctx.fillStyle = rgb;
        ctx.fillText(landTxt, px + ic + 2, sy + 0.5);
      }
    }
  }

  function siteLabelWidth(ctx, name, val, more) {
    ctx.font = `bold 11px ${SERIF}`;
    const nw = ctx.measureText(name).width;
    ctx.font = `600 10px ${SANS}`;
    const vw = val ? ctx.measureText(val).width + 6 : 0;
    const mw = more ? ctx.measureText(more).width + 2 : 0;
    return 14 + nw + vw + mw + 8;
  }

  function siteLabel(ctx, sx, sy, name, val, more, color, focused) {
    ctx.font = `bold 11px ${SERIF}`;
    const nw = ctx.measureText(name).width;
    ctx.font = `600 10px ${SANS}`;
    const vw = val ? ctx.measureText(val).width + 6 : 0;
    const mw = more ? ctx.measureText(more).width + 2 : 0;
    const W = 14 + nw + vw + mw + 8, h = 17;
    const x = sx - W / 2, y = sy - h / 2;
    roundRect(ctx, x, y, W, h, 3);
    ctx.fillStyle = focused ? "rgba(60,44,14,.95)" : "rgba(10,14,20,.9)";
    ctx.fill();
    ctx.lineWidth = focused ? 1.6 : 1;
    ctx.strokeStyle = focused ? "#ffe9a8" : "rgba(201,164,92,.75)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 8, sy, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,.6)";
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.font = `bold 11px ${SERIF}`;
    ctx.fillStyle = "#f6dc96";
    ctx.fillText(name, x + 14, sy + 0.5);
    ctx.font = `600 10px ${SANS}`;
    if (val) {
      ctx.fillStyle = "#e9dfc6";
      ctx.fillText(val, x + 14 + nw + 6, sy + 0.5);
    }
    if (more) {
      ctx.fillStyle = "#b9ab88";
      ctx.fillText(more, x + 14 + nw + vw + 2, sy + 0.5);
    }
  }

  const LAND_COLORS = {};
  for (const g of LAND) {
    const rgb = app.w.coverRGB?.[g.cover];
    // Lifted a little so the glyph reads on the dark pill.
    LAND_COLORS[g.key] = rgb ? css(rgb.map((v) => Math.min(255, v * 0.55 + 255 * 0.45))) : "#d8cfb4";
  }

  const offs = [app.registerOverlay(border), app.registerOverlay(marksUnder), app.registerOverlay(marksOver)];
  return {
    set,
    focus(cell) {
      if (cell === focusCell) return;
      focusCell = cell ?? -1;
      app.requestDraw();
    },
    landColor: (key) => LAND_COLORS[key],
    dispose() { offs.forEach((f) => f()); },
    /** True while the border animation runs (it settles a few seconds after a city opens). */
    animates: () => !reduced.matches && !!view && performance.now() - animT0 < ANIM_MS,
  };
}
