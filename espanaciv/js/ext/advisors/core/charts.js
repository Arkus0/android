// Hand-written charts for the advisor dashboards (HTML bars and SVG; no libraries).
//
//   barList(host, opts)        horizontal bars (optionally diverging), one button per row
//   stackedBars(host, opts)    one stacked bar per row (parts by key), absolute or normalised to 100%
//   shareBar(host, opts)       a single stacked share bar with a swatch legend
//   donut(host, opts)          SVG donut with a centre label
//   histogram(host, opts)      SVG histogram (linear or log bins) with hoverable bins
//   smallMultiples(host, opts) a grid of small panels
//   rampLegend / swatchLegend / sizeLegend → HTML strings
// Every chart calls opts.onHover(item | null) and opts.onClick(item) and returns {setHot(key), el, ...}.
import { esc, fin, clamp, scale, ticks, logTicks, rampColor } from "./util.js";

/** Delegated hover / focus / click on [data-key] children. */
function wire(root, find, { onHover, onClick }) {
  let cur = null;
  const set = (item) => {
    if (item === cur) return;
    cur = item;
    onHover?.(item);
  };
  root.addEventListener("pointerover", (e) => {
    const t = e.target.closest("[data-key]");
    set(t && root.contains(t) ? find(t) : null);
  });
  root.addEventListener("pointerleave", () => set(null));
  root.addEventListener("focusin", (e) => {
    const t = e.target.closest("[data-key]");
    if (t) set(find(t));
  });
  root.addEventListener("focusout", (e) => {
    if (!root.contains(e.relatedTarget)) set(null);
  });
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-key]");
    if (t && root.contains(t)) onClick?.(find(t), e);
  });
}

const markHot = (root, key, cls = "hot") => {
  root.querySelectorAll(`.${cls}`).forEach((n) => n.classList.remove(cls));
  if (key == null) return null;
  const n = root.querySelector(`[data-key="${CSS.escape(String(key))}"]`);
  n?.classList.add(cls);
  return n;
};

// --- bar list --------------------------------------------------------------------------------------------------

/**
 * rows: [{key, label, sub, value, text, color, icon (html), tone: "good"|"bad"}]
 * opts: {diverging, max, onHover(row), onClick(row), selected (key), rank (show 1., 2., …), compact}
 */
export function barList(host, opts) {
  const rows = opts.rows || [];
  const max = opts.max ?? Math.max(1e-12, ...rows.map((r) => Math.abs(r.value) || 0));
  const root = document.createElement("div");
  root.className = `adv-bars${opts.diverging ? " div" : ""}${opts.compact ? " compact" : ""}`;
  root.setAttribute("role", "list");
  if (opts.ariaLabel) root.setAttribute("aria-label", opts.ariaLabel);
  root.innerHTML = rows.length ? rows.map((r, i) => {
    const wv = fin(r.value) ? clamp(Math.abs(r.value) / max, 0, 1) * (opts.diverging ? 50 : 100) : 0;
    const neg = fin(r.value) && r.value < 0;
    const style = opts.diverging ? `${neg ? "right:50%" : "left:50%"};width:${wv.toFixed(2)}%` : `width:${wv.toFixed(2)}%`;
    const color = r.color ? `background:${esc(r.color)}` : "";
    return `<button type="button" role="listitem" class="adv-bar${r.key === opts.selected ? " sel" : ""}" data-key="${esc(r.key)}" title="${esc([r.full || r.label, r.sub, r.text].filter(Boolean).join(" · "))}">
      ${opts.rank ? `<span class="rk">${i + 1}</span>` : ""}${r.icon ? `<span class="ic" aria-hidden="true">${r.icon}</span>` : ""}
      <span class="lb">${esc(r.label)}${r.sub ? ` <span class="sub">${esc(r.sub)}</span>` : ""}</span>
      <span class="vl${r.tone ? " " + r.tone : ""}">${esc(r.text ?? "")}</span>
      <span class="tr"><i class="${neg ? "neg" : ""}${r.tone ? " " + r.tone : ""}" style="${style};${color}"></i></span></button>`;
  }).join("") : `<p class="adv-empty">Sin datos.</p>`;
  host.appendChild(root);
  const byKey = new Map(rows.map((r) => [String(r.key), r]));
  wire(root, (t) => byKey.get(t.dataset.key), opts);
  return {
    el: root,
    setHot: (key) => markHot(root, key),
    setSelected: (key) => markHot(root, key, "sel"),
  };
}

// --- stacked bars ----------------------------------------------------------------------------------------------

/**
 * rows: [{key, label, sub, parts: {partKey: value}, total, text}]; keys: [{key, label, color}]
 * opts: {normalize, max, onHover({row, part}), onClick({row, part}), sortKey}
 */
export function stackedBars(host, opts) {
  const rows = opts.rows || [];
  const keys = opts.keys || [];
  const totalOf = (r) => r.total ?? keys.reduce((a, k) => a + (fin(r.parts[k.key]) ? r.parts[k.key] : 0), 0);
  const max = opts.max ?? Math.max(1e-12, ...rows.map(totalOf));
  const root = document.createElement("div");
  root.className = "adv-stack";
  root.setAttribute("role", "list");
  if (opts.ariaLabel) root.setAttribute("aria-label", opts.ariaLabel);
  root.innerHTML = rows.map((r) => {
    const tot = totalOf(r);
    const denom = opts.normalize ? tot || 1 : max;
    const segs = keys.map((k) => {
      const v = r.parts[k.key];
      if (!fin(v) || v <= 0) return "";
      const wpc = (v / denom) * 100;
      return `<i data-part="${esc(k.key)}" style="width:${wpc.toFixed(3)}%;background:${esc(k.color)}" title="${esc(`${k.label}: ${opts.fmt ? opts.fmt(v, k) : v}`)}"></i>`;
    }).join("");
    return `<button type="button" role="listitem" class="adv-srow" data-key="${esc(r.key)}" aria-label="${esc(`${r.label}: ${r.text ?? ""}`)}">
      <span class="lb">${esc(r.label)}${r.sub ? ` <span class="sub">${esc(r.sub)}</span>` : ""}</span>
      <span class="st">${segs}</span><span class="vl">${esc(r.text ?? "")}</span></button>`;
  }).join("") || `<p class="adv-empty">Sin datos.</p>`;
  host.appendChild(root);
  const byKey = new Map(rows.map((r) => [String(r.key), r]));
  let lastPart = null;
  root.addEventListener("pointermove", (e) => {
    const p = e.target.closest?.("[data-part]")?.dataset.part ?? null;
    if (p !== lastPart) {
      lastPart = p;
      const t = e.target.closest("[data-key]");
      if (t) opts.onHover?.({ row: byKey.get(t.dataset.key), part: p });
    }
  });
  wire(root, (t) => ({ row: byKey.get(t.dataset.key), part: lastPart }), {
    onHover: (x) => opts.onHover?.(x && x.row ? x : null),
    onClick: (x, e) => opts.onClick?.({ row: x.row, part: e.target.closest?.("[data-part]")?.dataset.part ?? null }),
  });
  return { el: root, setHot: (key) => markHot(root, key), setSelected: (key) => markHot(root, key, "sel") };
}

// --- share bar -------------------------------------------------------------------------------------------------

/** parts: [{key, label, value, color, text, icon}] → one bar plus a legend. opts: {onHover(part), onClick(part), selected} */
export function shareBar(host, opts) {
  const parts = (opts.parts || []).filter((p) => fin(p.value) && p.value > 0);
  const tot = parts.reduce((a, p) => a + p.value, 0) || 1;
  const root = document.createElement("div");
  root.className = "adv-share";
  root.innerHTML = `<div class="adv-share-bar" role="img" aria-label="${esc(parts.map((p) => `${p.label} ${((p.value / tot) * 100).toFixed(0)}%`).join(", "))}">
    ${parts.map((p) => `<i data-key="${esc(p.key)}" style="width:${((p.value / tot) * 100).toFixed(3)}%;background:${esc(p.color)}" title="${esc(`${p.label}: ${p.text ?? ""} (${((p.value / tot) * 100).toFixed(1)}%)`)}"></i>`).join("")}
  </div>
  ${opts.legend === false ? "" : `<div class="adv-swatches" role="list">${parts.map((p) => `<button type="button" role="listitem" class="adv-sw${p.key === opts.selected ? " sel" : ""}" data-key="${esc(p.key)}">
    <i style="background:${esc(p.color)}"></i>${p.icon ? `<span class="ic" aria-hidden="true">${p.icon}</span>` : ""}<span class="lb">${esc(p.label)}</span>
    <span class="vl">${((p.value / tot) * 100).toFixed(p.value / tot < 0.01 ? 1 : 0)}%</span></button>`).join("")}</div>`}`;
  host.appendChild(root);
  const byKey = new Map(parts.map((p) => [String(p.key), p]));
  wire(root, (t) => byKey.get(t.dataset.key), opts);
  return {
    el: root,
    setHot: (key) => { root.querySelectorAll(".hot").forEach((n) => n.classList.remove("hot")); if (key != null) root.querySelectorAll(`[data-key="${CSS.escape(String(key))}"]`).forEach((n) => n.classList.add("hot")); },
    setSelected: (key) => { root.querySelectorAll(".sel").forEach((n) => n.classList.remove("sel")); if (key != null) root.querySelectorAll(`[data-key="${CSS.escape(String(key))}"]`).forEach((n) => n.classList.add("sel")); },
  };
}

// --- donut -----------------------------------------------------------------------------------------------------

/** parts: [{key, label, value, color}]; opts: {size = 132, thickness = 22, center: {big, small}, onHover, onClick, interactive = true} */
export function donut(host, opts) {
  const parts = (opts.parts || []).filter((p) => fin(p.value) && p.value > 0);
  const size = opts.size || 132, th = opts.thickness || 22;
  const R = size / 2, r0 = R - th;
  const tot = parts.reduce((a, p) => a + p.value, 0) || 1;
  let a = -Math.PI / 2;
  const arc = (a0, a1) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rr, t) => `${(R + rr * Math.cos(t)).toFixed(2)},${(R + rr * Math.sin(t)).toFixed(2)}`;
    return `M${p(R - 1, a0)}A${R - 1},${R - 1} 0 ${large} 1 ${p(R - 1, a1)}L${p(r0, a1)}A${r0},${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
  };
  const segs = parts.map((p) => {
    const a0 = a, a1 = a + (p.value / tot) * Math.PI * 2 - (parts.length > 1 ? 0.012 : 0);
    a += (p.value / tot) * Math.PI * 2;
    const d = parts.length === 1 ? `M${R},1A${R - 1},${R - 1} 0 1 1 ${R - 0.01},1ZM${R},${th + 1}A${r0},${r0} 0 1 0 ${R + 0.01},${th + 1}Z` : arc(a0, a1);
    return `<path ${opts.interactive === false ? "data-part" : "data-key"}="${esc(p.key)}" d="${d}" fill="${esc(p.color)}" fill-rule="evenodd" tabindex="-1"><title>${esc(`${p.label}: ${((p.value / tot) * 100).toFixed(1)}%`)}</title></path>`;
  }).join("");
  const root = document.createElement("div");
  root.className = "adv-donut";
  root.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(opts.ariaLabel || parts.map((p) => `${p.label} ${((p.value / tot) * 100).toFixed(0)}%`).join(", "))}">
    ${segs}
    ${opts.center ? `<text x="${R}" y="${R - 2}" text-anchor="middle" class="big">${esc(opts.center.big || "")}</text><text x="${R}" y="${R + 14}" text-anchor="middle" class="small">${esc(opts.center.small || "")}</text>` : ""}
  </svg>`;
  host.appendChild(root);
  if (opts.interactive === false) {
    root.classList.add("passive");
    return { el: root, setHot() {} };
  }
  const byKey = new Map(parts.map((p) => [String(p.key), p]));
  wire(root, (t) => byKey.get(t.dataset.key), opts);
  return { el: root, setHot: (key) => markHot(root, key) };
}

// --- histogram -------------------------------------------------------------------------------------------------

/**
 * values: [{key, v}]; opts: {log, bins = 28, fmt(v), color, height = 120, width, label, domain,
 *   markers: [{v, label}], onHover(bin | null), onClick(bin)}   bin = {i, x0, x1, keys: [key], count}
 */
export function histogram(host, opts) {
  const W = opts.width || Math.max(240, host.clientWidth || 400), H = opts.height || 120;
  const m = { l: 8, r: 8, t: 8, b: 24 };
  const vals = (opts.values || []).filter((d) => fin(d.v) && (!opts.log || d.v > 0));
  const root = document.createElement("div");
  root.className = "adv-hist";
  host.appendChild(root);
  if (!vals.length) { root.innerHTML = `<p class="adv-empty">Sin datos.</p>`; return { el: root, setHot() {} }; }
  let [d0, d1] = opts.domain || [Math.min(...vals.map((d) => d.v)), Math.max(...vals.map((d) => d.v))];
  if (!(d1 > d0)) d1 = d0 + 1;
  const nb = opts.bins || 28;
  const t = opts.log ? (v) => Math.log10(v) : (v) => v;
  const ti = opts.log ? (v) => 10 ** v : (v) => v;
  const a = t(d0), b = t(d1);
  const bins = Array.from({ length: nb }, (_, i) => ({ i, x0: ti(a + ((b - a) * i) / nb), x1: ti(a + ((b - a) * (i + 1)) / nb), keys: [], count: 0, weight: 0 }));
  for (const d of vals) {
    const k = clamp(Math.floor(((t(d.v) - a) / (b - a)) * nb), 0, nb - 1);
    bins[k].keys.push(d.key);
    bins[k].count++;
    bins[k].weight += fin(d.w) ? d.w : 1;
  }
  const ymax = Math.max(1, ...bins.map((x) => (opts.weighted ? x.weight : x.count)));
  const x = scale([a, b], [m.l, W - m.r]);
  const bw = (W - m.l - m.r) / nb;
  const tk = opts.log ? logTicks(d0, d1) : ticks(d0, d1, 5);
  const fmt = opts.fmt || ((v) => String(v));
  const color = opts.color || "#c9a45c";
  root.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "Histograma")}">
    ${bins.map((bn) => {
      const v = opts.weighted ? bn.weight : bn.count;
      const h = (v / ymax) * (H - m.t - m.b);
      const fill = opts.colorOf ? opts.colorOf((bn.x0 + bn.x1) / 2, bn.i / (nb - 1)) : color;
      return `<g data-key="${bn.i}" class="bin"><rect class="hit" x="${(m.l + bn.i * bw).toFixed(2)}" y="${m.t}" width="${bw.toFixed(2)}" height="${H - m.t - m.b}"/>
        <rect class="bar" x="${(m.l + bn.i * bw + 0.5).toFixed(2)}" y="${(H - m.b - h).toFixed(2)}" width="${Math.max(0.5, bw - 1).toFixed(2)}" height="${h.toFixed(2)}" fill="${esc(fill)}"/>
        <title>${esc(`${fmt(bn.x0)} – ${fmt(bn.x1)}: ${bn.count}${opts.unitLabel ? " " + opts.unitLabel : ""}${opts.weighted && opts.weightFmt ? ` (${opts.weightFmt(bn.weight)})` : ""}`)}</title></g>`;
    }).join("")}
    <line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b + 0.5}" y2="${H - m.b + 0.5}" class="axis"/>
    ${tk.map((v) => { const px = x(t(v)); return px == null ? "" : `<line x1="${px}" x2="${px}" y1="${H - m.b}" y2="${H - m.b + 4}" class="axis"/><text x="${px}" y="${H - 6}" text-anchor="middle" class="tick">${esc(fmt(v))}</text>`; }).join("")}
    ${(opts.markers || []).map((mk) => { const px = x(t(mk.v)); return px == null ? "" : `<line x1="${px}" x2="${px}" y1="${m.t}" y2="${H - m.b}" class="marker"/><text x="${clamp(px + 3, m.l, W - 60)}" y="${m.t + 9}" class="mk">${esc(mk.label)}</text>`; }).join("")}
  </svg>`;
  wire(root, (g) => bins[+g.dataset.key], opts);
  return {
    el: root,
    bins,
    binOf: (v) => (fin(v) && (!opts.log || v > 0) ? bins[clamp(Math.floor(((t(v) - a) / (b - a)) * nb), 0, nb - 1)] : null),
    setHot: (i) => markHot(root, i),
  };
}

// --- small multiples -------------------------------------------------------------------------------------------

/** items: [{key, label, sub}]; opts: {render(cellEl, item), onHover(item), onClick(item), min = 120 (px per cell)} */
export function smallMultiples(host, opts) {
  const root = document.createElement("div");
  root.className = "adv-multiples";
  root.style.setProperty("--min", `${opts.min || 120}px`);
  root.setAttribute("role", "list");
  for (const it of opts.items || []) {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "adv-mult";
    c.dataset.key = it.key;
    c.setAttribute("role", "listitem");
    c.innerHTML = `<span class="lb">${esc(it.label)}${it.sub ? ` <span class="sub">${esc(it.sub)}</span>` : ""}</span><span class="body"></span>`;
    opts.render?.(c.querySelector(".body"), it);
    root.appendChild(c);
  }
  host.appendChild(root);
  const byKey = new Map((opts.items || []).map((x) => [String(x.key), x]));
  wire(root, (t) => byKey.get(t.dataset.key), opts);
  return { el: root, setHot: (key) => { const n = markHot(root, key); n?.scrollIntoView?.({ block: "nearest" }); } };
}

// --- legends ---------------------------------------------------------------------------------------------------

export function rampLegend({ ramp, domain, fmt = String, label = "", log = false, mid = null }) {
  const stops = ramp.map((c, i) => `${c} ${((i / (ramp.length - 1)) * 100).toFixed(1)}%`).join(",");
  const midTxt = mid != null ? `<span class="mid">${esc(fmt(mid))}</span>` : log ? `<span class="mid">${esc(fmt(Math.sqrt(domain[0] * domain[1])))}</span>` : "";
  return `<div class="adv-legend ramp">${label ? `<span class="t">${esc(label)}</span>` : ""}
    <span class="g" style="background:linear-gradient(90deg,${stops})"></span>
    <span class="ends"><span>${esc(fmt(domain[0]))}</span>${midTxt}<span>${esc(fmt(domain[1]))}</span></span></div>`;
}

export function swatchLegend(items, label = "") {
  return `<div class="adv-legend sw">${label ? `<span class="t">${esc(label)}</span>` : ""}${items
    .map((it) => `<span class="it"><i style="background:${esc(it.color)}"></i>${esc(it.label)}</span>`).join("")}</div>`;
}

/** Circles for values (e.g. [100, 1000, 4000]) with radius fn r(v) (px). */
export function sizeLegend(values, r, fmt = String, label = "") {
  const rs = values.map((v) => Math.max(1.5, r(v)));
  const H = Math.ceil(Math.max(...rs) * 2 + 4);
  let x = 4;
  const circles = values.map((v, i) => {
    const cx = x + rs[i];
    x += rs[i] * 2 + 26;
    return `<circle cx="${cx.toFixed(1)}" cy="${(H - rs[i] - 2).toFixed(1)}" r="${rs[i].toFixed(1)}"/><text x="${(cx + rs[i] + 3).toFixed(1)}" y="${H - 3}">${esc(fmt(v))}</text>`;
  }).join("");
  return `<div class="adv-legend size">${label ? `<span class="t">${esc(label)}</span>` : ""}<svg width="${x + 20}" height="${H}" aria-hidden="true">${circles}</svg></div>`;
}

export { rampColor };
