# 11 — Media library (Phase 2)

Status: **implemented** (local storage driver). Sources:
`src/lib/storage.ts` (abstraction + drivers), `src/lib/cms/media.ts`
(service), `src/app/actions/media.ts` (actions), admin UI under
`/admin/en/media/`, serving route `src/app/media/[key]/route.ts`.

## 1. Storage abstraction

```ts
interface MediaStorage {
  name: "local" | "s3";
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

- **Local driver (implemented):** files under `MEDIA_STORAGE_DIR`
  (default `/home/user/.pg/jouriva-uploads` in dev). Keys are opaque:
  `{timestamp-base36}{16-hex}.{ext}` — original filenames are internal
  metadata only and never appear in URLs.
- **S3 driver (interface ready):** constructor **throws** with a clear
  "S3 storage not configured" message. This is the documented
  infrastructure dependency: production object storage + CDN wiring
  happens at deploy time. No fake success is ever returned.

## 2. Upload validation (real, not cosmetic)

1. Magic-byte sniffing (`sniffMime`) — extension/MIME claims are ignored.
2. Real image decode via sharp — width/height recorded; reject non-images.
3. Size cap `MEDIA_MAX_MB` (default 10 MB) enforced before buffering.
4. Allowed types: JPEG, PNG, WebP, GIF, AVIF.

## 3. Rights & disclosure metadata (spec §15)

Per asset (ADMIN/EDITOR editable):

- filename (internal label), credit (displayed), source URL (internal
  attribution), license (e.g. "Owned", "CC BY 4.0")
- **`aiGenerated` flag** — mandatory disclosure for AI imagery; rendered
  publicly as "AI-generated image" next to the credit. AI media is never
  presented as real photography.
- localized alt text + caption per locale (EN/ES/AR)
- `archived` flag (hidden from pickers; reversible)

## 4. Serving & caching

`/media/[key]` streams the bytes with `Content-Type` from the recorded
MIME, `Cache-Control: public, max-age=31536000, immutable`, and
`X-Content-Type-Options: nosniff`. Unknown or archived keys → 404.

## 5. Deletion rules

- **Hard delete** (ADMIN only) is blocked while any article references the
  asset (hero, OG, or inline image blocks) — the service refuses with a
  clear error.
- Preferred path is **archiving**, which is always available.

## 6. Editor integration

`MediaPickerField` (client component) powers featured image, OG image and
inline image blocks; it posts the selected asset id as a hidden form field
(the `ogImageId` field is driven by the picker — fixed in Phase 2 after
being caught in review). The public renderer attaches credit + the
AI-generated disclosure to every image block and hero automatically.

## 7. Production checklist (infrastructure dependency)

- Wire the S3 driver (bucket, region, credentials via server-side env
  only) and a CDN domain; switch `MEDIA_STORAGE_DIR` off local disk.
- Back up the uploads directory (or bucket) alongside database backups —
  media rows reference keys, not bytes.
- Optional: virus scanning / image re-optimization pipeline at ingest.
