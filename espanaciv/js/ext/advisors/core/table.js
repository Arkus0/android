// Sortable, searchable, virtualised data table (handles all 3,100 counties smoothly).
//
// createTable(host, opts) → {setRows(rows), setColumns(cols), setHot(key, scroll), setSelected(Set|null), destroy, el}
// opts:
//   columns: [{key, label, value(row) → sortable value, text(row) → string, html?(row), align: "l"|"r",
//              width ("1.4fr", "72px"), bar?: {max, color}, title?, tip?(row) → cell tooltip,
//              hideBelow?: px (drop the column while the table is narrower)}]
//   short: header html (may hold &shy; so a long word breaks with a hyphen); the header wraps to two lines.
//   Left-aligned cells get a tooltip with their full text (for a name column: "name, sub" with row.full).
//   rows, rowKey(row) = row.key, sort: {key, dir: "asc"|"desc"}, maxHeight = 340, rowH = 28,
//   search: placeholder text (adds a name filter), searchText(row) = row.name, rank (show the position)
//   onHover(row|null), onClick(row), caption (aria label), empty (text when no rows)
import { esc, fin, rafThrottle, onWidth } from "./util.js";

export function createTable(host, opts) {
  const rowH = opts.rowH || 28;
  let allCols = opts.columns;
  let width = 0;
  const visibleCols = () => allCols.filter((c) => !c.hideBelow || !width || width >= c.hideBelow);
  let cols = visibleCols();
  let all = opts.rows || [];
  let view = [];
  let sort = opts.sort || null;
  let query = "";
  let hot = null, sel = null;
  const keyOf = opts.rowKey || ((r) => r.key);

  const root = document.createElement("div");
  root.className = "adv-table";
  root.innerHTML = `${opts.search ? `<div class="adv-tsearch"><input type="search" placeholder="${esc(opts.search)}" aria-label="${esc(opts.search)}" spellcheck="false"><span class="cnt"></span></div>` : ""}
    <div class="adv-thead" role="row"></div>
    <div class="adv-tbody" role="rowgroup" tabindex="-1"><div class="adv-tspace"></div></div>`;
  root.setAttribute("role", "table");
  root.setAttribute("aria-label", opts.caption || "Tabla de datos");
  host.appendChild(root);
  width = Math.round(root.clientWidth) || 0;
  cols = visibleCols();
  const head = root.querySelector(".adv-thead");
  const body = root.querySelector(".adv-tbody");
  const space = root.querySelector(".adv-tspace");
  const input = root.querySelector(".adv-tsearch input");
  const cnt = root.querySelector(".adv-tsearch .cnt");

  const template = () => `${opts.rank ? "26px " : ""}${cols.map((c) => c.width || (c.align === "l" ? "minmax(0,1.6fr)" : "minmax(0,1fr)")).join(" ")}`;

  function renderHead() {
    root.style.setProperty("--cols", template());
    head.innerHTML = `${opts.rank ? `<span class="th r" role="columnheader">#</span>` : ""}${cols.map((c) => {
      const s = sort?.key === c.key ? sort.dir : null;
      return `<span class="th ${c.align === "l" ? "l" : "r"}" role="columnheader" aria-sort="${s === "asc" ? "ascending" : s === "desc" ? "descending" : "none"}">
        <button type="button" data-sort="${esc(c.key)}" title="${esc(c.title || `Ordenar por ${c.label}`)}">${c.short ? c.short : esc(c.label)}${s ? `<span class="arr" aria-hidden="true">${s === "asc" ? "▲" : "▼"}</span>` : ""}</button></span>`;
    }).join("")}`;
  }

  function compute() {
    const q = query.trim().toLowerCase();
    const txt = opts.searchText || ((r) => `${r.full || r.name || ""} ${r.name || ""} ${r.sub || ""}`);
    view = q ? all.filter((r) => txt(r).toLowerCase().includes(q)) : [...all];
    const c = sort && cols.find((x) => x.key === sort.key);
    if (c) {
      const dir = sort.dir === "asc" ? 1 : -1;
      const val = c.value || ((r) => r[c.key]);
      view.sort((a, b) => {
        const va = val(a), vb = val(b);
        const na = va == null || (typeof va === "number" && !fin(va)), nb = vb == null || (typeof vb === "number" && !fin(vb));
        if (na || nb) return na === nb ? 0 : na ? 1 : -1; // nulls last either way
        if (typeof va === "string" || typeof vb === "string") return dir * String(va).localeCompare(String(vb));
        return dir * (va - vb);
      });
    }
    if (cnt) cnt.textContent = `${view.length.toLocaleString("en-US")} of ${all.length.toLocaleString("en-US")}`;
    const maxH = opts.maxHeight || 340;
    const h = Math.min(maxH, Math.max(rowH * 2, view.length * rowH + 2));
    body.style.height = `${h}px`;
    space.style.height = `${view.length * rowH}px`;
    renderRows(true);
  }

  let drawn = { a: -1, b: -1 };
  function renderRows(force = false) {
    const top = body.scrollTop, h = body.clientHeight || parseFloat(body.style.height) || 300;
    const a = Math.max(0, Math.floor(top / rowH) - 6);
    const b = Math.min(view.length, Math.ceil((top + h) / rowH) + 6);
    if (!force && a === drawn.a && b === drawn.b) return;
    drawn = { a, b };
    let html = "";
    for (let i = a; i < b; i++) {
      const r = view[i];
      const k = String(keyOf(r));
      const cls = `adv-tr${k === String(hot) ? " hot" : ""}${sel?.has(keyOf(r)) ? " sel" : ""}`;
      html += `<div class="${cls}" role="row" data-i="${i}" data-key="${esc(k)}" tabindex="-1" style="top:${i * rowH}px;height:${rowH}px">${opts.rank ? `<span class="td r rk" role="cell">${i + 1}</span>` : ""}${cols.map((c) => {
        let inner = c.html ? c.html(r) : esc(c.text ? c.text(r) : r[c.key] ?? "–");
        if (c.bar) {
          const v = (c.value || ((x) => x[c.key]))(r);
          const wpc = fin(v) && c.bar.max > 0 ? Math.max(0, Math.min(1, Math.abs(v) / c.bar.max)) * 100 : 0;
          inner = `<span class="tbar" style="width:${wpc.toFixed(1)}%;${c.bar.color ? `background:${esc(typeof c.bar.color === "function" ? c.bar.color(r) : c.bar.color)}` : ""}"></span><span class="tv">${inner}</span>`;
        }
        const tip = c.tip ? c.tip(r) : c.align === "l" ? (c.key === "name" && r.name ? `${r.full || r.name}${r.sub ? `, ${r.sub}` : ""}` : c.text ? c.text(r) : null) : null;
        return `<span class="td ${c.align === "l" ? "l" : "r"}${c.bar ? " hasbar" : ""}" role="cell"${tip ? ` title="${esc(tip)}"` : ""}>${inner}</span>`;
      }).join("")}</div>`;
    }
    space.innerHTML = html || `<div class="adv-empty pad">${esc(opts.empty || "Sin filas.")}</div>`;
  }

  body.addEventListener("scroll", rafThrottle(() => renderRows()), { passive: true });
  head.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (!b) return;
    const k = b.dataset.sort;
    const c = cols.find((x) => x.key === k);
    sort = sort?.key === k ? { key: k, dir: sort.dir === "desc" ? "asc" : "desc" } : { key: k, dir: c?.align === "l" ? "asc" : "desc" };
    renderHead();
    compute();
    head.querySelector(`[data-sort="${CSS.escape(k)}"]`)?.focus();
  });
  input?.addEventListener("input", () => { query = input.value; body.scrollTop = 0; compute(); });

  let hovered = null;
  const rowFromEvent = (e) => {
    const n = e.target.closest?.(".adv-tr");
    return n ? view[+n.dataset.i] : null;
  };
  body.addEventListener("pointermove", (e) => {
    const r = rowFromEvent(e);
    if (r === hovered) return;
    hovered = r;
    setHotKey(r ? keyOf(r) : null, false);
    opts.onHover?.(r);
  });
  body.addEventListener("pointerleave", () => {
    if (hovered == null) return;
    hovered = null;
    setHotKey(null, false);
    opts.onHover?.(null);
  });
  body.addEventListener("click", (e) => {
    const r = rowFromEvent(e);
    if (r) opts.onClick?.(r);
  });
  // Keyboard: the body is focusable; arrows move the hot row, Enter opens it.
  body.tabIndex = 0;
  body.setAttribute("aria-label", `${opts.caption || "Tabla"}: usa las flechas para moverte entre filas e Intro para abrir una`);
  body.addEventListener("keydown", (e) => {
    if (!view.length) return;
    let i = view.findIndex((r) => String(keyOf(r)) === String(hot));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      i = e.key === "ArrowDown" ? Math.min(view.length - 1, i + 1) : Math.max(0, i - 1);
      setHotKey(keyOf(view[i]), true);
      opts.onHover?.(view[i]);
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === "Enter" && i >= 0) {
      opts.onClick?.(view[i]);
      e.preventDefault();
    }
  });
  body.addEventListener("blur", () => { if (!hovered) { setHotKey(null, false); opts.onHover?.(null); } });

  function setHotKey(key, scroll) {
    hot = key;
    space.querySelectorAll(".adv-tr.hot").forEach((n) => n.classList.remove("hot"));
    if (key == null) return;
    const i = view.findIndex((r) => String(keyOf(r)) === String(key));
    if (i < 0) return;
    if (scroll) {
      const top = i * rowH, h = body.clientHeight;
      if (top < body.scrollTop) body.scrollTop = top;
      else if (top + rowH > body.scrollTop + h) body.scrollTop = top + rowH - h;
      renderRows(true);
    }
    space.querySelector(`.adv-tr[data-i="${i}"]`)?.classList.add("hot");
  }

  renderHead();
  compute();
  // Columns marked hideBelow come and go with the table's width.
  const stopW = onWidth(root, (w) => {
    width = w;
    const next = visibleCols();
    if (next.length === cols.length) return;
    cols = next;
    renderHead();
    renderRows(true);
  });

  return {
    el: root,
    setRows(rows) { all = rows || []; compute(); },
    setColumns(c, s) { allCols = c; cols = visibleCols(); if (s !== undefined) sort = s; renderHead(); compute(); },
    setHot(key, scroll = true) { if (!hovered) setHotKey(key, scroll); },
    setSelected(set) { sel = set && set.size ? set : null; renderRows(true); },
    get rows() { return view; },
    destroy() { stopW(); root.remove(); },
  };
}
