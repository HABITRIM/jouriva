/**
 * H1 verification (MIGRATION-STEP-4B-H1) — isolated, non-destructive.
 *
 * Static part: proves the seed's image path now routes through the
 * StorageProvider abstraction and no longer writes the local filesystem.
 *
 * Dynamic part: exercises the exact provider contract ingestImage relies on
 * (storage().put(buffer, mime) → { key, url }, byte-identical get, delete)
 * with the LOCAL driver in a throwaway temp directory. No database is
 * touched, no S3/Supabase call is made, and the seed itself is NOT executed
 * (seed.ts runs main() on import, so it is inspected statically instead —
 * documented limitation, see docs/MIGRATION-STEP-4B-H1.md).
 *
 * Run: NODE_OPTIONS=--conditions=react-server npx tsx scripts/verify-seed-media-path.ts
 */
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { storage } from "../src/lib/storage";

let failures = 0;
function check(label: string, cond: boolean) {
  console.log((cond ? "✓" : "✗ FAIL") + " " + label);
  if (!cond) failures++;
}

async function main() {
const seedSrc = await readFile("scripts/seed.ts", "utf8");
const fnStart = seedSrc.indexOf("async function ingestImage(");
const fnEnd = seedSrc.indexOf("\n}", fnStart);
const fn = seedSrc.slice(fnStart, fnEnd);

// A. source image is read from the committed path
check("A: source image read from public/images via readFile", fn.includes('readFile(path.join(process.cwd(), "public", "images", file))'));
// B. storage().put is called with the buffer + mime
check("B: storage().put(buffer, mime) is called", /storage\(\)\.put\(\s*buf,\s*mime\s*\)/.test(fn));
// C. returned provider metadata drives the MediaAsset
check("C: MediaAsset uses stored.key / stored.url", fn.includes("storageKey: stored.key") && fn.includes("url: stored.url"));
// D. direct local persistence is gone (functional patterns only)
check("D: no fs.writeFile / mkdir in the ingest path", !fn.includes("writeFile") && !fn.includes("mkdir"));
check("D: no MEDIA_STORAGE_DIR usage in seed.ts", !seedSrc.includes("process.env.MEDIA_STORAGE_DIR"));
check("D: no hand-built /media/<key> URL in seed.ts", !seedSrc.includes("`/media/${"));
// E. filename+credit idempotency precedes any upload
const findFirstIdx = fn.indexOf('findFirst({ where: { filename: file, credit: "AI-generated placeholder photography" } })');
const earlyReturnIdx = fn.indexOf("if (existing) return existing;");
const putIdx = fn.indexOf("storage().put(");
check("E: (filename, credit) existence check happens before storage().put", findFirstIdx !== -1 && earlyReturnIdx !== -1 && putIdx !== -1 && findFirstIdx < earlyReturnIdx && earlyReturnIdx < putIdx);
// Abstraction discipline: no S3 client imported into the seed
check("Security: no @aws-sdk import inside seed.ts", !seedSrc.includes("@aws-sdk"));

// Dynamic: the exact provider contract the ingest path relies on (local driver)
const savedProvider = process.env.MEDIA_STORAGE_PROVIDER;
delete process.env.MEDIA_STORAGE_PROVIDER;
const savedDir = process.env.MEDIA_STORAGE_DIR;
const tmp = await mkdtemp(path.join(tmpdir(), "jv-h1-"));
process.env.MEDIA_STORAGE_DIR = tmp;
try {
  const driver = storage();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const stored = await driver.put(png, "image/png");
  check("dyn: provider returns opaque key (never /media/…, no filename)", /^[a-z0-9]+[a-f0-9]{16}\.png$/.test(stored.key));
  check("dyn: local driver public URL is /media/<key> (provider-generated)", stored.url === `/media/${stored.key}`);
  const back = await driver.get(stored.key);
  check("dyn: get() returns byte-identical data", !!back && Buffer.compare(back, png) === 0);
  await driver.delete(stored.key);
  check("dyn: delete() removes the object", (await driver.exists(stored.key)) === false);
} finally {
  await rm(tmp, { recursive: true, force: true });
  if (savedProvider === undefined) delete process.env.MEDIA_STORAGE_PROVIDER; else process.env.MEDIA_STORAGE_PROVIDER = savedProvider;
  if (savedDir === undefined) delete process.env.MEDIA_STORAGE_DIR; else process.env.MEDIA_STORAGE_DIR = savedDir;
}

console.log(failures === 0 ? "\nH1 SEED MEDIA PATH VERIFICATION PASSED" : `\nH1 VERIFICATION FAILED (${failures})`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .then((r) => {
    if (process.exitCode !== 1) process.exit(failures === 0 ? 0 : 1);
    return r;
  });
