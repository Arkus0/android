import { esc } from "../format.js";
import { icon, glyph } from "./icon.js";
import { statDefs, fmtStat } from "./yieldReport.js";

// The national stats are buttons: each opens its report (ui/yieldReport.js, wired in main.js).
export function renderTopbar(nation) {
  const items = statDefs(nation).map((d) => {
    const ic = d.yield ? glyph(d.yield, 17) : icon(d.iconId, d.emoji, { size: 17 });
    const value = fmtStat(d, d.value);
    const tip = `${d.name}: ${d.description} Pulsa para ver el informe.`;
    return `<button type="button" class="yield" data-report="${esc(d.key)}" aria-expanded="false" aria-haspopup="dialog" aria-controls="yield-report"
      title="${esc(tip)}" aria-label="${esc(d.name)}: ${esc(value)}. Abrir el informe">
      <span class="ico" style="color:${esc(d.color)}">${ic}</span><span style="color:${esc(d.color)}">${esc(value)}</span><span class="caret" aria-hidden="true"></span></button>`;
  });
  const el = document.getElementById("yields");
  el.innerHTML = items.join("");
  // When the bar is too narrow for every yield, the row scrolls on its own (search and buttons always fit);
  // a fade on the right edge shows there is more.
  const check = () => el.classList.toggle("clipped", el.scrollWidth > el.clientWidth + 1);
  if (typeof ResizeObserver === "function") new ResizeObserver(check).observe(el);
  check();
  watchBarOverflow(document.getElementById("topbar"));
  document.getElementById("turn").innerHTML = `Turno <b>${esc(nation.year ?? "")}</b> · ${esc(nation.vintage || "")}`;
}

// Phones scroll the whole bar sideways. Mark which ends have more to show (.more-l / .more-r) so CSS can fade
// them: without a cue the yields look cut off after the second or third value.
function watchBarOverflow(bar) {
  if (!bar || bar.dataset.overflowWatch) return;
  bar.dataset.overflowWatch = "1";
  let raf = 0;
  const update = () => {
    raf = 0;
    const max = bar.scrollWidth - bar.clientWidth;
    bar.classList.toggle("more-l", max > 1 && bar.scrollLeft > 1);
    bar.classList.toggle("more-r", max > 1 && bar.scrollLeft < max - 1);
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  bar.addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(queue);
    ro.observe(bar);
    for (const child of bar.children) ro.observe(child);
  }
  // Extensions add top-bar buttons later.
  if (typeof MutationObserver === "function") new MutationObserver(queue).observe(bar, { childList: true, subtree: true });
  queue();
}
