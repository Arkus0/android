// Dibujo de «Hispania» sobre el mapa: dos overlays de app.registerOverlay.
//   mundo (z 50): territorios, recursos, ciudades, alcance de la unidad elegida, la ruta y la niebla de guerra.
//   pantalla (z 120): unidades, estandartes de las ciudades y los números de daño flotantes.
// Los caminos (Path2D) de territorio y niebla se cachean por revisión de la partida (game.rev).
import { drawCityTile } from "../../render/art/city.js";
import { UNITS, RESOURCES, IMPROVEMENTS } from "./rules.js";
import { K, cityYield, itemCost, itemEmoji, growthNeed, cityMaxHp, isMilitary, isNaval, cityById, has, atWar } from "./sim.js";

const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };

export function createRenderer(app, game) {
  const w = app.w, grid = w.grid, R = grid.R, C = grid.corners;
  const cache = { rev: -1 };
  const fx = []; // {x, y, text, color, t0}
  let banners = []; // {x0, y0, x1, y1, city}
  let tokens = []; // {u, x, y, r}: dónde se ha dibujado cada unidad (para tocarla)
  const pings = []; // {cell, color, t0}

  function hexPath(p, i) {
    const x = grid.cx(i), y = grid.cy(i);
    p.moveTo(x + C[0][0], y + C[0][1]);
    for (let k = 1; k < 6; k++) p.lineTo(x + C[k][0], y + C[k][1]);
    p.closePath();
  }
  function rebuild() {
    const { G, M, vis } = game;
    const n = M.n;
    const ownerOf = new Int16Array(n).fill(-1);
    const cityOwner = new Map(G.cities.map((c) => [c.id, c.owner]));
    for (let i = 0; i < n; i++) if (G.tileOwner[i] >= 0) ownerOf[i] = cityOwner.get(G.tileOwner[i]) ?? -1;
    const fills = new Map(), edges = new Map();
    for (let i = 0; i < n; i++) {
      const o = ownerOf[i];
      if (o < 0 || !G.explored[i]) continue;
      if (!fills.has(o)) { fills.set(o, new Path2D()); edges.set(o, new Path2D()); }
      hexPath(fills.get(o), i);
      const x = grid.cx(i), y = grid.cy(i);
      const e = edges.get(o);
      for (let d = 0; d < 6; d++) {
        const j = M.nb[i * 6 + d];
        if (j >= 0 && ownerOf[j] === o) continue;
        // inset ligero hacia dentro para que dos fronteras vecinas no se pisen
        const a = C[d], b = C[(d + 1) % 6], k = 0.9;
        e.moveTo(x + a[0] * k, y + a[1] * k);
        e.lineTo(x + b[0] * k, y + b[1] * k);
      }
    }
    const dark = new Path2D(), dim = new Path2D();
    for (let i = 0; i < n; i++) {
      if (!G.explored[i]) hexPath(dark, i);
      else if (!vis[i]) hexPath(dim, i);
    }
    // caminos (y vías de tren en el territorio de quien conoce el ferrocarril)
    const road = new Path2D(), rail = new Path2D();
    const cityCells = new Set(G.cities.map((c) => c.cell));
    const isRoad = (i) => G.road[i] || cityCells.has(i);
    for (const k of Object.keys(G.road)) {
      const i = +k;
      if (!G.explored[i]) continue;
      const o = ownerOf[i];
      const P = o >= 0 ? G.players[o] : null;
      const path = P && has(P, "ferrocarril") ? rail : road;
      let any = false;
      for (let d = 0; d < 6; d++) {
        const j = M.nb[i * 6 + d];
        if (j < 0 || !isRoad(j) || (G.road[j] && j < i)) continue;
        path.moveTo(grid.cx(i), grid.cy(i));
        path.lineTo(grid.cx(j), grid.cy(j));
        any = true;
      }
      if (!any) { path.moveTo(grid.cx(i) - R * 0.25, grid.cy(i)); path.lineTo(grid.cx(i) + R * 0.25, grid.cy(i)); }
    }
    cache.fills = fills; cache.edges = edges; cache.dark = dark; cache.dim = dim; cache.ownerOf = ownerOf; cache.road = road; cache.rail = rail;
    cache.rev = game.rev;
  }

  function fakePop(pop) { return pop < 4 ? 6e4 : pop < 8 ? 9e4 : pop < 12 ? 1.6e5 : 4.2e5; }

  const world = {
    id: "game-world", z: 50, space: "world",
    draw(ctx, cam) {
      const { G, M, vis } = game;
      if (!G || !M) return;
      if (cache.rev !== game.rev) rebuild();
      const s = cam.scale, Rpx = R * s;
      const v = cam.view();
      const inView = (i, m = R * 2) => {
        const x = grid.cx(i), y = grid.cy(i);
        return x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m;
      };
      // territorios
      for (const [o, p] of cache.fills) { ctx.fillStyle = rgba(G.players[o].color, 0.16); ctx.fill(p); }
      ctx.lineJoin = "round";
      for (const [o, p] of cache.edges) {
        ctx.strokeStyle = "rgba(0,0,0,.55)";
        ctx.lineWidth = 4.2 / s;
        ctx.stroke(p);
        ctx.strokeStyle = G.players[o].color;
        ctx.lineWidth = 2.4 / s;
        ctx.stroke(p);
      }
      // caminos y vías
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(90,62,30,.85)"; ctx.lineWidth = Math.max(1.5 / s, R * 0.09); ctx.stroke(cache.road);
      ctx.strokeStyle = "rgba(196,160,104,.9)"; ctx.lineWidth = Math.max(0.8 / s, R * 0.045); ctx.stroke(cache.road);
      ctx.strokeStyle = "rgba(30,30,34,.9)"; ctx.lineWidth = Math.max(2 / s, R * 0.1); ctx.stroke(cache.rail);
      ctx.setLineDash([R * 0.12, R * 0.1]); ctx.strokeStyle = "rgba(200,200,200,.9)"; ctx.lineWidth = Math.max(1 / s, R * 0.05); ctx.stroke(cache.rail); ctx.setLineDash([]);
      // rutas comerciales (las tuyas en oro)
      for (const r of G.routes || []) {
        const a = cityById(G, r.from), b = cityById(G, r.to);
        if (!a || !b || !G.explored[a.cell] || !G.explored[b.cell]) continue;
        const x0 = grid.cx(a.cell), y0 = grid.cy(a.cell), x1 = grid.cx(b.cell), y1 = grid.cy(b.cell);
        const mx = (x0 + x1) / 2 - (y1 - y0) * 0.15, my = (y0 + y1) / 2 + (x1 - x0) * 0.15;
        ctx.strokeStyle = r.owner === 0 ? "rgba(245,205,90,.85)" : "rgba(230,230,230,.35)";
        ctx.lineWidth = (r.owner === 0 ? 2.2 : 1.4) / s;
        ctx.setLineDash([6 / s, 5 / s]);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
        ctx.setLineDash([]);
      }
      // recursos y mejoras (solo en lo explorado)
      if (Rpx > 13) {
        ctx.save();
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `${Math.round(R * 0.5)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        for (const k of Object.keys(G.improv)) {
          const i = +k;
          if (!G.explored[i] || !inView(i)) continue;
          const x = grid.cx(i) - R * 0.4, y = grid.cy(i) + R * 0.38;
          ctx.fillStyle = "rgba(240,230,200,.8)";
          ctx.beginPath(); ctx.arc(x, y, R * 0.32, 0, Math.PI * 2); ctx.fill();
          ctx.fillText(IMPROVEMENTS[G.improv[k]]?.emoji || "", x, y + R * 0.02);
        }
        ctx.restore();
      }
      if (Rpx > 11) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `${Math.round(R * 0.62)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        for (let i = 0; i < M.n; i++) {
          const r = M.res[i];
          if (!r || !G.explored[i] || !inView(i)) continue;
          if (G.cities.some((c) => c.cell === i)) continue;
          const x = grid.cx(i) + R * 0.38, y = grid.cy(i) - R * 0.38;
          ctx.fillStyle = "rgba(15,20,28,.72)";
          ctx.beginPath(); ctx.arc(x, y, R * 0.42, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillText(RESOURCES[r].emoji, x, y + R * 0.03);
        }
        ctx.restore();
      }
      // ciudades
      for (const c of G.cities) {
        if (!G.explored[c.cell] || !inView(c.cell, R * 3)) continue;
        const col = hexRgb(G.players[c.owner].color);
        drawCityTile(ctx, { population: fakePop(c.pop), capital: c.capital, cell: c.cell, id: `g${c.id}` }, grid.cx(c.cell), grid.cy(c.cell), R, { Rpx, s, stateColor: col, seed: c.cell });
      }
      // ciudad elegida: sus casillas trabajadas
      if (game.selCity) {
        const c = game.selCity;
        const y = cityYield(G, M, c);
        ctx.fillStyle = "rgba(255,236,170,.22)";
        ctx.strokeStyle = "rgba(255,236,170,.8)";
        ctx.lineWidth = 1.5 / s;
        for (const i of y.worked) { const p = new Path2D(); hexPath(p, i); ctx.fill(p); ctx.stroke(p); }
      }
      // alcance y objetivos de la unidad elegida
      const u = game.selUnit;
      if (u && u.owner === 0) {
        if (game.reach) {
          const p = new Path2D();
          for (const i of game.reach.keys()) hexPath(p, i);
          ctx.fillStyle = "rgba(255,240,190,.13)";
          ctx.fill(p);
        }
        for (const t of game.targets || []) {
          ctx.strokeStyle = "rgba(255,80,60,.95)";
          ctx.lineWidth = 3 / s;
          const p = new Path2D(); hexPath(p, t); ctx.stroke(p);
        }
        if (game.target) {
          ctx.strokeStyle = game.target.attack ? "rgba(255,80,60,1)" : "rgba(255,233,168,1)";
          ctx.lineWidth = 4 / s;
          const p = new Path2D(); hexPath(p, game.target.cell); ctx.stroke(p);
        }
        const pv = game.target?.path ? game.target : game.pathPreview;
        if (pv && pv.path.length) {
          const pts = [u.cell, ...pv.path];
          ctx.strokeStyle = pv.attack ? "rgba(255,90,70,.95)" : "rgba(255,250,225,.92)";
          ctx.lineWidth = 3 / s;
          ctx.setLineDash([7 / s, 5 / s]);
          ctx.beginPath();
          pts.forEach((c, k) => (k ? ctx.lineTo(grid.cx(c), grid.cy(c)) : ctx.moveTo(grid.cx(c), grid.cy(c))));
          ctx.stroke();
          ctx.setLineDash([]);
          // marcas de fin de turno
          ctx.font = `bold ${Math.max(9, 12 / s) }px sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          for (let k = 0; k < pv.path.length; k++) {
            const t = pv.turns[k];
            const endOfTurn = k === pv.path.length - 1 || pv.turns[k + 1] !== t;
            if (!endOfTurn) continue;
            const x = grid.cx(pv.path[k]), y = grid.cy(pv.path[k]);
            ctx.fillStyle = "rgba(20,24,30,.85)";
            ctx.beginPath(); ctx.arc(x, y, 8 / s, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#ffe9a8";
            ctx.font = `bold ${10 / s}px sans-serif`;
            ctx.fillText(String(t + 1), x, y + 0.5 / s);
          }
        }
      }
      // niebla de guerra
      ctx.fillStyle = "rgba(5,9,15,.45)";
      ctx.fill(cache.dim);
      ctx.fillStyle = "rgba(9,14,22,.97)";
      ctx.fill(cache.dark);
    },
  };

  const screen = {
    id: "game-screen", z: 120, space: "screen",
    draw(ctx, cam) {
      const { G, M, vis } = game;
      if (!G || !M) return;
      const s = cam.scale, Rpx = R * s;
      const toS = (i) => [(grid.cx(i) - cam.x) * s + cam.w / 2, (grid.cy(i) - cam.y) * s + cam.h / 2];
      const on = (x, y, m = 60) => x > -m && y > -m && x < cam.w + m && y < cam.h + m;
      // unidades
      const r = Math.max(game.touch ? 12 : 9, Math.min(20, Rpx * 0.42));
      tokens = [];
      const byCell = new Map();
      for (const u of G.units) {
        if (u.owner !== 0 && !vis[u.cell]) continue;
        if (!byCell.has(u.cell)) byCell.set(u.cell, []);
        byCell.get(u.cell).push(u);
      }
      const cityCells = new Set(G.cities.map((c) => c.cell));
      for (const [cell, us] of byCell) {
        const [x0, y0] = toS(cell);
        if (!on(x0, y0)) continue;
        us.sort((a, b) => Number(isMilitary(b)) - Number(isMilitary(a)));
        us.forEach((u, k) => {
          const civ = !isMilitary(u);
          let x = x0, y = y0 + (cityCells.has(cell) ? Rpx * 0.32 : 0);
          if (us.length > 1 && k > 0) { x += r * 0.9; y += r * 0.55; }
          const rr = civ && us.length > 1 ? r * 0.78 : r;
          drawUnit(ctx, G, u, x, y, rr, u === game.selUnit);
          tokens.push({ u, x, y, r: rr });
        });
      }
      // estandartes de ciudad
      banners = [];
      const fs = Math.max(10, Math.min(14, Rpx * 0.5));
      ctx.font = `600 ${fs}px Palatino, Georgia, serif`;
      for (const c of G.cities) {
        if (!G.explored[c.cell]) continue;
        const [x, y0] = toS(c.cell);
        if (!on(x, y0, 200)) continue;
        const y = y0 - Rpx * 0.95 - 4;
        const P = G.players[c.owner];
        const label = c.name;
        const tw = ctx.measureText(label).width;
        const pw = fs + 8;
        const W = tw + pw + 14 + (c.capital ? fs : 0);
        const H = fs + 9;
        const bx = x - W / 2, by = y - H;
        ctx.fillStyle = "rgba(12,18,26,.9)";
        roundRect(ctx, bx, by, W, H, 4); ctx.fill();
        ctx.strokeStyle = P.color; ctx.lineWidth = 1.6; ctx.stroke();
        // población
        ctx.fillStyle = P.color;
        roundRect(ctx, bx, by, pw, H, 4); ctx.fill();
        ctx.fillStyle = P.ink;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(c.pop), bx + pw / 2, by + H / 2 + 0.5);
        ctx.fillStyle = "#f3e6c4";
        ctx.textAlign = "left";
        ctx.fillText((c.capital ? "★ " : "") + label, bx + pw + 6, by + H / 2 + 0.5);
        // producción (propias) y vida (si está dañada)
        if (c.owner === 0) {
          const it = c.build;
          const prog = it && it.kind !== "trade" ? Math.min(1, c.prod / Math.max(1, itemCost(G, it, 0))) : 0;
          ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(bx + 2, by + H - 3, W - 4, 3);
          ctx.fillStyle = it ? "#e8a33c" : "#d9534f"; ctx.fillRect(bx + 2, by + H - 3, (W - 4) * (it ? prog : 1), 3);
          if (!it) {
            ctx.font = `${fs}px sans-serif`;
            ctx.fillText("⚠", bx + W + 3, by + H / 2);
            ctx.font = `600 ${fs}px Palatino, Georgia, serif`;
          }
        }
        const mh = cityMaxHp(c);
        if (c.hp < mh) {
          ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(bx, by - 5, W, 4);
          ctx.fillStyle = c.hp / mh > 0.5 ? "#6bd36b" : c.hp / mh > 0.25 ? "#f0c040" : "#e5533d";
          ctx.fillRect(bx, by - 5, W * (c.hp / mh), 4);
        }
        if (game.selCity === c) { ctx.strokeStyle = "#ffe9a8"; ctx.lineWidth = 2; roundRect(ctx, bx - 2, by - 2, W + 4, H + 4, 5); ctx.stroke(); }
        banners.push({ x0: bx, y0: by, x1: bx + W, y1: by + H, city: c });
      }
      // avisos: anillos que se expanden sobre lo que ha pasado
      const now = performance.now();
      for (let k = pings.length - 1; k >= 0; k--) {
        const g = pings[k];
        const t = (now - g.t0) / 2600;
        if (t >= 1) { pings.splice(k, 1); continue; }
        const [x, y] = toS(g.cell);
        for (const off of [0, 0.33]) {
          const tt = (t + off) % 1;
          ctx.globalAlpha = (1 - tt) * 0.9;
          ctx.strokeStyle = g.color; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, 10 + tt * Math.max(26, Rpx * 1.3), 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      if (pings.length) requestAnimationFrame(() => app.requestDraw());
      // números flotantes
      for (let k = fx.length - 1; k >= 0; k--) {
        const f = fx[k];
        const t = (now - f.t0) / 1300;
        if (t >= 1) { fx.splice(k, 1); continue; }
        const [x, y] = toS(f.cell);
        ctx.globalAlpha = 1 - t * t;
        ctx.font = `bold ${15}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.8)";
        ctx.strokeText(f.text, x + (f.dx || 0), y - 18 - t * 26);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, x + (f.dx || 0), y - 18 - t * 26);
        ctx.globalAlpha = 1;
      }
      if (fx.length) requestAnimationFrame(() => app.requestDraw());
    },
  };

  function drawUnit(ctx, G, u, x, y, r, selected) {
    const P = G.players[u.owner];
    const U = UNITS[u.type];
    ctx.save();
    if (selected) {
      const t = (performance.now() % 1200) / 1200;
      ctx.strokeStyle = `rgba(255,233,168,${0.55 + 0.45 * Math.sin(t * Math.PI * 2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
      requestAnimationFrame(() => app.requestDraw());
    }
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    const mine = u.owner === 0, enemy = !mine && atWar(G, 0, u.owner);
    const waiting = mine && u.mp > 0 && !u.goto && !u.sleep && !u.skip && !u.task && !u.fortified;
    if (waiting && !selected) {
      ctx.strokeStyle = "rgba(255,214,90,.95)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r + 3.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = P.color;
    ctx.strokeStyle = mine ? "#ffffff" : enemy ? "#ff3b2f" : "rgba(10,12,16,.9)";
    ctx.lineWidth = mine || enemy ? 2.6 : 2;
    ctx.beginPath();
    if (U.cls === "civil") ctx.arc(x, y, r * 0.86, 0, Math.PI * 2);
    else if (U.cls === "naval") { // casco de barco
      ctx.moveTo(x - r * 1.1, y - r * 0.35);
      ctx.lineTo(x + r * 1.1, y - r * 0.35);
      ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.85, x, y + r * 0.85);
      ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.85, x - r * 1.1, y - r * 0.35);
      ctx.closePath();
    } else { // escudo
      ctx.moveTo(x - r, y - r * 0.85);
      ctx.lineTo(x + r, y - r * 0.85);
      ctx.lineTo(x + r, y + r * 0.1);
      ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.8, x, y + r * 1.05);
      ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.8, x - r, y + r * 0.1);
      ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    ctx.font = `${Math.round(r * 1.05)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(U.emoji, x, y + r * 0.02);
    if (u.hp < 100) {
      ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillRect(x - r, y - r - 7, r * 2, 4);
      ctx.fillStyle = u.hp > 60 ? "#6bd36b" : u.hp > 30 ? "#f0c040" : "#e5533d";
      ctx.fillRect(x - r, y - r - 7, r * 2 * (u.hp / 100), 4);
    }
    if (u.task) { ctx.font = `${Math.round(r * 0.75)}px sans-serif`; ctx.fillText("🔨", x + r * 0.9, y - r * 0.7); }
    if (u.owner === 0 && !u.task) {
      if (u.fortified) { ctx.font = `${Math.round(r * 0.7)}px sans-serif`; ctx.fillText("🛡", x + r * 0.9, y - r * 0.7); }
      else if (waiting) {
        ctx.fillStyle = "#ffd65a"; ctx.strokeStyle = "#1a1206"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x + r * 0.9, y - r * 0.8, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#1a1206"; ctx.font = "bold 9px sans-serif"; ctx.fillText("!", x + r * 0.9, y - r * 0.8 + 0.5);
      }
    }
    ctx.restore();
  }

  return {
    overlays: [world, screen],
    bannerAt(mx, my) { return banners.find((b) => mx >= b.x0 && mx <= b.x1 && my >= b.y0 && my <= b.y1)?.city || null; },
    /** Unidades cuya ficha queda bajo el dedo o el ratón (con margen para el táctil), las más cercanas primero. */
    unitsAt(mx, my, pad = 6) {
      return tokens.filter((t) => Math.hypot(t.x - mx, t.y - my) <= t.r + pad).sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my)).map((t) => t.u);
    },
    ping(cell, color = "#ffd65a") { if (cell != null && cell >= 0 && pings.length < 12) { pings.push({ cell, color, t0: performance.now() }); app.requestDraw(); } },
    float(cell, text, color = "#ff6a50", dx = 0) { fx.push({ cell, text, color, t0: performance.now(), dx }); app.requestDraw(); },
    invalidate() { cache.rev = -1; },
  };
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
