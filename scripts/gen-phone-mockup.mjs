import sharp from "sharp";
import { mkdirSync, statSync } from "fs";

mkdirSync("public/landing", { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1440" viewBox="0 0 360 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#101014"/>
      <stop offset="100%" stop-color="#050506"/>
    </linearGradient>
    <linearGradient id="banner" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fb7185"/>
    </linearGradient>
    <linearGradient id="cta" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect x="18" y="12" width="324" height="696" rx="42" fill="#0b0b0d" stroke="#27272a" stroke-width="2"/>
  <rect x="18" y="12" width="324" height="696" rx="42" fill="none" stroke="#f59e0b" stroke-opacity="0.35" stroke-width="3" filter="url(#glow)"/>
  <rect x="32" y="36" width="296" height="648" rx="32" fill="url(#bg)"/>
  <text x="48" y="68" fill="#71717a" font-family="system-ui,sans-serif" font-size="12" font-weight="500">9:41</text>
  <text x="312" y="68" fill="#71717a" font-family="system-ui,sans-serif" font-size="12" font-weight="500" text-anchor="end">SG Thali</text>
  <text x="48" y="108" fill="#fafafa" font-family="system-ui,sans-serif" font-size="22" font-weight="700">Table 5 · Menu</text>
  <rect x="48" y="128" width="264" height="88" rx="18" fill="url(#banner)"/>
  <text x="66" y="168" fill="#1c1005" font-family="system-ui,sans-serif" font-size="18" font-weight="700">Chef's Thali Set</text>
  <text x="66" y="192" fill="#1c1005" font-family="system-ui,sans-serif" font-size="13" font-weight="500">Rice · Dal · 3 curries</text>
  <rect x="48" y="236" width="64" height="28" rx="14" fill="#f59e0b"/>
  <text x="80" y="255" fill="#1c1005" font-family="system-ui,sans-serif" font-size="12" font-weight="600" text-anchor="middle">Momo</text>
  <rect x="120" y="236" width="58" height="28" rx="14" fill="#27272a"/>
  <text x="149" y="255" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="12" font-weight="600" text-anchor="middle">Thali</text>
  <rect x="186" y="236" width="86" height="28" rx="14" fill="#27272a"/>
  <text x="229" y="255" fill="#a1a1aa" font-family="system-ui,sans-serif" font-size="12" font-weight="600" text-anchor="middle">Chowmein</text>
  <g>
    <rect x="48" y="284" width="264" height="72" rx="16" fill="#18181b"/>
    <rect x="60" y="298" width="44" height="44" rx="10" fill="#3f3f46"/>
    <text x="118" y="318" fill="#fafafa" font-family="system-ui,sans-serif" font-size="14" font-weight="600">Steamed Momo</text>
    <text x="118" y="340" fill="#f59e0b" font-family="system-ui,sans-serif" font-size="13" font-weight="700">Rs 180</text>
    <rect x="268" y="304" width="32" height="32" rx="8" fill="#27272a"/>
    <text x="284" y="326" fill="#f59e0b" font-family="system-ui,sans-serif" font-size="18" font-weight="700" text-anchor="middle">+</text>
  </g>
  <g>
    <rect x="48" y="368" width="264" height="72" rx="16" fill="#18181b"/>
    <rect x="60" y="382" width="44" height="44" rx="10" fill="#3f3f46"/>
    <text x="118" y="402" fill="#fafafa" font-family="system-ui,sans-serif" font-size="14" font-weight="600">Veg Thali</text>
    <text x="118" y="424" fill="#f59e0b" font-family="system-ui,sans-serif" font-size="13" font-weight="700">Rs 320</text>
    <rect x="268" y="388" width="32" height="32" rx="8" fill="#27272a"/>
    <text x="284" y="410" fill="#f59e0b" font-family="system-ui,sans-serif" font-size="18" font-weight="700" text-anchor="middle">+</text>
  </g>
  <g>
    <rect x="48" y="452" width="264" height="72" rx="16" fill="#18181b"/>
    <rect x="60" y="466" width="44" height="44" rx="10" fill="#3f3f46"/>
    <text x="118" y="486" fill="#fafafa" font-family="system-ui,sans-serif" font-size="14" font-weight="600">Chicken Chowmein</text>
    <text x="118" y="508" fill="#f59e0b" font-family="system-ui,sans-serif" font-size="13" font-weight="700">Rs 240</text>
    <rect x="268" y="472" width="32" height="32" rx="8" fill="#27272a"/>
    <text x="284" y="494" fill="#f59e0b" font-family="system-ui,sans-serif" font-size="18" font-weight="700" text-anchor="middle">+</text>
  </g>
  <rect x="48" y="600" width="264" height="52" rx="18" fill="url(#cta)"/>
  <text x="180" y="632" fill="#1c1005" font-family="system-ui,sans-serif" font-size="15" font-weight="700" text-anchor="middle">Place order · Rs 740</text>
  <rect x="140" y="668" width="80" height="4" rx="2" fill="#3f3f46"/>
</svg>`;

const buf = Buffer.from(svg);

await sharp(buf, { density: 144 })
  .resize(540, 1080, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .webp({ quality: 82, effort: 6 })
  .toFile("public/landing/phone-mockup.webp");

await sharp(buf, { density: 96 })
  .resize(360, 720, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .webp({ quality: 78, effort: 6 })
  .toFile("public/landing/phone-mockup-sm.webp");

console.log(
  "phone-mockup.webp",
  statSync("public/landing/phone-mockup.webp").size,
  "bytes",
);
console.log(
  "phone-mockup-sm.webp",
  statSync("public/landing/phone-mockup-sm.webp").size,
  "bytes",
);
