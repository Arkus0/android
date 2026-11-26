// Layout helpers shared by the advisor views: sections, controls, stat tiles, sources and caveats.
import { esc, el, fin } from "./util.js";
import { icon } from "../../../ui/icon.js";

/** Append a titled section; returns its body element. opts: {title, note, kicker, collapsed, cls} */
export function section(parent, { title, note = "", kicker = "", cls = "", open = true } = {}) {
  const s = el("section", `adv-sec ${cls}`);
  if (!open) {
    s.innerHTML = `<details><summary><h3>${esc(title)}</h3></summary>${note ? `<p class="adv-note">${esc(note)}</p>` : ""}<div class="adv-sec-body"></div></details>`;
  } else {
    s.innerHTML = `${kicker ? `<div class="adv-kicker">${esc(kicker)}</div>` : ""}${title ? `<h3>${esc(title)}</h3>` : ""}${note ? `<p class="adv-note">${note}</p>` : ""}<div class="adv-sec-body"></div>`;
  }
  parent.appendChild(s);
  return s.querySelector(".adv-sec-body");
}

/** Headline tiles: [{label, value, sub, color}] → html */
export function tiles(items) {
  return `<div class="adv-tiles">${items.map((t) => `<div class="adv-tile"${t.color ? ` style="--tc:${esc(t.color)}"` : ""}>
    <span class="k">${esc(t.label)}</span><b title="${esc(t.value)}">${esc(t.value)}</b>${t.sub ? `<span class="s" title="${esc(t.sub)}">${esc(t.sub)}</span>` : ""}</div>`).join("")}</div>`;
}

/** A segmented control. options: [{value, label}] */
export function segmented(parent, { options, value, onChange, label = "" }) {
  const g = el("div", "adv-seg");
  g.setAttribute("role", "group");
  if (label) g.setAttribute("aria-label", label);
  const render = () => {
    g.innerHTML = options.map((o) => `<button type="button" data-v="${esc(o.value)}" aria-pressed="${String(o.value) === String(value)}">${esc(o.label)}</button>`).join("");
  };
  render();
  g.addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]");
    if (!b || b.dataset.v === String(value)) return;
    value = options.find((o) => String(o.value) === b.dataset.v)?.value ?? b.dataset.v;
    render();
    g.querySelector(`[data-v="${CSS.escape(String(value))}"]`)?.focus();
    onChange?.(value);
  });
  parent.appendChild(g);
  return { el: g, set(v) { value = v; render(); }, get value() { return value; } };
}

/** A labelled <select>. options: [{value, label, group?}] */
export function selectBox(parent, { options, value, onChange, label = "", cls = "" }) {
  const wrap = el("label", `adv-select ${cls}`);
  const groups = new Map();
  for (const o of options) {
    const g = o.group || "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(o);
  }
  const opt = (o) => `<option value="${esc(o.value)}"${String(o.value) === String(value) ? " selected" : ""}>${esc(o.label)}</option>`;
  wrap.innerHTML = `${label ? `<span>${esc(label)}</span>` : ""}<select>${[...groups].map(([g, list]) => (g ? `<optgroup label="${esc(g)}">${list.map(opt).join("")}</optgroup>` : list.map(opt).join(""))).join("")}</select>`;
  const s = wrap.querySelector("select");
  s.addEventListener("change", () => onChange?.(s.value));
  parent.appendChild(wrap);
  return { el: wrap, select: s, set(v) { s.value = v; }, get value() { return s.value; } };
}

/** Checkbox chips. items: [{key, label, color, icon (html), on, count}] → onChange(Set of on keys) */
export function chips(parent, { items, onChange, label = "" }) {
  const g = el("div", "adv-chips");
  g.setAttribute("role", "group");
  if (label) g.setAttribute("aria-label", label);
  const on = new Set(items.filter((i) => i.on !== false).map((i) => i.key));
  const render = () => {
    g.innerHTML = items.map((i) => `<button type="button" class="adv-chip" role="checkbox" aria-checked="${on.has(i.key)}" data-key="${esc(i.key)}" style="--cc:${esc(i.color || "#c9a45c")}">
      <i aria-hidden="true"></i>${i.icon ? `<span class="ic" aria-hidden="true">${i.icon}</span>` : ""}${esc(i.label)}${i.count != null ? `<span class="n">${esc(i.count)}</span>` : ""}</button>`).join("");
  };
  render();
  g.addEventListener("click", (e) => {
    const b = e.target.closest("[data-key]");
    if (!b) return;
    const k = b.dataset.key;
    if (e.altKey || e.metaKey) { on.clear(); on.add(k); } // alt/cmd-click: only this one
    else if (on.has(k)) on.delete(k);
    else on.add(k);
    render();
    g.querySelector(`[data-key="${CSS.escape(k)}"]`)?.focus();
    onChange?.(new Set(on));
  });
  parent.appendChild(g);
  return {
    el: g,
    get on() { return new Set(on); },
    set(keys) { on.clear(); for (const k of keys) on.add(k); render(); },
  };
}

/** "Show on map" lens button (toggles the lens). */
export function lensButton(app, lensId, label) {
  const lens = app.lensById?.get(lensId);
  if (!lens) return null;
  const b = el("button", "adv-lensbtn");
  b.type = "button";
  const sync = () => {
    const on = app.state.lens?.id === lensId;
    b.setAttribute("aria-pressed", String(on));
    b.innerHTML = `${icon(lens.icon || "layers", lens.emoji || "🗺️", { size: 14 })}<span>${esc(on ? `Mostrando ${lens.name}` : label || `Ver ${lens.name} en el mapa`)}</span>`;
  };
  sync();
  b.addEventListener("click", () => {
    app.setLens(app.state.lens?.id === lensId ? null : lensId);
    sync();
  });
  b._sync = sync;
  return b;
}

/**
 * "Map colour" picker: a segmented control that colours the map while the view is open (restored on exit by
 * ctx.setLens). options: [{value, label, lens: () => lens id | lens object | null}]. Follows lens changes made
 * elsewhere (the lens dock, L): when the map shows none of the options, no button is pressed.
 */
export function mapPicker(ctx, parent, { options, value, label = "Mapa" }) {
  const row = el("div", "adv-mappick");
  row.innerHTML = `<span class="k">${icon("layers", "▤", { size: 13 })}${esc(label)}</span>`;
  const resolve = (o) => {
    const r = o?.lens ? o.lens() : null;
    return typeof r === "string" ? ctx.app.lensById?.get(r) || null : r || null;
  };
  let busy = false;
  const pick = (v) => {
    const o = options.find((x) => x.value === v);
    busy = true;
    try { ctx.setLens(resolve(o)); } finally { busy = false; }
  };
  const seg = segmented(row, { label: `${label} colour`, options, value, onChange: (v) => pick(v) });
  const sync = (lens) => {
    const o = options.find((x) => resolve(x) === (lens || null));
    seg.set(o ? o.value : "__none");
  };
  ctx.on("lens", (lens) => { if (!busy) sync(lens); });
  parent.appendChild(row);
  pick(value);
  return {
    el: row,
    get value() { return seg.value; },
    /** Switch to option v (and colour the map with it). */
    set(v) { seg.set(v); pick(v); },
    /** Re-apply the current option (e.g. its lens depends on another control). */
    refresh() { if (options.some((o) => o.value === seg.value)) pick(seg.value); },
  };
}

/** A "Frame on map" button for a selection (handled by the advisors shell: flies to the view's highlight). */
export const frameBtn = () => `<button type="button" class="adv-mini adv-framebtn" data-frame title="Llevar el mapa a la selección"><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/></svg>Ver en el mapa</button>`;

/** Sources and caveats footer. ids: source ids from sources.json; caveats: [string] */
export function sourcesHtml(data, ids, caveats = []) {
  const list = [...new Set(ids)].map((id) => data.source(id)).filter(Boolean);
  return `<footer class="adv-sources">
    ${caveats.length ? `<h4>Léase con cuidado</h4><ul class="adv-caveats">${caveats.map((c) => `<li>${c}</li>`).join("")}</ul>` : ""}
    <h4>Fuentes</h4>
    <ul>${list.map((s) => `<li><b>${esc(s.title)}</b>, ${esc(s.publisher || "")}${s.vintage ? ` <span class="v">${esc(s.vintage)}</span>` : ""}</li>`).join("")}</ul>
    <button type="button" class="adv-link" data-pedia="Fuentes">Todas las fuentes, ficheros y sumas de control en el Almanaque</button>
  </footer>`;
}

/** Top-N helper: rows sorted by f desc (or asc), skipping non-finite, optional population floor. */
export function topBy(rows, f, { n = 10, asc = false, min = 0, pop = (r) => r.v.population } = {}) {
  return rows
    .filter((r) => !min || (pop(r) ?? 0) >= min)
    .map((r) => ({ r, v: f(r) }))
    .filter((x) => fin(x.v))
    .sort((a, b) => (asc ? a.v - b.v : b.v - a.v))
    .slice(0, n);
}
