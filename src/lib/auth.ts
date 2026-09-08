import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * Phase 2 authentication & authorization (spec §21/§23).
 *
 * REAL implementation (no fake auth):
 *  - scrypt password hashing (node:crypto, per-user random salt)
 *  - server-side sessions in PostgreSQL; the cookie carries a random token,
 *    the DB stores only its SHA-256 hash; cookie = token + HMAC signature
 *  - HTTP-only, SameSite=Lax, Secure in production
 *  - authorization is enforced SERVER-SIDE in every server action via
 *    requireRole()/requireAnyRole(); UI hiding is cosmetic only
 *
 * Swapping in a provider (Auth.js/SSO) later means replacing
 * verifyCredentials() + createSession() — the permission model is unchanged.
 * See docs/12-auth-and-permissions.md.
 */

export const SESSION_COOKIE = "jv_session";
const SESSION_TTL_DAYS = 14;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (min 16 chars)");
  }
  return secret;
}

// ── Passwords ────────────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const N = 16384, r = 8, p = 1;
  const hash = scryptSync(password, salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, n, r, p, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt") return false;
  const hash = scryptSync(password, Buffer.from(saltHex, "hex"), 64, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  const expected = Buffer.from(hashHex, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

function signToken(token: string): string {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex").slice(0, 32);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, userAgent: userAgent?.slice(0, 300) },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, `${token}.${signToken(token)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const [token] = raw.split(".");
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    }
  }
  store.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  authorProfileId: string | null;
};

/** Resolve the current user (request-cached). Cookie signature is verified
 * with the HMAC before any DB lookup; signature failures short-circuit. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [token, sig] = raw.split(".");
  if (!token || !sig) return null;
  const expected = signToken(token);
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    authorProfileId: session.user.authorProfileId,
  };
});

/** Credentials check for the login action. */
export async function verifyCredentials(email: string, password: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.isActive || !user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, authorProfileId: user.authorProfileId };
}

// ── Authorization (server-side enforcement) ──────────────────────────────────

export class AuthorizationError extends Error {
  status = 403;
  constructor(message = "Not authorized") {
    super(message);
  }
}

export class AuthenticationError extends Error {
  status = 401;
  constructor(message = "Sign in required") {
    super(message);
  }
}

/** Requires any authenticated CMS user. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthenticationError();
  return user;
}

/** Requires one of the given roles (ADMIN always passes). */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "ADMIN" || roles.includes(user.role)) return user;
  throw new AuthorizationError(`Requires role: ${roles.join(" or ")}`);
}

// ── Preview tokens (spec §10): HMAC-signed, expiring, scope-limited ─────────

export function createPreviewToken(translationId: string, ttlDays = 7): string {
  const exp = Date.now() + ttlDays * 86_400_000;
  const payload = `${translationId}.${exp}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("hex").slice(0, 32);
  return `${exp}.${sig}`;
}

export function verifyPreviewToken(translationId: string, token: string): boolean {
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!exp || !sig || exp < Date.now()) return false;
  const expected = createHmac("sha256", sessionSecret()).update(`${translationId}.${exp}`).digest("hex").slice(0, 32);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
