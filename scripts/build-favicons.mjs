/**
 * JOURIVA favicon raster pipeline.
 *
 * Renders the SVG masters into the full PNG/ICO package (owner-approved
 * manifest) using sharp, then packs favicon.ico (PNG-compressed ICO entries,
 * valid since Windows Vista / supported by all modern browsers).
 *
 * Usage: node scripts/build-favicons.mjs
 *
 * Inputs : public/brand/favicon/favicon.svg       (light tile)
 *          public/brand/favicon/icon-tile-navy.svg (dark tile)
 * Outputs: public/brand/favicon/favicon-{16,32,48,64,128,256}.png
 *          public/brand/favicon/favicon.ico
 *          public/brand/favicon/apple-touch-icon.png (180×180)
 *          public/brand/favicon/icon-{192,384,512}.png
 */
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FAV_DIR = path.join(process.cwd(), "public", "brand", "favicon");

async function renderPng(svgFile, size, outFile) {
  const svg = await readFile(path.join(FAV_DIR, svgFile));
  // Density scales the SVG rasterization so small vectors stay crisp when
  // rendered at large sizes (SVG intrinsic size is 128).
  const density = Math.round(72 * (size / 128));
  const buf = await sharp(svg, { density }).resize(size, size).png().toBuffer();
  await writeFile(path.join(FAV_DIR, outFile), buf);
  console.log(`✓ ${outFile} (${size}×${size})`);
  return buf;
}

/** Pack PNG buffers into a single multi-size .ico (PNG-compressed entries). */
function packIco(entries) {
  // entries: [{ size, buf }]
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o); // width (0 = 256)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(e.buf.length, o + 8); // data size
    dir.writeUInt32LE(offset, o + 12); // data offset
    offset += e.buf.length;
  });

  return Buffer.concat([header, dir, ...entries.map((e) => e.buf)]);
}

const FAVICON_SIZES = [16, 32, 48, 64, 128, 256];

// 1) Light-tile favicon PNGs
const faviconPngs = [];
for (const s of FAVICON_SIZES) {
  const buf = await renderPng("favicon.svg", s, `favicon-${s}.png`);
  faviconPngs.push({ size: s, buf });
}

// 2) Multi-size .ico
const ico = packIco(faviconPngs);
await writeFile(path.join(FAV_DIR, "favicon.ico"), ico);
console.log(`✓ favicon.ico (${FAVICON_SIZES.join(", ")})`);

// 3) Dark-tile app icons
await renderPng("icon-tile-navy.svg", 180, "apple-touch-icon.png");
await renderPng("icon-tile-navy.svg", 192, "icon-192.png");
await renderPng("icon-tile-navy.svg", 384, "icon-384.png");
await renderPng("icon-tile-navy.svg", 512, "icon-512.png");

console.log("Favicon package complete.");
