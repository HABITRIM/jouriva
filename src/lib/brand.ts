import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Brand asset detection — build-time auto-discovery of the supplied JOURIVA
 * masters under /public/brand/. Nothing is hardcoded in components: drop the
 * files in and they are picked up on the next build. Zero code changes.
 *
 * Expected manifest (matches the approved JOURIVA favicon package):
 *
 *   public/brand/logo/
 *     jouriva-symbol.svg         primary symbol (light backgrounds)
 *     logo.svg                   alternate primary filename (also accepted)
 *     jouriva-symbol-light.svg   light/monochrome for dark backgrounds
 *     logo-inverted.svg          alternate inverted filename (also accepted)
 *
 *   public/brand/favicon/
 *     favicon.svg · favicon.ico · favicon-16|32|48|64|128|256.png
 *     apple-touch-icon.png (180×180) · icon-192.png · icon-384.png · icon-512.png
 */

const PUBLIC_DIR = path.join(process.cwd(), "public");
const LOGO_DIR = path.join(PUBLIC_DIR, "brand", "logo");
const FAVICON_DIR = path.join(PUBLIC_DIR, "brand", "favicon");

function exists(dir: string, file: string): boolean {
  try {
    return existsSync(path.join(dir, file));
  } catch {
    return false;
  }
}

const LOGO_PRIMARY_CANDIDATES = ["logo.svg", "jouriva-symbol.svg"];
const LOGO_INVERTED_CANDIDATES = ["logo-inverted.svg", "jouriva-symbol-light.svg"];

/** Symbol-only mark (no wordmark). Returns public URL or null. */
export function logoFile(inverted = false): string | null {
  for (const f of inverted ? LOGO_INVERTED_CANDIDATES : LOGO_PRIMARY_CANDIDATES) {
    if (exists(LOGO_DIR, f)) return `/brand/logo/${f}`;
  }
  return null;
}

/** Full horizontal lockup (symbol + wordmark outline). First existing wins. */
const LOCKUP_CANDIDATES = ["logo-lockup.svg", "jouriva-logo.svg"];
const LOCKUP_DARK_CANDIDATES = ["logo-lockup-inverted.svg", "jouriva-logo-dark.svg"];

export function lockupFile(inverted = false): string | null {
  for (const f of inverted ? LOCKUP_DARK_CANDIDATES : LOCKUP_CANDIDATES) {
    if (exists(LOGO_DIR, f)) return `/brand/logo/${f}`;
  }
  return null;
}

/** Standalone wordmark (outlined letterforms, no symbol). */
const WORDMARK_CANDIDATES = ["wordmark.svg", "jouriva-wordmark.svg"];
const WORDMARK_LIGHT_CANDIDATES = ["wordmark-inverted.svg", "jouriva-wordmark-light.svg"];

export function wordmarkFile(inverted = false): string | null {
  for (const f of inverted ? WORDMARK_LIGHT_CANDIDATES : WORDMARK_CANDIDATES) {
    if (exists(LOGO_DIR, f)) return `/brand/logo/${f}`;
  }
  return null;
}

export interface FaviconEntry {
  url: string;
  type?: string;
  sizes?: string;
}

export interface FaviconSet {
  icon: FaviconEntry[];
  apple?: { url: string; sizes: string };
  manifestIcons: { src: string; sizes: string; type: string }[];
  /** True once real favicon masters exist (vs the Phase 1 placeholder tile). */
  isFinal: boolean;
}

const PNG_FAVICON_SIZES = [16, 32, 48, 64, 128, 256] as const;

/** Detects the full favicon package with graceful fallback to the placeholder. */
export function faviconSet(): FaviconSet {
  const icon: FaviconEntry[] = [];

  // SVG master first (favicon.svg per package manifest; icon.svg = placeholder)
  if (exists(FAVICON_DIR, "favicon.svg")) {
    icon.push({ url: "/brand/favicon/favicon.svg", type: "image/svg+xml" });
  } else if (exists(FAVICON_DIR, "icon.svg")) {
    icon.push({ url: "/brand/favicon/icon.svg", type: "image/svg+xml" });
  }

  // Raster fallbacks (only those that exist are referenced — no broken links)
  const pngs = PNG_FAVICON_SIZES.filter((s) => exists(FAVICON_DIR, `favicon-${s}.png`));
  for (const s of pngs) {
    icon.push({ url: `/brand/favicon/favicon-${s}.png`, sizes: `${s}x${s}`, type: "image/png" });
  }

  // Legacy .ico last
  if (exists(FAVICON_DIR, "favicon.ico")) {
    icon.push({ url: "/brand/favicon/favicon.ico" });
  }

  const apple = exists(FAVICON_DIR, "apple-touch-icon.png")
    ? { url: "/brand/favicon/apple-touch-icon.png", sizes: "180x180" }
    : undefined;

  const manifestIcons: FaviconSet["manifestIcons"] = [];
  if (exists(FAVICON_DIR, "icon-192.png")) {
    manifestIcons.push({ src: "/brand/favicon/icon-192.png", sizes: "192x192", type: "image/png" });
  }
  if (exists(FAVICON_DIR, "icon-512.png")) {
    manifestIcons.push({ src: "/brand/favicon/icon-512.png", sizes: "512x512", type: "image/png" });
  }
  if (manifestIcons.length === 0) {
    manifestIcons.push({ src: "/brand/favicon/icon.svg", sizes: "any", type: "image/svg+xml" });
  }

  return {
    icon,
    apple,
    manifestIcons,
    isFinal: exists(FAVICON_DIR, "favicon.svg") || pngs.length > 0,
  };
}
