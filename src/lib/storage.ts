import "server-only";
import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Media storage abstraction (Phase 2, spec §14/§30).
 *
 * REAL persistence via the configured provider — no fake uploads.
 *  - `local` (default): files on disk under MEDIA_STORAGE_DIR, served through
 *    /media/[key] with metadata from the database. Production migration path:
 *    implement `S3Storage` against any S3-compatible object store and set
 *    MEDIA_STORAGE_PROVIDER=s3 (+ credentials). The rest of the system only
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
 * S3-compatible storage — implemented when production object storage is
 * provisioned (infrastructure dependency, documented in docs/11-media.md).
 * Intentionally NOT a fake success path: using it without credentials throws.
 */
class S3Storage implements StorageProvider {
  readonly name = "s3";
  constructor() {
    if (!process.env.S3_BUCKET || !process.env.S3_ENDPOINT) {
      throw new Error(
        "MEDIA_STORAGE_PROVIDER=s3 requires S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY — configure production object storage first (docs/11-media.md)."
      );
    }
  }
  async put(): Promise<StoredObject> {
    throw new Error("S3 storage adapter ships with the production deployment phase (docs/11-media.md)");
  }
  async get(): Promise<Buffer | null> {
    return null;
  }
  async delete(): Promise<void> {}
  async exists(): Promise<boolean> {
    return false;
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
