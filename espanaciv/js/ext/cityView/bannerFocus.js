// Banner focus while the City View is open: the city's own banner stays at full strength and the others step back.
//
//   * app.state.bannerFocus = the open city (render/banners.js): the other banners fade and drop their yield tier;
//     a hovered one comes back to full strength, and they all still click through to their city.
//   * Cities inside the metro's box lose their banner while the view is open (app.state.cities, the list the
//     banners are drawn from, is narrowed and restored on close), so no plate sits on the metro's hexes. Their hexes
//     still open them on a click.
//   * focusRect(ctx, cam): where the open city's banner sits on screen this frame, so the map layer's plaques,
//     pills and labels can keep out of its way.
import { drawBanners } from "../../render/banners.js";

export function createBannerFocus(app) {
  let model = null;
  let saved = null; // {cities, focus} before the view changed them
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const pctx = probe.getContext("2d");

  function set(m) {
    const st = app.state;
    model = m || null;
    if (!m) {
      if (saved) {
        if (st.cities === saved.narrowed) st.cities = saved.cities;
        st.bannerFocus = saved.focus;
      }
      saved = null;
      return;
    }
    if (!saved) saved = { cities: st.cities, focus: st.bannerFocus ?? null, narrowed: null };
    const g = app.w.grid;
    const b = m.bbox;
    const inside = (c) => c.cell != null && (m.mask.has(c.cell)
      || (b && g.cx(c.cell) >= b.x0 && g.cx(c.cell) <= b.x1 && g.cy(c.cell) >= b.y0 && g.cy(c.cell) <= b.y1));
    saved.narrowed = saved.cities.filter((c) => c === m.city || !inside(c));
    st.cities = saved.narrowed;
    st.bannerFocus = m.city;
  }

  // The open city's banner rect, measured by drawing it alone into a 1×1 canvas at the same device scale (the same
  // sprite as the real one, so this costs one tiny drawImage). It is pinned first, so it is never displaced.
  function focusRect(ctx, cam) {
    if (!model || model.city.cell == null) return null;
    const t = typeof ctx.getTransform === "function" ? ctx.getTransform() : null;
    const k = t && t.a > 0 ? t.a : 1;
    pctx.setTransform(k, 0, 0, k, 0, 0);
    const st = { cities: [], selectedCity: model.city, bannerFocus: model.city, hoverCell: -1, nation: app.data.nation, cityBadges: app.state.cityBadges };
    const h = drawBanners(pctx, cam, app.w, st, app.data.nation?.yields || [], app.data.nation)[0];
    return h ? { x: h.x, y: h.y, w: h.w, h: h.h } : null;
  }

  return { set, focusRect };
}
