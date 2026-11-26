// Original advisor emblems: a gilded medallion with a simple glyph, drawn as inline SVG (no external art).
import { esc } from "./util.js";

const GLYPHS = {
  // lightning bolt over a small derrick-like base
  energy: `<path d="M35.5 12 20 35h10.5L27 52l17-25H33z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.6" stroke-linejoin="round"/>`,
  // a classical bank: pediment, four columns, plinth
  economy: `<path d="M32 13 13 23v3h38v-3z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M17 29h5v15h-5zM25.5 29h5v15h-5zM33.5 29h5v15h-5zM42 29h5v15h-5z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.2"/>
    <path d="M14 46h36v5H14z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.4"/>`,
  // two figures, one in front
  people: `<circle cx="24" cy="23" r="6.5" fill="#e9dcb7" stroke="#2a1d08" stroke-width="1.3"/>
    <path d="M12 47c0-8 5-13 12-13s12 5 12 13z" fill="#e9dcb7" stroke="#2a1d08" stroke-width="1.3"/>
    <circle cx="38" cy="26" r="7.5" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.4"/>
    <path d="M24 52c0-9 6-15 14-15s14 6 14 15z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.4"/>`,
  // a house holding a coin
  prosperity: `<path d="M32 13 12 31h6v19h28V31h6z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="32" cy="38" r="7.5" fill="#e0b54c" stroke="#2a1d08" stroke-width="1.4"/>
    <path d="M32 33.5v9M29.6 35.6h3.6a1.6 1.6 0 0 1 0 3.2h-2.4a1.6 1.6 0 0 0 0 3.2h3.6" fill="none" stroke="#2a1d08" stroke-width="1.2" stroke-linecap="round"/>`,
  // open book with a star above
  knowledge: `<path d="M32 26c-5-4-12-5-19-4v24c7-1 14 0 19 4 5-4 12-5 19-4V22c-7-1-14 0-19 4z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M32 26v24" stroke="#2a1d08" stroke-width="1.3"/>
    <path d="M17 29c4-.4 8 .2 11 2M17 34c4-.4 8 .2 11 2M47 29c-4-.4-8 .2-11 2M47 34c-4-.4-8 .2-11 2" stroke="#8a6a2c" stroke-width="1" fill="none"/>
    <path d="m32 9 1.9 4 4.3.4-3.3 2.8 1 4.2-3.9-2.3-3.9 2.3 1-4.2-3.3-2.8 4.3-.4z" fill="#ffe08a" stroke="#2a1d08" stroke-width=".9"/>`,
  // mountains, sun and furrowed fields
  land: `<circle cx="43" cy="20" r="5" fill="#ffe08a" stroke="#2a1d08" stroke-width="1.2"/>
    <path d="M10 40 24 20l8 11 5-6 15 15z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="m24 20-3.5 5 2.3-.6 1.4 1.8 1.6-2.2z" fill="#dfe8ef"/>
    <path d="M10 42h42c-2 6-8 10-21 10S12 48 10 42z" fill="#b9c96a" stroke="#2a1d08" stroke-width="1.4"/>
    <path d="M16 45c5 1.5 25 1.5 32 0M19 48.5c5 1 21 1 26 0" stroke="#5b6b22" stroke-width="1" fill="none"/>`,
  // compass rose
  explorer: `<circle cx="32" cy="32" r="16" fill="none" stroke="#fff4d2" stroke-width="1.6" stroke-dasharray="2 3"/>
    <path d="M32 11 36 28 53 32 36 36 32 53 28 36 11 32 28 28z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M32 11 36 28 32 32zM53 32 36 36 32 32zM32 53 28 36 32 32zM11 32 28 28 32 32z" fill="#c9a45c"/>
    <circle cx="32" cy="32" r="2.6" fill="#2a1d08"/>`,
  // a heater shield with a star over two chevrons
  military: `<path d="M32 11 49 16.5V30c0 11-7.5 18.5-17 23-9.5-4.5-17-12-17-23V16.5z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M32 15.5 45 19.6V30c0 8.6-5.6 14.6-13 18.6z" fill="#d9c79a" opacity=".55"/>
    <path d="m32 18.5 2.1 4.4 4.8.5-3.6 3.2 1 4.7-4.3-2.5-4.3 2.5 1-4.7-3.6-3.2 4.8-.5z" fill="#b4872f" stroke="#2a1d08" stroke-width=".9" stroke-linejoin="round"/>
    <path d="m22.5 36 9.5 5.5 9.5-5.5M22.5 41.5 32 47l9.5-5.5" fill="none" stroke="#2a1d08" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  // a merchant's balance with a coin on one pan
  commerce: `<path d="M32 15v32" stroke="#2a1d08" stroke-width="3.4" stroke-linecap="round"/><path d="M32 15v32" stroke="#fff4d2" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M15 21h34" stroke="#2a1d08" stroke-width="3.6" stroke-linecap="round"/><path d="M15 21h34" stroke="#fff4d2" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="32" cy="14" r="3" fill="#ffe08a" stroke="#2a1d08" stroke-width="1.2"/>
    <path d="m17 21-5 13M17 21l5 13M47 21l-5 13M47 21l5 13" stroke="#2a1d08" stroke-width="1" fill="none"/>
    <path d="M10.5 34h13c0 4-3 6-6.5 6s-6.5-2-6.5-6zM40.5 34h13c0 4-3 6-6.5 6s-6.5-2-6.5-6z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.3" stroke-linejoin="round"/>
    <ellipse cx="17" cy="32.6" rx="3.6" ry="1.6" fill="#e0b54c" stroke="#2a1d08" stroke-width="1"/>
    <path d="M24 51h16l-2.5-4h-11z" fill="#fff4d2" stroke="#2a1d08" stroke-width="1.3" stroke-linejoin="round"/>`,
  // a laurel wreath around a small flame
  culture: wreath(),
};

function wreath() {
  const leaves = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let k = 0; k < 6; k++) {
      const th = ((28 + k * 23) * Math.PI) / 180; // angle from the bottom of the circle, up each side
      const r = 16;
      const x = 32 + side * r * Math.sin(th), y = 34 + r * Math.cos(th);
      // the leaf's long axis along the circle's tangent, tipped a little outward
      const rot = (Math.atan2(-side * Math.cos(th), -Math.sin(th)) * 180) / Math.PI + side * 22;
      leaves.push(`<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="2.4" ry="5.2" transform="rotate(${rot.toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})" fill="#fff4d2" stroke="#2a1d08" stroke-width="1"/>`);
    }
  }
  return `<path d="M27.5 49.4A16 16 0 0 1 18.6 24.5M36.5 49.4A16 16 0 0 0 45.4 24.5" fill="none" stroke="#2a1d08" stroke-width="1.4"/>
    ${leaves.join("")}
    <path d="M27 48.5c2 1.6 8 1.6 10 0" fill="none" stroke="#b4872f" stroke-width="2" stroke-linecap="round"/>
    <path d="M32 19c4.5 5 6.5 9 6.5 13a6.5 6.5 0 0 1-13 0c0-3 1.5-5 3-7 .5 2.5 1.5 3.5 2.5 3.5 0-3.5-.5-6 1-9.5z" fill="#ffe08a" stroke="#2a1d08" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M32 29c1.8 2 2.6 3.4 2.6 4.8a2.6 2.6 0 0 1-5.2 0c0-1.4.9-2.9 2.6-4.8z" fill="#e0763a"/>`;
}

/** The medallion SVG for an advisor ({id, color}). */
export function emblem(adv, size = 48, title = "") {
  const g = GLYPHS[adv.id] || GLYPHS.explorer;
  const gid = `advg-${adv.id}-${size}`;
  const a11y = title ? `role="img" aria-label="${esc(title)}"` : `aria-hidden="true" focusable="false"`;
  return `<svg class="adv-emblem" ${a11y} width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${gid}-d" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${esc(adv.color)}" stop-opacity="1"/><stop offset="1" stop-color="${esc(adv.dark || "#12202c")}"/></radialGradient>
      <linearGradient id="${gid}-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dc8a"/><stop offset=".5" stop-color="#b4872f"/><stop offset="1" stop-color="#6e5020"/></linearGradient>
    </defs>
    <circle cx="32" cy="32" r="31" fill="#120d06"/>
    <circle cx="32" cy="32" r="29.5" fill="url(#${gid}-r)"/>
    <circle cx="32" cy="32" r="25.5" fill="url(#${gid}-d)" stroke="#2a1d08" stroke-width="1.2"/>
    <path d="M14 22a22 22 0 0 1 36 0" fill="none" stroke="rgba(255,240,200,.18)" stroke-width="3" stroke-linecap="round"/>
    ${g}
  </svg>`;
}
