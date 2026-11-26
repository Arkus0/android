// España Civ: el recuadro de Canarias. world.json `insets` = [{id, name, box: [x0, y0, x1, y1]}] en unidades de mapa.
// Se dibuja como un marco de doble filete con el nombre, igual que en los mapas impresos de España.
export function install(app) {
  const insets = app.data.world?.insets || [];
  if (!insets.length) return;
  app.registerStaticLayer({
    id: "insets",
    z: 92,
    keepInPlain: true, // el recuadro de Canarias también se ve en el modo juego
    sig: () => "v1",
    draw(ctx, vp, w, o) {
      const s = o.s; // css px por unidad de mapa
      for (const it of insets) {
        const [x0, y0, x1, y1] = it.box;
        if (x1 < vp.x0 || x0 > vp.x1 || y1 < vp.y0 || y0 > vp.y1) continue;
        ctx.save();
        ctx.lineJoin = "miter";
        ctx.strokeStyle = "rgba(20,14,6,0.75)";
        ctx.lineWidth = 5 / s;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = "rgba(201,164,92,0.95)";
        ctx.lineWidth = 2 / s;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        const g = 6 / s;
        ctx.strokeStyle = "rgba(201,164,92,0.45)";
        ctx.lineWidth = 1 / s;
        ctx.strokeRect(x0 + g, y0 + g, x1 - x0 - 2 * g, y1 - y0 - 2 * g);
        // etiqueta en la esquina superior izquierda, en px de pantalla
        o.screen();
        const [sx, sy] = o.toScreen(x0, y0);
        const label = (it.name || "").toUpperCase();
        const px = Math.max(10, Math.min(15, 6 + s * 25 * 0.35));
        ctx.font = `600 ${px}px Georgia, "Times New Roman", serif`;
        const tw = ctx.measureText(label).width + px * 1.4;
        ctx.fillStyle = "rgba(19,30,42,0.9)";
        ctx.fillRect(sx + 4, sy + 4, tw, px * 1.7);
        ctx.strokeStyle = "rgba(201,164,92,0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 4.5, sy + 4.5, tw - 1, px * 1.7 - 1);
        ctx.fillStyle = "#f3e6c4";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(label, sx + 4 + px * 0.7, sy + 4 + px * 0.88);
        o.world();
        ctx.restore();
      }
    },
  });
}
