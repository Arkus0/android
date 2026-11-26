// Canvas scatter plot: hover, click, drag-rectangle brushing, size-by and colour-by. No pan or zoom.
//
// createScatter(host, opts) → {update(opts), setHot(key), setSelected(Set|null), destroy()}
// opts:
//   points: [{key, x, y, s?, c?, label, sub?}]     s = size value, c = colour value (or css colour with colorIsCss)
//   x / y: {label, fmt(v), log, domain?}            axes (non-positive values are dropped on a log axis)
//   size: {label, fmt, max = 13, min = 2} | null    radius ∝ √s
//   color: (c, point) → css | null                  default: gold
//   refLines: [{k, label}]                          lines y = k·x (e.g. affordability ratios)
//   refX / refY: [{v, label}]                       vertical / horizontal reference lines
//   labels: [key]                                   points to label with their name
//   height = 300, ariaLabel
//   onHover(point|null), onClick(point), onBrush(Set<key>|null)
import { esc, fin, clamp, scale, ticks, logTicks, pad, extent, sizeCanvas, onWidth } from "./util.js";

const M = { l: 52, r: 12, t: 10, b: 38 };

export function createScatter(host, opts) {
  const root = document.createElement("div");
  root.className = "adv-scatter";
  const cv = document.createElement("canvas");
  cv.setAttribute("role", "img");
  cv.tabIndex = 0;
  const tip = document.createElement("div");
  tip.className = "adv-ptip";
  tip.hidden = true;
  const hint = document.createElement("div");
  hint.className = "adv-shint";
  root.append(cv, tip, hint);
  host.appendChild(root);

  let o = opts;
  let W = 0, H = o.height || 300;
  let pts = []; // [{p, px, py, r}]
  let sx = null, sy = null;
  let hot = null, sel = null, brush = null, drag = null;
  let kept = null; // the last brush rectangle (data coordinates), drawn dashed while its selection stands

  function layout() {
    W = Math.max(220, Math.round(root.clientWidth || host.clientWidth || 400));
    H = o.height || 300;
    const xl = !!o.x?.log, yl = !!o.y?.log;
    const valid = (o.points || []).filter((p) => fin(p.x) && fin(p.y) && (!xl || p.x > 0) && (!yl || p.y > 0));
    const xd = o.x?.domain || extent(valid.map((p) => p.x)) || [0, 1];
    const yd = o.y?.domain || extent(valid.map((p) => p.y)) || [0, 1];
    const fix = (d, log) => (d[1] > d[0] ? d : log ? [d[0] / 2, d[0] * 2] : [d[0] - 1, d[0] + 1]);
    sx = scale(o.x?.domain ? fix(xd, xl) : pad(fix(xd, xl), 0.04, xl), [M.l, W - M.r], { log: xl });
    sy = scale(o.y?.domain ? fix(yd, yl) : pad(fix(yd, yl), 0.05, yl), [H - M.b, M.t], { log: yl });
    const smax = o.size ? Math.max(1e-12, ...valid.map((p) => (fin(p.s) ? p.s : 0))) : 1;
    const rmax = o.size?.max ?? 13, rmin = o.size?.min ?? 2;
    pts = valid.map((p) => ({
      p,
      px: clamp(sx(p.x), M.l, W - M.r),
      py: clamp(sy(p.y), M.t, H - M.b),
      r: o.size ? rmin + (rmax - rmin) * Math.sqrt(clamp((fin(p.s) ? p.s : 0) / smax, 0, 1)) : o.radius || 3,
    })).sort((a, b) => b.r - a.r);
    root._count = valid.length;
    cv.setAttribute("aria-label", o.ariaLabel || `Gráfica de dispersión de ${valid.length} puntos: ${o.y?.label || "y"} frente a ${o.x?.label || "x"}`);
    hint.textContent = o.brush === false ? "" : `${valid.length.toLocaleString("en-US")} points · drag to select`;
    draw();
  }

  function axisTicks(s, log) {
    const [d0, d1] = s.domain;
    return log ? logTicks(d0, d1) : ticks(d0, d1, W < 330 && s === sx ? 4 : 5);
  }

  function draw() {
    const c = sizeCanvas(cv, W, H);
    c.clearRect(0, 0, W, H);
    // frame
    c.fillStyle = "rgba(0,0,0,.22)";
    c.fillRect(M.l, M.t, W - M.l - M.r, H - M.t - M.b);
    c.font = "10px -apple-system, 'Segoe UI', system-ui, sans-serif";
    c.textBaseline = "middle";
    c.strokeStyle = "rgba(201,164,92,.13)";
    c.fillStyle = "rgba(232,220,192,.62)";
    c.lineWidth = 1;
    const fx = o.x?.fmt || String, fy = o.y?.fmt || String;
    for (const v of axisTicks(sx, sx.log)) {
      const p = Math.round(sx(v)) + 0.5;
      if (!(p >= M.l - 1 && p <= W - M.r + 1)) continue;
      c.beginPath(); c.moveTo(p, M.t); c.lineTo(p, H - M.b); c.stroke();
      c.textAlign = "center";
      c.fillText(fx(v), p, H - M.b + 10);
    }
    for (const v of axisTicks(sy, sy.log)) {
      const p = Math.round(sy(v)) + 0.5;
      if (!(p >= M.t - 1 && p <= H - M.b + 1)) continue;
      c.beginPath(); c.moveTo(M.l, p); c.lineTo(W - M.r, p); c.stroke();
      c.textAlign = "right";
      c.fillText(fy(v), M.l - 5, p);
    }
    // axis titles
    c.fillStyle = "rgba(236,208,142,.9)";
    c.font = "11px 'Palatino Linotype', Palatino, Georgia, serif";
    c.textAlign = "center";
    c.fillText(`${o.x?.label || ""}${sx.log ? " (log)" : ""}`, (M.l + W - M.r) / 2, H - 9);
    c.save();
    c.translate(11, (M.t + H - M.b) / 2);
    c.rotate(-Math.PI / 2);
    c.fillText(`${o.y?.label || ""}${sy.log ? " (log)" : ""}`, 0, 0);
    c.restore();
    // reference lines
    c.save();
    c.beginPath();
    c.rect(M.l, M.t, W - M.l - M.r, H - M.t - M.b);
    c.clip();
    c.setLineDash([4, 4]);
    c.strokeStyle = "rgba(236,208,142,.45)";
    c.fillStyle = "rgba(236,208,142,.75)";
    c.font = "10px -apple-system, system-ui, sans-serif";
    for (const rl of o.refLines || []) {
      const [x0, x1] = sx.domain;
      const N = 24;
      c.beginPath();
      let last = null;
      for (let i = 0; i <= N; i++) {
        const xv = sx.log ? x0 * (x1 / x0) ** (i / N) : x0 + ((x1 - x0) * i) / N;
        const px = sx(xv), py = sy(xv * rl.k);
        if (px == null || py == null) continue;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        if (py >= M.t && py <= H - M.b) last = [px, py];
      }
      c.stroke();
      if (last && rl.label) { c.textAlign = "right"; c.fillText(rl.label, Math.min(last[0] - 3, W - M.r - 3), Math.max(M.t + 8, last[1] - 7)); }
    }
    for (const r of o.refX || []) {
      const px = sx(r.v);
      if (px == null) continue;
      c.beginPath(); c.moveTo(px, M.t); c.lineTo(px, H - M.b); c.stroke();
      if (r.label) { c.textAlign = "left"; c.fillText(r.label, px + 3, M.t + 8); }
    }
    for (const r of o.refY || []) {
      const py = sy(r.v);
      if (py == null) continue;
      c.beginPath(); c.moveTo(M.l, py); c.lineTo(W - M.r, py); c.stroke();
      if (r.label) { c.textAlign = "right"; c.fillText(r.label, W - M.r - 3, py - 7); }
    }
    c.setLineDash([]);
    // points
    const colorOf = o.color || (() => "#e0b54c");
    const drawPt = (q, faded) => {
      c.beginPath();
      c.arc(q.px, q.py, q.r, 0, Math.PI * 2);
      c.globalAlpha = faded ? 0.16 : 0.8;
      c.fillStyle = faded ? "#8c8270" : colorOf(q.p.c, q.p);
      c.fill();
      c.globalAlpha = faded ? 0.25 : 0.9;
      c.lineWidth = q.r > 4 ? 1 : 0.6;
      c.strokeStyle = "rgba(14,10,4,.9)";
      c.stroke();
    };
    c.globalAlpha = 1;
    if (sel) {
      for (const q of pts) if (!sel.has(q.p.key)) drawPt(q, true);
      for (const q of pts) if (sel.has(q.p.key)) drawPt(q, false);
    } else for (const q of pts) drawPt(q, false);
    c.globalAlpha = 1;
    // labels
    if (o.labels?.length) drawLabels(c);
    c.restore();
    // hot point
    const h = hot != null ? pts.find((q) => q.p.key === hot) : null;
    if (h) {
      c.beginPath();
      c.arc(h.px, h.py, h.r + 3, 0, Math.PI * 2);
      c.lineWidth = 4;
      c.strokeStyle = "rgba(8,6,2,.9)";
      c.stroke();
      c.lineWidth = 2;
      c.strokeStyle = "#fff3c4";
      c.stroke();
    }
    // the standing brush (dashed) while its selection is on, then a brush being dragged
    if (kept && sel && !brush) {
      const x0 = sx(kept.x0), x1 = sx(kept.x1), y0 = sy(kept.y0), y1 = sy(kept.y1);
      c.save();
      c.setLineDash([4, 3]);
      c.fillStyle = "rgba(236,208,142,.06)";
      c.strokeStyle = "rgba(236,208,142,.75)";
      c.lineWidth = 1;
      c.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      c.strokeRect(Math.min(x0, x1) + 0.5, Math.min(y0, y1) + 0.5, Math.abs(x1 - x0), Math.abs(y1 - y0));
      c.restore();
    }
    if (brush) {
      const x0 = Math.min(brush.x0, brush.x1), y0 = Math.min(brush.y0, brush.y1);
      c.fillStyle = "rgba(236,208,142,.12)";
      c.strokeStyle = "rgba(236,208,142,.9)";
      c.lineWidth = 1;
      c.fillRect(x0, y0, Math.abs(brush.x1 - brush.x0), Math.abs(brush.y1 - brush.y0));
      c.strokeRect(x0 + 0.5, y0 + 0.5, Math.abs(brush.x1 - brush.x0), Math.abs(brush.y1 - brush.y0));
    }
  }

  // Point labels, in priority order (o.labels), placed greedily: each tries right, left, above and below its dot
  // and is skipped when every spot overlaps a label already placed, a labelled dot, or the plot's edge.
  function drawLabels(c) {
    c.font = "600 10px -apple-system, system-ui, sans-serif";
    c.textAlign = "left";
    c.textBaseline = "middle";
    const byKey = new Map(pts.map((q) => [q.p.key, q]));
    const placed = [];
    const list = o.labels.map((k) => byKey.get(k)).filter((q) => q && (!sel || sel.has(q.p.key)));
    // The labelled dots themselves are obstacles too, so a label never sits on top of another named point.
    for (const q of list) placed.push({ x0: q.px - q.r, y0: q.py - q.r, x1: q.px + q.r, y1: q.py + q.r, dot: q });
    const H2 = 6.5;
    for (const q of list) {
      const t = q.p.label || String(q.p.key);
      const tw = c.measureText(t).width;
      const g = q.r + 3;
      const spots = [
        [q.px + g, q.py],
        [q.px - g - tw, q.py],
        [q.px - tw / 2, q.py - g - H2],
        [q.px - tw / 2, q.py + g + H2],
      ];
      let at = null;
      for (const [x, y] of spots) {
        const b = { x0: x - 1, y0: y - H2, x1: x + tw + 1, y1: y + H2 };
        if (b.x0 < M.l || b.x1 > W - M.r || b.y0 < M.t || b.y1 > H - M.b) continue;
        if (placed.some((a) => a.dot !== q && b.x0 < a.x1 && b.x1 > a.x0 && b.y0 < a.y1 && b.y1 > a.y0)) continue;
        at = { x, y, b };
        break;
      }
      if (!at) continue;
      placed.push(at.b);
      c.lineWidth = 3;
      c.lineJoin = "round";
      c.strokeStyle = "rgba(10,14,20,.9)";
      c.strokeText(t, at.x, at.y);
      c.fillStyle = "#f3e7c8";
      c.fillText(t, at.x, at.y);
    }
  }

  function hitAt(mx, my) {
    let best = null, bd = Infinity;
    for (let i = pts.length - 1; i >= 0; i--) {
      const q = pts[i];
      if (sel && !sel.has(q.p.key)) continue;
      const d = Math.hypot(q.px - mx, q.py - my);
      if (d <= q.r + 4 && d - q.r < bd) { best = q; bd = d - q.r; }
    }
    if (!best && sel) {
      for (let i = pts.length - 1; i >= 0; i--) {
        const q = pts[i];
        const d = Math.hypot(q.px - mx, q.py - my);
        if (d <= q.r + 3 && d - q.r < bd) { best = q; bd = d - q.r; }
      }
    }
    return best;
  }

  function showTip(q) {
    if (!q) { tip.hidden = true; return; }
    const p = q.p;
    const rows = [
      `<b>${esc(p.title || p.row?.full || p.label || p.key)}</b>${p.sub ? ` <span class="sub">${esc(p.sub)}</span>` : ""}`,
      `${esc(o.x?.label || "x")}: <b>${esc((o.x?.fmt || String)(p.x))}</b>`,
      `${esc(o.y?.label || "y")}: <b>${esc((o.y?.fmt || String)(p.y))}</b>`,
    ];
    if (o.size && fin(p.s)) rows.push(`${esc(o.size.label || "size")}: <b>${esc((o.size.fmt || String)(p.s))}</b>`);
    if (o.colorLabel && p.c != null && !o.colorIsSame) rows.push(`${esc(o.colorLabel)}: <b>${esc((o.colorFmt || String)(p.c))}</b>`);
    if (p.extra) rows.push(esc(p.extra));
    tip.innerHTML = rows.join("<br>");
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = `${clamp(q.px + 12 + tw > W ? q.px - tw - 12 : q.px + 12, 0, Math.max(0, W - tw))}px`;
    tip.style.top = `${clamp(q.py - th / 2, 0, Math.max(0, H - th))}px`;
  }

  function setHotInternal(q) {
    const key = q ? q.p.key : null;
    if (key === hot) return;
    hot = key;
    draw();
    showTip(q);
    o.onHover?.(q ? q.p : null);
  }

  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  cv.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const [mx, my] = pos(e);
    drag = { x0: mx, y0: my, moved: false };
    try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
  });
  cv.addEventListener("pointermove", (e) => {
    const [mx, my] = pos(e);
    if (drag && o.brush !== false) {
      if (!drag.moved && Math.hypot(mx - drag.x0, my - drag.y0) > 5) drag.moved = true;
      if (drag.moved) {
        brush = { x0: drag.x0, y0: drag.y0, x1: clamp(mx, M.l, W - M.r), y1: clamp(my, M.t, H - M.b) };
        tip.hidden = true;
        draw();
        return;
      }
    }
    if (e.pointerType !== "mouse" && !drag) return;
    setHotInternal(hitAt(mx, my));
  });
  cv.addEventListener("pointerup", (e) => {
    const [mx, my] = pos(e);
    const d = drag;
    drag = null;
    if (!d) return;
    if (d.moved && brush) {
      const x0 = Math.min(brush.x0, brush.x1), x1 = Math.max(brush.x0, brush.x1);
      const y0 = Math.min(brush.y0, brush.y1), y1 = Math.max(brush.y0, brush.y1);
      brush = null;
      const s = new Set(pts.filter((q) => q.px >= x0 && q.px <= x1 && q.py >= y0 && q.py <= y1).map((q) => q.p.key));
      sel = s.size ? s : null;
      kept = sel ? { x0: sx.invert(x0), x1: sx.invert(x1), y0: sy.invert(y0), y1: sy.invert(y1) } : null;
      draw();
      o.onBrush?.(sel);
      return;
    }
    const q = hitAt(mx, my);
    if (q) {
      if (e.pointerType !== "mouse") setHotInternal(q);
      o.onClick?.(q.p);
    } else if (sel) {
      sel = null;
      draw();
      o.onBrush?.(null);
    }
  });
  cv.addEventListener("pointerleave", () => { if (!drag) setHotInternal(null); });
  cv.addEventListener("pointercancel", () => { drag = null; brush = null; draw(); });
  // Keyboard: arrows step through points by x; Enter clicks.
  cv.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Enter", "Escape"].includes(e.key) || !pts.length) return;
    const byX = [...pts].sort((a, b) => a.px - b.px);
    let i = byX.findIndex((q) => q.p.key === hot);
    if (e.key === "Enter") { if (i >= 0) o.onClick?.(byX[i].p); e.preventDefault(); return; }
    if (e.key === "Escape") { if (hot != null || sel) { setHotInternal(null); if (sel) { sel = null; draw(); o.onBrush?.(null); } e.preventDefault(); e.stopPropagation(); } return; }
    i = e.key === "ArrowRight" ? Math.min(byX.length - 1, i + 1) : Math.max(0, (i < 0 ? byX.length : i) - 1);
    setHotInternal(byX[i]);
    e.preventDefault();
  });
  cv.addEventListener("blur", () => setHotInternal(null));

  const stopW = onWidth(root, () => layout());
  layout();

  return {
    el: root,
    update(next) { o = { ...o, ...next }; layout(); },
    setHot(key) {
      if (key === hot) return;
      hot = key ?? null;
      draw();
      showTip(hot != null ? pts.find((q) => q.p.key === hot) || null : null);
    },
    setSelected(set) { sel = set && set.size ? new Set(set) : null; kept = null; draw(); },
    get selected() { return sel; },
    destroy() { stopW(); root.remove(); },
  };
}
