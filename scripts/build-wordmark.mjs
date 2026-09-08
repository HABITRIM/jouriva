/**
 * JOURIVA wordmark + primary lockup generator.
 *
 * Outlines "JOURIVA" from the actual brand heading typeface (Playfair
 * Display Bold) so the wordmark/lockup masters are true letterform paths —
 * no font dependency at render time. Produces:
 *
 *   public/brand/logo/jouriva-wordmark.svg        wordmark (navy)
 *   public/brand/logo/jouriva-wordmark-light.svg  wordmark (sand, dark bg)
 *   public/brand/logo/jouriva-logo.svg            primary lockup (symbol + wordmark)
 *   public/brand/logo/jouriva-logo-dark.svg       lockup for dark backgrounds
 *
 * The font file is fetched once from Google Fonts (OFL license) and cached
 * under scripts/.fonts/ (gitignored). Usage: node scripts/build-wordmark.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { writeFile as wFile, mkdir as mkDir } from "node:fs/promises";
import opentype from "opentype.js";
import path from "node:path";
import { execFileSync } from "node:child_process";

const LOGO_DIR = path.join(process.cwd(), "public", "brand", "logo");
const FONT_CACHE = path.join(process.cwd(), "scripts", ".fonts");
const FONT_FILE = path.join(FONT_CACHE, "playfair-display-700.ttf");
const TEXT = "JOURIVA";
const TRACKING_EM = 0.14; // editorial letterspacing per character
const NAVY = "#0D2B45";
const SAND = "#F6EFE5";
const TERRACOTTA = "#C86845";

async function ensureFont() {
  if (existsSync(FONT_FILE)) return;
  await mkDir(FONT_CACHE, { recursive: true });
  console.log("Fetching Playfair Display Bold (OFL) from Google Fonts…");
  // Old UA forces TTF format in the css2 response
  const css = execFileSync("curl", [
    "-s",
    "-A", "Mozilla/4.0",
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700",
  ]).toString();
  const url = css.match(/url\((https:\/\/[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error("Could not resolve TTF url from Google Fonts response");
  execFileSync("curl", ["-s", "-o", FONT_FILE, url]);
  console.log("Cached:", FONT_FILE);
}

// Measure the tracked-out wordmark precisely (per-character placement).
// Returns glyph parts, tight bbox (relative to baseline y=0) and advance width.
function measureWordmark(font, fontSize, trackingEm) {
  const tracking = trackingEm * fontSize;
  let cursor = 0;
  const parts = [];
  let bb = null;
  for (const ch of TEXT) {
    const p = font.getPath(ch, cursor, 0, fontSize, { kerning: true });
    const b = p.getBoundingBox();
    bb = bb
      ? { x1: Math.min(bb.x1, b.x1), y1: Math.min(bb.y1, b.y1), x2: Math.max(bb.x2, b.x2), y2: Math.max(bb.y2, b.y2) }
      : b;
    parts.push({ ch, x: cursor });
    cursor += font.getAdvanceWidth(ch, fontSize, { kerning: true }) + tracking;
  }
  return { parts, bb, width: cursor - tracking };
}

// Render the tracked wordmark with baseline at (dx, dy).
function renderWordmark(font, wm, fontSize, dx, dy) {
  return wm.parts
    .map(({ ch, x }) => font.getPath(ch, x + dx, dy, fontSize, { kerning: true }).toPathData(2))
    .join(" ");
}

const svgDoc = (viewBox, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="t d">
  <title id="t">JOURIVA</title>
  <desc id="d">JOURIVA wordmark set in Playfair Display Bold (outlines).</desc>
${inner}</svg>
`;

await ensureFont();
const fontBuf = readFileSync(FONT_FILE);
const font = opentype.parse(
  fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength)
);

// ── Wordmark (standalone) — viewBox from the TIGHT bbox (Playfair's J descends) ──
const FS = 100;
const pad = 6;
const wm = measureWordmark(font, FS, TRACKING_EM);
const W = wm.bb.x2 - wm.bb.x1 + pad * 2;
const H = wm.bb.y2 - wm.bb.y1 + pad * 2;
const dW = renderWordmark(font, wm, FS, pad - wm.bb.x1, pad - wm.bb.y1); // top-left at (pad, pad)

await wFile(path.join(LOGO_DIR, "jouriva-wordmark.svg"), svgDoc(
  `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`,
  `  <path fill="${NAVY}" d="${dW}"/>`
));
await wFile(path.join(LOGO_DIR, "jouriva-wordmark-light.svg"), svgDoc(
  `0 0 ${W.toFixed(1)} ${H.toFixed(1)}`,
  `  <path fill="${SAND}" d="${dW}"/>`
));

// ── Primary lockup: symbol + wordmark ───────────────────────────────────────
// Symbol canvas is 128×128; glyph visual band ≈ y9..98.5 (center ≈ 54).
const SYM = 128;
const symD_J = "M71 34H85V74C85 89.5 75.5 98.5 62.5 98.5C51.5 98.5 42.5 92.3 38.5 82.3L38.5 73.5L52 69.5C53.6 75.6 57.3 78.6 62.5 78.6C68.7 78.6 71 74.6 71 68.5Z";
const symD_star = "M78 9L80.3 14.46L85.78 12.22L83.54 17.7L89 20L83.54 22.3L85.78 27.78L80.3 25.54L78 31L75.7 25.54L70.22 27.78L72.46 22.3L67 20L72.46 17.7L70.22 12.22L75.7 14.46Z";
const symD_cut = "M79.15 17.23L80.77 18.85L80.77 21.15L79.15 22.77L76.85 22.77L75.23 21.15L75.23 18.85L76.85 17.23Z";

const LFS = 88; // lockup wordmark size
const wmL = measureWordmark(font, LFS, TRACKING_EM);
const capTop = wmL.bb.y1; // negative offset above baseline (cap height incl. overshoot)
const baseline = 54 - capTop / 2; // align glyph vertical center to symbol visual center
const gap = SYM + 26;
const dL = renderWordmark(font, wmL, LFS, gap - wmL.bb.x1, baseline);
const lockW = gap + (wmL.bb.x2 - wmL.bb.x1) + 12;

const lockupInner = (stemColor, textColor) => `  <defs>
    <clipPath id="sky"><rect x="0" y="0" width="${lockW.toFixed(1)}" height="66"/></clipPath>
    <clipPath id="land"><rect x="0" y="66" width="${lockW.toFixed(1)}" height="62"/></clipPath>
  </defs>
  <path fill="${stemColor}" clip-path="url(#sky)" d="${symD_J}"/>
  <path fill="${TERRACOTTA}" clip-path="url(#land)" d="${symD_J}"/>
  <path fill="${TERRACOTTA}" fill-rule="evenodd" d="${symD_star}${symD_cut}"/>
  <path fill="${textColor}" d="${dL}"/>
`;

await wFile(path.join(LOGO_DIR, "jouriva-logo.svg"), svgDoc(
  `0 0 ${lockW.toFixed(1)} 128`,
  lockupInner(NAVY, NAVY)
));
await wFile(path.join(LOGO_DIR, "jouriva-logo-dark.svg"), svgDoc(
  `0 0 ${lockW.toFixed(1)} 128`,
  lockupInner(SAND, SAND)
));

console.log(`✓ jouriva-wordmark(.svg/-light.svg)  ${W.toFixed(0)}×${H.toFixed(0)}`);
console.log(`✓ jouriva-logo(.svg/-dark.svg)       ${lockW.toFixed(0)}×128  (baseline ${baseline.toFixed(1)})`);
