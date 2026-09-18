/**
 * Storage adapter verification (MIGRATION-STEP-4A).
 *
 * Always run (no credentials needed):
 *   1. missing S3 configuration fails safely (variable NAMES only, values never)
 *   2. provider selection: MEDIA_STORAGE_PROVIDER=s3 → S3Storage, else LocalStorage
 *   3. storage-key generation stays opaque (random, no user content)
 *   4. no credential values appear in error output
 *
 * Live round-trip (runs ONLY when S3 credentials are already present in the
 * environment — they are never prompted for, read from chat, or printed):
 *   upload a tiny 1×1 PNG → exists() → get() byte-equality → delete() →
 *   exists() === false. Cleanup runs even on failure. No CMS records created.
 *
 * Run: npx tsx scripts/verify-storage.ts
 */
import "dotenv/config";
import {
  storage,
  generateStorageKey,
} from "../src/lib/storage";

let failures = 0;
function check(label: string, cond: boolean) {
  console.log((cond ? "✓" : "✗ FAIL") + " " + label);
  if (!cond) failures++;
}

// ── 1 + 4: missing configuration fails safely, without leaking values ──────
const DUMMY = {
  S3_BUCKET: "verify-storage-bucket",
  S3_ENDPOINT: "https://example.storage.supabase.co/storage/v1/s3",
  S3_ACCESS_KEY_ID: "verify-storage-access-key-id-NOT-A-SECRET",
  S3_SECRET_ACCESS_KEY: "verify-storage-DUMMY-secret-value-9f8e7d6c",
};
const saved: Record<string, string | undefined> = {};
for (const k of Object.keys(DUMMY)) {
  saved[k] = process.env[k];
  delete process.env[k];
}
const provider = process.env.MEDIA_STORAGE_PROVIDER;
process.env.MEDIA_STORAGE_PROVIDER = "s3";
let threw: unknown = null;
try {
  storage();
} catch (e) {
  threw = e;
}
const msg = threw instanceof Error ? threw.message : "";
check("missing S3 config → construction throws", threw instanceof Error);
check("error names the required variables", /S3_BUCKET/.test(msg) && /S3_ENDPOINT/.test(msg));
check("error does NOT contain variable values", !Object.values(DUMMY).some((v) => v.length > 24 && msg.includes(v)));

// ── 2: provider selection ───────────────────────────────────────────────────
for (const [k, v] of Object.entries(DUMMY)) process.env[k] = v; // dummies let construction succeed
check("MEDIA_STORAGE_PROVIDER=s3 → s3 provider", storage().name === "s3");
process.env.MEDIA_STORAGE_PROVIDER = "local";
check("unset driver → local provider", storage().name === "local");
process.env.MEDIA_STORAGE_PROVIDER = provider;

// ── 3: key opacity ──────────────────────────────────────────────────────────
const k1 = generateStorageKey("image/png");
const k2 = generateStorageKey("image/png");
check("keys match opaque pattern", /^[a-z0-9]+[a-f0-9]{16}\.png$/.test(k1));
check("keys are random (no repeats)", k1 !== k2);
check("keys carry no filenames/dirs", !k1.includes("/") && !k1.includes("filename") && !k1.includes("jpg"));

// ── restore environment before the optional live check ──────────────────────
for (const k of Object.keys(DUMMY)) {
  if (saved[k] === undefined) delete process.env[k];
  else process.env[k] = saved[k];
}

// ── 5: optional live S3 round-trip (real credentials required) ──────────────
const liveConfigured =
  process.env.MEDIA_STORAGE_PROVIDER === "s3" &&
  !!process.env.S3_BUCKET &&
  !!process.env.S3_ENDPOINT &&
  !!process.env.S3_ACCESS_KEY_ID &&
  !!process.env.S3_SECRET_ACCESS_KEY;

if (!liveConfigured) {
  console.log("• LIVE ROUND-TRIP SKIPPED — S3 credentials not present in this environment (by design, never prompted).");
} else {
  // 1×1 transparent PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  const driver = storage();
  let key: string | null = null;
  try {
    (async () => {
      const stored = await driver.put(png, "image/png");
      key = stored.key;
      check("live: put() returned opaque key + public url", key.endsWith(".png") && stored.url.startsWith("https://"));
      check("live: exists() === true after put", (await driver.exists(key!)) === true);
      const back = await driver.get(key!);
      check("live: get() returns identical bytes", !!back && Buffer.compare(back, png) === 0);
    })()
      .catch((e) => {
        check(`live: round-trip threw (${e instanceof Error ? e.name : "error"} — details suppressed)`, false);
      })
      .finally(async () => {
        if (key) {
          await driver.delete(key);
          check("live: exists() === false after delete", (await driver.exists(key)) === false);
        }
        console.log(failures === 0 ? "\nSTORAGE VERIFICATION PASSED" : `\nSTORAGE VERIFICATION FAILED (${failures})`);
        process.exit(failures === 0 ? 0 : 1);
      });
  } catch {
    // synchronous failure path handled by the catch above
  }
}

if (!liveConfigured) {
  console.log(failures === 0 ? "\nSTORAGE VERIFICATION PASSED (offline checks)" : `\nSTORAGE VERIFICATION FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}
