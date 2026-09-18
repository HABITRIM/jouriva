import "server-only";
import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Media storage abstraction (Phase 2, spec §14/§30).
 *
 * REAL persistence via the configured provider — no fake uploads.
 *  - `local` (default): files on disk under MEDIA_STORAGE_DIR, served through
 *    /media/[key] with metadata from the database. Development driver.
 *  - `s3` (production/staging): any S3-compatible object store — Supabase
 *    Storage S3 in staging — via the real S3Storage adapter below
 *    (MEDIA_STORAGE_PROVIDER=s3 + S3_BUCKET/S3_ENDPOINT/S3_ACCESS_KEY_ID/
 *    S3_SECRET_ACCESS_KEY; optional S3_REGION). The rest of the system only
 *    ever talks to this interface.
 *
 * Storage keys are opaque (random + extension) so public URLs never expose
 * original filenames or internal directory structure.
 */

export interface StoredObject {
  key: string;
  url: string; // public URL
}

export interface StorageProvider {
  readonly name: string;
  put(data: Buffer, filename: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export function extFromMime(mime: string): string {
  const ext = Object.entries(EXT_MIME).find(([, m]) => m === mime)?.[0];
  if (!ext) throw new Error(`Unsupported mime: ${mime}`);
  return ext;
}

function storageDir(): string {
  return process.env.MEDIA_STORAGE_DIR ?? path.join(process.cwd(), ".uploads");
}

class LocalStorage implements StorageProvider {
  readonly name = "local";

  async put(data: Buffer, mime: string): Promise<StoredObject> {
    const dir = storageDir();
    await mkdir(dir, { recursive: true });
    const key = `${Date.now().toString(36)}${randomBytes(8).toString("hex")}.${extFromMime(mime)}`;
    await writeFile(path.join(dir, key), data);
    return { key, url: `/media/${key}` };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const p = path.join(storageDir(), path.basename(key)); // basename: no traversal
      const s = await stat(p);
      if (!s.isFile()) return null;
      const { readFile } = await import("node:fs/promises");
      return await readFile(p);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(path.join(storageDir(), path.basename(key)));
    } catch {
      // already gone — idempotent
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const s = await stat(path.join(storageDir(), path.basename(key)));
      return s.isFile();
    } catch {
      return false;
    }
  }
}

/**
 * Opaque storage-key generation (shared contract): timestamp + random bytes
 * + extension. Original filenames are never part of a storage key.
 */
export function generateStorageKey(mime: string): string {
  return `${Date.now().toString(36)}${randomBytes(8).toString("hex")}.${extFromMime(mime)}`;
}

/**
 * S3 object keys are flat by design — mirror LocalStorage's basename guard
 * so a crafted key can never address a path outside the flat key space.
 */
function objectKey(key: string): string {
  const flat = key.split("/").pop() ?? "";
  if (!flat || flat.startsWith(".")) throw new Error("Invalid storage key.");
  return flat;
}

/**
 * Required S3 configuration. Fails closed with a message that names the
 * missing variables — never their values.
 */
function s3Config(): {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
} {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "MEDIA_STORAGE_PROVIDER=s3 requires S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY — configure object storage first (docs/11-media.md, docs/MIGRATION-STEP-4A.md)."
    );
  }
  // S3_REGION is optional (not a required project variable). It pins the
  // SigV4 signing region; AWS's standard default applies when unset.
  return { bucket, endpoint, accessKeyId, secretAccessKey, region: process.env.S3_REGION ?? "us-east-1" };
}

function s3Bucket(): string {
  return s3Config().bucket;
}

type S3ClientLike = import("@aws-sdk/client-s3").S3Client;
let cachedS3: { key: string; client: S3ClientLike } | null = null;

/** Lazily constructed, module-cached S3 client (path-style, Supabase-compatible). */
async function s3Client(): Promise<S3ClientLike> {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const cfg = s3Config();
  // Cache key uses non-secret identifiers only (endpoint/region/key id).
  const cacheKey = `${cfg.endpoint}|${cfg.region}|${cfg.accessKeyId}`;
  if (cachedS3?.key === cacheKey) return cachedS3.client;
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  cachedS3 = { key: cacheKey, client };
  return client;
}

/**
 * Public object URL for the configured PUBLIC bucket, derived from
 * S3_ENDPOINT (never hardcoded): Supabase endpoints map to the public
 * object URL of the same project; other S3-compatible providers get a
 * path-style public URL fallback.
 */
function s3PublicUrl(key: string): string {
  const { bucket, endpoint } = s3Config();
  const u = new URL(endpoint);
  if (u.hostname.endsWith(".storage.supabase.co")) {
    const base = `${u.protocol}//${u.hostname.replace(/\.storage\.supabase\.co$/, ".supabase.co")}/storage/v1/object/public`;
    return `${base}/${bucket}/${key}`;
  }
  return `${u.protocol}//${u.host}/${bucket}/${key}`;
}

/**
 * S3-compatible storage — real implementation against any S3-compatible
 * object store (staging: Supabase Storage S3 gateway, PUBLIC bucket).
 *
 * Security properties (MIGRATION-STEP-4A):
 *  - credentials come exclusively from environment variables and are never
 *    logged, echoed into errors, or exposed to client bundles (this module
 *    is `server-only`);
 *  - errors never include values — only variable NAMES;
 *  - storage keys stay opaque (random), so original filenames and bucket
 *    layout are never exposed in public URLs.
 *
 * Public URLs are derived from S3_ENDPOINT: on a `*.storage.supabase.co`
 * endpoint they map to the Supabase public object URL of the configured
 * PUBLIC bucket; any other S3-compatible provider falls back to a path-style
 * public URL (portability). No project identifier is hardcoded.
 */
class S3Storage implements StorageProvider {
  readonly name = "s3";

  /** Fail fast at construction: verifies all required variables are present.
   *  Errors name the missing variables — never their values. */
  constructor() {
    s3Config();
  }

  async put(data: Buffer, mime: string): Promise<StoredObject> {
    const key = generateStorageKey(mime);
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    await client.send(
      new PutObjectCommand({ Bucket: s3Bucket(), Key: key, Body: data, ContentType: mime })
    );
    return { key, url: s3PublicUrl(key) };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await s3Client();
      const res = await client.send(new GetObjectCommand({ Bucket: s3Bucket(), Key: objectKey(key) }));
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    } catch {
      // Missing object (or unreadable) → null. SDK errors are never re-thrown
      // to callers — same contract as LocalStorage.get.
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await s3Client();
      await client.send(new DeleteObjectCommand({ Bucket: s3Bucket(), Key: objectKey(key) }));
    } catch {
      // Idempotent: an already-deleted/missing object is not a failure.
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
      const client = await s3Client();
      await client.send(new HeadObjectCommand({ Bucket: s3Bucket(), Key: objectKey(key) }));
      return true;
    } catch {
      return false;
    }
  }
}

export function storage(): StorageProvider {
  return process.env.MEDIA_STORAGE_PROVIDER === "s3" ? new S3Storage() : new LocalStorage();
}

// ── Upload validation (spec §23): magic bytes + size + real image decode ────

export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

export function maxUploadBytes(): number {
  return Number(process.env.MEDIA_MAX_MB ?? 10) * 1024 * 1024;
}

/** Magic-byte sniffing — never trust the client-declared content type. */
export function sniffMime(buf: Buffer): AllowedMime | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(0, 3).toString("ascii") === "GIF8") return "image/gif";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp" && buf.subarray(8, 12).toString("ascii").includes("avif")) return "image/avif";
  return null;
}

export function validateFilename(name: string): string {
  // Store only a sanitized display name; never used for storage paths.
  const clean = name.replace(/[^\w.\- ]+/g, "_").slice(0, 200).trim();
  return clean || "upload";
}
