// Citizen figures for the City View's Citizens rows: one small person (or vehicle, for the commute row) per
// category of citizens.json. Original art: flat tokens with a bronze rim, in the spirit of a strategy game's
// population icons, painted with Canvas 2D paths (no images).
//
// The citizen painter in web/js/render/art/people.js wins when it loads: it is imported lazily and its
// `drawCitizen(ctx, key, cx, cy, h, opts) → bool` is used for every key it knows (false → this module's own
// figure). Until it loads, or if it fails to, the fallback below draws everything.
//
//   loadPainter() → Promise<void>          try render/art/people.js once
//   figureCanvas(row, key, cssH, dpr) → canvas   a cached canvas of one figure, cssH css px tall, 2:3 aspect
//   CATEGORY_COLOR[row][key]                the colour a category uses in legends and the U.S. bar

let external = null; // render/art/people.js's drawCitizen, once loaded
let tried = null;

export function loadPainter() {
  if (!tried) {
    tried = import("../../render/art/people.js").then(
      (m) => {
        const f = m.drawCitizen || m.paintCitizen || m.default?.drawCitizen;
        if (typeof f === "function") external = f;
        cache.clear();
      },
      () => { /* unavailable: the fallback draws */ },
    );
  }
  return tried;
}

// Category colours (clothing / vehicle body). Picked to stay apart within a row and readable on the dark dock.
export const CATEGORY_COLOR = {
  workforce: {
    executive: "#3d4f86", engineer: "#2f8fc4", scholar: "#8a5bc4", healer: "#d8dde4", service: "#d07a3a",
    clerk: "#c9a23a", farmer: "#6c9a3a", builder: "#e0b020", maker: "#8a5a3a",
  },
  age: { child: "#7cc4e8", young: "#5fae6a", midlife: "#c08a4a", elder: "#a8a4b8" },
  commute: {
    drove_alone: "#c0503a", carpool: "#d0a040", transit: "#3a8ad0", walk: "#5fae6a", other: "#9a6ac4", home: "#c9a45c",
  },
  education: {
    less_than_hs: "#7a7f88", high_school: "#a88a5a", some_college: "#5f9ac4", bachelors: "#3a6ad0", graduate: "#7a3ac4",
  },
  nativity: { born_in_state: "#c9a45c", other_state: "#5f9a7a", native_abroad: "#5a8ac0", foreign_born: "#c45a7a" },
};

const SKIN = "#e9cfa4"; // one parchment tone for every figure: the rows show occupations, ages and journeys, not race
const SKIN_RIM = "#7a5a32";
const INK = "#120d06";

const cache = new Map(); // `${row}|${key}|${cssH}|${dpr}` → canvas

export function figureCanvas(row, key, cssH, dpr = 1) {
  const k = `${row}|${key}|${cssH}|${dpr}`;
  let cv = cache.get(k);
  if (cv) return cv;
  const cssW = Math.round(cssH * 2 / 3);
  cv = document.createElement("canvas");
  cv.width = Math.ceil(cssW * dpr);
  cv.height = Math.ceil(cssH * dpr);
  const ctx = cv.getContext("2d");
  ctx.scale(dpr, dpr);
  let done = false;
  if (external) {
    try {
      done = external(ctx, key, cssW / 2, cssH / 2, cssH, { row, color: CATEGORY_COLOR[row]?.[key] }) !== false;
    } catch (e) {
      console.warn("people.js drawCitizen failed; using the City View's own figures", e);
      external = null;
    }
  }
  if (!done) {
    // Art units: the box is 2 × 3 units (x 0..2, y 0..3), feet at y ≈ 2.9.
    const u = cssH / 3;
    ctx.scale(u, u);
    paint(ctx, row, key, CATEGORY_COLOR[row]?.[key] || "#8a8a8a");
  }
  cache.set(k, cv);
  return cv;
}

// --- the fallback painter (art units: 2 wide × 3 tall) ------------------------------------------------------------

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

function outlined(ctx, fill, lw = 0.09) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

function head(ctx, x, y, r, hair = null) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 0.09;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, "#f8e8c8");
  g.addColorStop(1, SKIN);
  ctx.fillStyle = g;
  ctx.fill();
  if (hair) {
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fillStyle = hair;
    ctx.fill();
  }
}

/** A standing body: shoulders at y0, hem at y1, half widths ws (shoulders) and wh (hem). */
function torso(ctx, cx, y0, y1, ws, wh, color) {
  ctx.beginPath();
  ctx.moveTo(cx - ws, y0 + 0.18);
  ctx.quadraticCurveTo(cx - ws, y0, cx - ws + 0.18, y0);
  ctx.lineTo(cx + ws - 0.18, y0);
  ctx.quadraticCurveTo(cx + ws, y0, cx + ws, y0 + 0.18);
  ctx.lineTo(cx + wh, y1);
  ctx.lineTo(cx - wh, y1);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - ws, 0, cx + ws, 0);
  g.addColorStop(0, shade(color, 0.22));
  g.addColorStop(1, shade(color, -0.25));
  outlined(ctx, g);
}

function legs(ctx, cx, y0, y1, w, color = "#2a2f3a", stride = 0) {
  for (const s of [-1, 1]) {
    ctx.beginPath();
    const x = cx + s * w * 0.55;
    ctx.moveTo(x - w * 0.42, y0);
    ctx.lineTo(x + w * 0.42, y0);
    ctx.lineTo(x + w * 0.36 + s * stride, y1);
    ctx.lineTo(x - w * 0.36 + s * stride, y1);
    ctx.closePath();
    outlined(ctx, color, 0.07);
  }
}

/** A plain person: returns anchor points for accessories. scale shrinks children. */
function person(ctx, color, { s = 1, cx = 1, legCol = "#2a2f3a", hair = "#4a3420", stride = 0, wide = 0 } = {}) {
  const feet = 2.92;
  const hTot = 2.55 * s;
  const top = feet - hTot;
  const hr = 0.36 * s;
  const hy = top + hr;
  const sh = hy + hr + 0.06 * s; // shoulders
  const hip = sh + 0.95 * s;
  legs(ctx, cx, hip - 0.05, feet, 0.32 * s, legCol, stride);
  torso(ctx, cx, sh, hip, (0.55 + wide) * s, (0.44 + wide) * s, color);
  head(ctx, cx, hy, hr, hair);
  return { hx: cx, hy, hr, sh, hip, feet, s, cx };
}

function rect(ctx, x, y, w, h, fill, lw = 0.07) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  outlined(ctx, fill, lw);
}

function paint(ctx, row, key, color) {
  const f = PAINT[row]?.[key];
  if (f) f(ctx, color);
  else person(ctx, color);
}

// Accessories ---------------------------------------------------------------------------------------------------------
function mortarboard(ctx, p, tassel = "#e6bd55") {
  const y = p.hy - p.hr * 0.75;
  ctx.beginPath();
  ctx.moveTo(p.hx - 0.55 * p.s, y);
  ctx.lineTo(p.hx, y - 0.2 * p.s);
  ctx.lineTo(p.hx + 0.55 * p.s, y);
  ctx.lineTo(p.hx, y + 0.2 * p.s);
  ctx.closePath();
  outlined(ctx, "#1e2230", 0.06);
  ctx.beginPath();
  ctx.moveTo(p.hx + 0.05, y);
  ctx.lineTo(p.hx + 0.45 * p.s, y + 0.12);
  ctx.lineTo(p.hx + 0.45 * p.s, y + 0.42 * p.s);
  ctx.strokeStyle = tassel;
  ctx.lineWidth = 0.08;
  ctx.stroke();
}

function hardHat(ctx, p, col) {
  ctx.beginPath();
  ctx.arc(p.hx, p.hy - p.hr * 0.15, p.hr * 1.02, Math.PI, 0);
  ctx.lineTo(p.hx + p.hr * 1.3, p.hy - p.hr * 0.12);
  ctx.lineTo(p.hx - p.hr * 1.3, p.hy - p.hr * 0.12);
  ctx.closePath();
  outlined(ctx, col, 0.07);
}

function strawHat(ctx, p) {
  ctx.beginPath();
  ctx.ellipse(p.hx, p.hy - p.hr * 0.45, p.hr * 1.75, p.hr * 0.32, 0, 0, Math.PI * 2);
  outlined(ctx, "#e8cf7a", 0.06);
  ctx.beginPath();
  ctx.arc(p.hx, p.hy - p.hr * 0.5, p.hr * 0.8, Math.PI, 0);
  ctx.closePath();
  outlined(ctx, "#d9bb5c", 0.06);
}

function car(ctx, color, heads = 1) {
  // body
  ctx.beginPath();
  ctx.moveTo(0.08, 2.55);
  ctx.lineTo(0.08, 2.05);
  ctx.quadraticCurveTo(0.12, 1.85, 0.35, 1.82);
  ctx.lineTo(0.55, 1.42);
  ctx.quadraticCurveTo(0.62, 1.3, 0.8, 1.3);
  ctx.lineTo(1.35, 1.3);
  ctx.quadraticCurveTo(1.5, 1.3, 1.58, 1.42);
  ctx.lineTo(1.78, 1.82);
  ctx.quadraticCurveTo(1.92, 1.86, 1.92, 2.05);
  ctx.lineTo(1.92, 2.55);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 1.3, 0, 2.55);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(1, shade(color, -0.3));
  outlined(ctx, g);
  // window
  ctx.beginPath();
  ctx.moveTo(0.6, 1.8);
  ctx.lineTo(0.75, 1.46);
  ctx.lineTo(1.4, 1.46);
  ctx.lineTo(1.6, 1.8);
  ctx.closePath();
  ctx.fillStyle = "#bcd8ea";
  ctx.fill();
  // heads in the window
  const xs = heads === 1 ? [0.95] : heads === 2 ? [0.85, 1.32] : [0.8, 1.1, 1.4];
  for (const x of xs) {
    ctx.beginPath();
    ctx.arc(x, 1.7, 0.15, Math.PI, 0);
    ctx.fillStyle = SKIN;
    ctx.fill();
    ctx.lineWidth = 0.04;
    ctx.strokeStyle = SKIN_RIM;
    ctx.stroke();
  }
  // wheels
  for (const x of [0.5, 1.5]) {
    ctx.beginPath();
    ctx.arc(x, 2.58, 0.26, 0, Math.PI * 2);
    outlined(ctx, "#1c1f26", 0.07);
    ctx.beginPath();
    ctx.arc(x, 2.58, 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "#9aa2ae";
    ctx.fill();
  }
  // lamp
  ctx.beginPath();
  ctx.arc(1.84, 2.12, 0.07, 0, Math.PI * 2);
  ctx.fillStyle = "#ffe9a8";
  ctx.fill();
}

const PAINT = {
  workforce: {
    executive(ctx, c) {
      const p = person(ctx, c, { hair: "#3a2a1a" });
      // shirt V and tie
      ctx.beginPath();
      ctx.moveTo(p.cx - 0.16, p.sh);
      ctx.lineTo(p.cx, p.sh + 0.36);
      ctx.lineTo(p.cx + 0.16, p.sh);
      ctx.closePath();
      ctx.fillStyle = "#f4efe4";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.cx - 0.06, p.sh + 0.05);
      ctx.lineTo(p.cx + 0.06, p.sh + 0.05);
      ctx.lineTo(p.cx + 0.08, p.sh + 0.55);
      ctx.lineTo(p.cx, p.sh + 0.66);
      ctx.lineTo(p.cx - 0.08, p.sh + 0.55);
      ctx.closePath();
      ctx.fillStyle = "#c0392b";
      ctx.fill();
      // briefcase
      rect(ctx, 1.38, 2.0, 0.55, 0.4, "#6b4a2a");
      ctx.beginPath();
      ctx.moveTo(1.55, 2.0);
      ctx.lineTo(1.55, 1.9);
      ctx.lineTo(1.76, 1.9);
      ctx.lineTo(1.76, 2.0);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.06;
      ctx.stroke();
    },
    engineer(ctx, c) {
      const p = person(ctx, c, { hair: "#2a1e14" });
      // glasses
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.05;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(p.hx + s * 0.13, p.hy + 0.02, 0.09, 0, Math.PI * 2);
        ctx.stroke();
      }
      // laptop held in front
      ctx.beginPath();
      ctx.moveTo(0.42, 1.92);
      ctx.lineTo(1.58, 1.92);
      ctx.lineTo(1.72, 2.12);
      ctx.lineTo(0.28, 2.12);
      ctx.closePath();
      outlined(ctx, "#b8c0cc", 0.06);
      rect(ctx, 0.5, 1.5, 1.0, 0.44, "#3a4250", 0.06);
      ctx.fillStyle = "#7fe0ff";
      ctx.fillRect(0.58, 1.57, 0.84, 0.3);
      ctx.fillStyle = "#1e5a7a";
      for (let k = 0; k < 3; k++) ctx.fillRect(0.66, 1.62 + k * 0.08, 0.3 + (k % 2) * 0.25, 0.035);
    },
    scholar(ctx, c) {
      const p = person(ctx, c, { hair: "#5a3a22" });
      mortarboard(ctx, p);
      // open book
      ctx.beginPath();
      ctx.moveTo(1.0, 1.82);
      ctx.quadraticCurveTo(0.7, 1.7, 0.36, 1.78);
      ctx.lineTo(0.36, 2.18);
      ctx.quadraticCurveTo(0.7, 2.1, 1.0, 2.22);
      ctx.quadraticCurveTo(1.3, 2.1, 1.64, 2.18);
      ctx.lineTo(1.64, 1.78);
      ctx.quadraticCurveTo(1.3, 1.7, 1.0, 1.82);
      ctx.closePath();
      outlined(ctx, "#f4ecd6", 0.06);
      ctx.beginPath();
      ctx.moveTo(1.0, 1.82);
      ctx.lineTo(1.0, 2.22);
      ctx.strokeStyle = "#8a6d34";
      ctx.lineWidth = 0.04;
      ctx.stroke();
    },
    healer(ctx, c) {
      const p = person(ctx, c, { hair: "#3a2a1a", legCol: "#5a8aa8" });
      // stethoscope
      ctx.beginPath();
      ctx.moveTo(p.cx - 0.22, p.sh + 0.02);
      ctx.quadraticCurveTo(p.cx - 0.3, p.sh + 0.5, p.cx, p.sh + 0.55);
      ctx.quadraticCurveTo(p.cx + 0.3, p.sh + 0.5, p.cx + 0.22, p.sh + 0.02);
      ctx.strokeStyle = "#3a4250";
      ctx.lineWidth = 0.05;
      ctx.stroke();
      // red cross
      ctx.fillStyle = "#d0342c";
      ctx.fillRect(p.cx + 0.12, p.sh + 0.22, 0.3, 0.1);
      ctx.fillRect(p.cx + 0.22, p.sh + 0.12, 0.1, 0.3);
    },
    service(ctx, c) {
      const p = person(ctx, c, { hair: "#4a3420" });
      // apron
      ctx.beginPath();
      ctx.moveTo(p.cx - 0.3, p.sh + 0.3);
      ctx.lineTo(p.cx + 0.3, p.sh + 0.3);
      ctx.lineTo(p.cx + 0.38, p.hip + 0.25);
      ctx.lineTo(p.cx - 0.38, p.hip + 0.25);
      ctx.closePath();
      outlined(ctx, "#f4efe4", 0.05);
      // tray held high with a cup
      ctx.beginPath();
      ctx.moveTo(1.45, p.sh + 0.2);
      ctx.lineTo(1.7, p.sh - 0.25);
      ctx.strokeStyle = shade(c, -0.2);
      ctx.lineWidth = 0.14;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(1.72, p.sh - 0.3, 0.3, 0.07, 0, 0, Math.PI * 2);
      outlined(ctx, "#c9ccd2", 0.05);
      rect(ctx, 1.62, p.sh - 0.55, 0.18, 0.24, "#f4efe4", 0.04);
    },
    clerk(ctx, c) {
      const p = person(ctx, c, { hair: "#2a1e14" });
      // collar
      ctx.beginPath();
      ctx.moveTo(p.cx - 0.2, p.sh);
      ctx.lineTo(p.cx, p.sh + 0.2);
      ctx.lineTo(p.cx + 0.2, p.sh);
      ctx.closePath();
      ctx.fillStyle = "#f4efe4";
      ctx.fill();
      // shopping bag / parcel
      rect(ctx, 1.32, 1.92, 0.56, 0.52, "#e8dcc0");
      ctx.beginPath();
      ctx.arc(1.6, 1.92, 0.14, Math.PI, 0);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.05;
      ctx.stroke();
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(1.4, 2.08, 0.4, 0.08);
    },
    farmer(ctx, c) {
      const p = person(ctx, c, { hair: "#6a4a2a", legCol: "#3a4a6a" });
      strawHat(ctx, p);
      // wheat sheaf
      ctx.strokeStyle = "#c9a23a";
      ctx.lineWidth = 0.06;
      for (const a of [-0.2, 0, 0.2]) {
        ctx.beginPath();
        ctx.moveTo(1.6, 2.5);
        ctx.lineTo(1.6 + a, 1.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(1.6 + a, 1.32, 0.07, 0.2, a, 0, Math.PI * 2);
        ctx.fillStyle = "#e6c25a";
        ctx.fill();
      }
    },
    builder(ctx, c) {
      const p = person(ctx, "#d07a3a", { hair: null, legCol: "#2f4a6a" });
      // hi-vis stripes
      ctx.fillStyle = "#f4f0a0";
      ctx.fillRect(p.cx - 0.45, p.sh + 0.42, 0.9, 0.09);
      hardHat(ctx, p, c);
      // hammer
      ctx.beginPath();
      ctx.moveTo(1.5, 2.35);
      ctx.lineTo(1.7, 1.7);
      ctx.strokeStyle = "#8a5a2a";
      ctx.lineWidth = 0.11;
      ctx.stroke();
      ctx.save();
      ctx.translate(1.72, 1.66);
      ctx.rotate(0.3);
      rect(ctx, -0.24, -0.1, 0.48, 0.2, "#8a929e", 0.05);
      ctx.restore();
    },
    maker(ctx, c) {
      const p = person(ctx, "#4a6a8a", { hair: "#3a2a1a", legCol: "#3a5a7a" });
      // overalls bib
      rect(ctx, p.cx - 0.26, p.sh + 0.12, 0.52, 0.5, c, 0.05);
      // cap
      ctx.beginPath();
      ctx.arc(p.hx, p.hy - p.hr * 0.2, p.hr, Math.PI, 0);
      ctx.lineTo(p.hx + p.hr * 1.4, p.hy - p.hr * 0.2);
      ctx.closePath();
      outlined(ctx, c, 0.06);
      // crate
      rect(ctx, 1.2, 2.05, 0.72, 0.55, "#b8894a");
      ctx.strokeStyle = "#6a4a22";
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(1.2, 2.05);
      ctx.lineTo(1.92, 2.6);
      ctx.moveTo(1.92, 2.05);
      ctx.lineTo(1.2, 2.6);
      ctx.stroke();
    },
  },
  age: {
    child(ctx, c) {
      const p = person(ctx, c, { s: 0.66, hair: "#6a4a2a" });
      // balloon
      ctx.beginPath();
      ctx.moveTo(p.cx + 0.3, p.sh + 0.3);
      ctx.quadraticCurveTo(1.7, 1.6, 1.55, 1.0);
      ctx.strokeStyle = "#e8dcc0";
      ctx.lineWidth = 0.04;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(1.55, 0.78, 0.24, 0.29, 0, 0, Math.PI * 2);
      outlined(ctx, "#e8504a", 0.05);
    },
    young(ctx, c) {
      const p = person(ctx, c, { hair: "#2a1e14", stride: 0.08 });
      // backpack strap and pack
      rect(ctx, p.cx + 0.42, p.sh + 0.1, 0.26, 0.62, "#c9a23a", 0.05);
    },
    midlife(ctx, c) {
      const p = person(ctx, c, { hair: "#4a3420", wide: 0.05 });
      ctx.beginPath();
      ctx.moveTo(p.cx - 0.18, p.sh);
      ctx.lineTo(p.cx, p.sh + 0.22);
      ctx.lineTo(p.cx + 0.18, p.sh);
      ctx.closePath();
      ctx.fillStyle = "#f4efe4";
      ctx.fill();
    },
    elder(ctx, c) {
      ctx.save();
      ctx.translate(0.85, 2.9);
      ctx.rotate(-0.08);
      ctx.translate(-0.85, -2.9);
      const p = person(ctx, c, { s: 0.94, hair: "#e8e8e8" });
      ctx.restore();
      // cane
      ctx.beginPath();
      ctx.moveTo(1.62, 2.92);
      ctx.lineTo(1.55, 1.85);
      ctx.quadraticCurveTo(1.55, 1.68, 1.38, 1.72);
      ctx.strokeStyle = "#6a4a22";
      ctx.lineWidth = 0.1;
      ctx.stroke();
      void p;
    },
  },
  commute: {
    drove_alone(ctx, c) { car(ctx, c, 1); },
    carpool(ctx, c) { car(ctx, c, 3); },
    transit(ctx, c) {
      // a tram / bus front
      ctx.beginPath();
      ctx.moveTo(0.3, 2.62);
      ctx.lineTo(0.3, 0.75);
      ctx.quadraticCurveTo(0.3, 0.45, 0.6, 0.45);
      ctx.lineTo(1.4, 0.45);
      ctx.quadraticCurveTo(1.7, 0.45, 1.7, 0.75);
      ctx.lineTo(1.7, 2.62);
      ctx.closePath();
      const g = ctx.createLinearGradient(0.3, 0, 1.7, 0);
      g.addColorStop(0, shade(c, 0.25));
      g.addColorStop(1, shade(c, -0.25));
      outlined(ctx, g);
      ctx.fillStyle = "#bcd8ea";
      ctx.fillRect(0.45, 0.85, 1.1, 0.7);
      for (const x of [0.75, 1.25]) {
        ctx.beginPath();
        ctx.arc(x, 1.42, 0.14, Math.PI, 0);
        ctx.fillStyle = SKIN;
        ctx.fill();
      }
      ctx.fillStyle = "#f4efe4";
      ctx.fillRect(0.6, 0.58, 0.8, 0.16);
      for (const x of [0.58, 1.42]) {
        ctx.beginPath();
        ctx.arc(x, 2.1, 0.11, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe9a8";
        ctx.fill();
      }
      rect(ctx, 0.4, 2.62, 0.3, 0.2, "#1c1f26", 0.05);
      rect(ctx, 1.3, 2.62, 0.3, 0.2, "#1c1f26", 0.05);
    },
    walk(ctx, c) {
      const p = person(ctx, c, { hair: "#3a2a1a", stride: 0.28 });
      void p;
    },
    other(ctx, c) {
      // a cyclist
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.09;
      for (const x of [0.45, 1.55]) {
        ctx.beginPath();
        ctx.arc(x, 2.48, 0.36, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = c;
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.moveTo(0.45, 2.48);
      ctx.lineTo(0.85, 1.85);
      ctx.lineTo(1.4, 1.85);
      ctx.lineTo(1.55, 2.48);
      ctx.moveTo(0.85, 1.85);
      ctx.lineTo(1.05, 2.48);
      ctx.lineTo(1.4, 1.85);
      ctx.stroke();
      // rider
      ctx.beginPath();
      ctx.moveTo(0.85, 1.8);
      ctx.lineTo(1.05, 1.15);
      ctx.lineTo(1.4, 1.75);
      ctx.strokeStyle = shade(c, -0.15);
      ctx.lineWidth = 0.28;
      ctx.stroke();
      head(ctx, 1.1, 0.85, 0.27, "#3a2a1a");
    },
    home(ctx, c) {
      // a house with a figure at a desk in the window
      ctx.beginPath();
      ctx.moveTo(0.12, 1.35);
      ctx.lineTo(1.0, 0.6);
      ctx.lineTo(1.88, 1.35);
      ctx.closePath();
      outlined(ctx, "#a8402e");
      rect(ctx, 0.3, 1.32, 1.4, 1.4, c);
      ctx.fillStyle = "#ffe9a8";
      ctx.fillRect(0.5, 1.55, 1.0, 0.75);
      ctx.beginPath();
      ctx.arc(1.0, 1.85, 0.16, 0, Math.PI * 2);
      ctx.fillStyle = SKIN;
      ctx.fill();
      ctx.fillStyle = "#3a4a6a";
      ctx.fillRect(0.78, 2.02, 0.44, 0.28);
      ctx.fillStyle = "#3a4250";
      ctx.fillRect(0.62, 2.12, 0.3, 0.18);
      ctx.fillStyle = "#7fe0ff";
      ctx.fillRect(0.65, 2.14, 0.24, 0.12);
    },
  },
  education: {
    less_than_hs(ctx, c) { person(ctx, c, { hair: "#4a3420" }); },
    high_school(ctx, c) {
      person(ctx, c, { hair: "#2a1e14" });
      // diploma scroll
      ctx.save();
      ctx.translate(1.55, 2.0);
      ctx.rotate(-0.5);
      rect(ctx, -0.4, -0.1, 0.8, 0.2, "#f4ecd6", 0.05);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-0.05, -0.12, 0.1, 0.24);
      ctx.restore();
    },
    some_college(ctx, c) {
      person(ctx, c, { hair: "#5a3a22" });
      rect(ctx, 1.3, 1.85, 0.5, 0.62, "#3a6ad0", 0.05);
      ctx.fillStyle = "#f4ecd6";
      ctx.fillRect(1.36, 1.9, 0.06, 0.52);
    },
    bachelors(ctx, c) {
      const p = person(ctx, c, { hair: "#2a1e14" });
      mortarboard(ctx, p);
    },
    graduate(ctx, c) {
      const p = person(ctx, "#2a1e3a", { hair: "#4a3420" });
      // hood in the degree colour
      ctx.beginPath();
      ctx.moveTo(p.cx - 0.5, p.sh + 0.05);
      ctx.quadraticCurveTo(p.cx, p.sh + 0.6, p.cx + 0.5, p.sh + 0.05);
      ctx.lineTo(p.cx + 0.3, p.sh + 0.05);
      ctx.quadraticCurveTo(p.cx, p.sh + 0.35, p.cx - 0.3, p.sh + 0.05);
      ctx.closePath();
      outlined(ctx, c, 0.05);
      mortarboard(ctx, p, "#ffd65a");
    },
  },
  nativity: {
    born_in_state(ctx, c) {
      const p = person(ctx, c, { hair: "#4a3420" });
      // a small home pennant
      ctx.beginPath();
      ctx.moveTo(1.6, 2.6);
      ctx.lineTo(1.6, 1.2);
      ctx.strokeStyle = "#6a4a22";
      ctx.lineWidth = 0.07;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1.6, 1.2);
      ctx.lineTo(1.98, 1.36);
      ctx.lineTo(1.6, 1.52);
      ctx.closePath();
      outlined(ctx, "#e6bd55", 0.04);
      void p;
    },
    other_state(ctx, c) {
      person(ctx, c, { hair: "#2a1e14", stride: 0.1 });
      // suitcase
      rect(ctx, 1.36, 2.1, 0.5, 0.48, "#8a5a2a");
      ctx.beginPath();
      ctx.moveTo(1.5, 2.1);
      ctx.lineTo(1.5, 1.98);
      ctx.lineTo(1.72, 1.98);
      ctx.lineTo(1.72, 2.1);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.05;
      ctx.stroke();
    },
    native_abroad(ctx, c) {
      person(ctx, c, { hair: "#3a2a1a" });
      // a passport booklet
      rect(ctx, 1.38, 1.9, 0.42, 0.56, "#2a3a7a");
      ctx.beginPath();
      ctx.arc(1.59, 2.14, 0.1, 0, Math.PI * 2);
      ctx.strokeStyle = "#e6bd55";
      ctx.lineWidth = 0.035;
      ctx.stroke();
    },
    foreign_born(ctx, c) {
      person(ctx, c, { hair: "#2a1e14" });
      // a globe
      ctx.beginPath();
      ctx.arc(1.58, 2.2, 0.34, 0, Math.PI * 2);
      outlined(ctx, "#3a8ad0", 0.06);
      ctx.fillStyle = "#6fbf5a";
      ctx.beginPath();
      ctx.ellipse(1.5, 2.1, 0.14, 0.1, 0.4, 0, Math.PI * 2);
      ctx.ellipse(1.7, 2.32, 0.1, 0.08, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1.58, 2.2, 0.15, 0.34, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.lineWidth = 0.03;
      ctx.stroke();
    },
  },
};
