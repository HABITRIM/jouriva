import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";

/**
 * Phase 2 middleware (Node.js runtime), composed in order:
 *   1. /admin/* gate — cheap cookie-signature check (full session validation
 *      happens server-side in the admin layout/actions; this is UX, not security).
 *   2. DB-backed 301 redirects (spec §19) with an in-process TTL cache.
 *   3. next-intl locale negotiation for the public site.
 */

const intlMiddleware = createMiddleware(routing);

const LOCALES = ["ar", "en", "es"];

// ── Redirect cache (60 s TTL; invalidated implicitly — tiny table) ──────────
type CachedHit = { destination: string; statusCode: number; expires: number } | null;
const redirectCache = new Map<string, CachedHit>();
const REDIRECT_TTL_MS = 60_000;

async function lookupRedirect(locale: string, sourcePath: string): Promise<CachedHit> {
  const cacheKey = `${locale}:${sourcePath}`;
  const cached = redirectCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached;

  let hit: CachedHit = null;
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
    const result = await pool.query(
      `SELECT "destinationPath", "statusCode", active FROM "Redirect"
       WHERE locale = $1 AND rtrim("sourcePath", '/') = rtrim($2, '/') LIMIT 1`,
      [locale, sourcePath]
    );
    await pool.end();
    const row = result.rows[0];
    if (row && row.active) {
      // Serve-time loop guard: never follow a mapping that points back to itself
      if (row.destinationPath !== sourcePath) {
        hit = { destination: row.destinationPath, statusCode: row.statusCode ?? 301, expires: Date.now() + REDIRECT_TTL_MS };
      }
    }
    redirectCache.set(cacheKey, hit);
  } catch {
    // DB unavailable — fail open (no redirect), never block the site
    hit = null;
  }
  return hit;
}

// ── Admin cookie gate (signature check only — DB check happens server-side) ─

function cookieSignatureValid(raw: string | undefined): boolean {
  if (!raw) return false;
  const [token, sig] = raw.split(".");
  if (!token || !sig) return false;
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 16) return false;
  const expected = createHmac("sha256", secret).update(token).digest("hex").slice(0, 32);
  try {
    return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Admin area
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const parts = pathname.split("/").filter(Boolean); // ["admin", locale, ...]
    const locale = LOCALES.includes(parts[1] as "ar") ? parts[1] : "en";
    const isLogin = parts[2] === "login";
    const cookie = request.cookies.get("jv_session")?.value;
    if (!isLogin && !cookieSignatureValid(cookie)) {
      const loginUrl = new URL(`/admin/${locale}/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Admin handles its own locale/direction; skip intl processing
    return NextResponse.next();
  }

  // 2) DB-backed redirects (locale-scoped paths only)
  const match = pathname.match(/^\/(ar|en|es)(\/.*)$/);
  if (match) {
    const hit = await lookupRedirect(match[1], match[2]);
    if (hit) {
      const destPath = hit.destination.endsWith("/") || hit.destination === "/" ? hit.destination : `${hit.destination}/`;
      const dest = new URL(`/${match[1]}${destPath === "/" ? "/" : destPath}`, request.url);
      return NextResponse.redirect(dest, { status: hit.statusCode });
    }
  }

  // 3) Public site locale negotiation
  return intlMiddleware(request);
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api|_next|_vercel|media|.*\\..*).*)"],
};
