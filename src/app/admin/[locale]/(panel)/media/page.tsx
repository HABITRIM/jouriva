import { listMedia } from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { uploadMediaAction } from "@/app/actions/media";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

/** Media library (spec §14/§15): real uploads via the storage abstraction,
 * rights + AI-generated disclosure metadata, localized alt editing on the asset page. */
export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string; archived?: string }> }) {
  const sp = await searchParams;
  const assets = await listMedia({ search: sp.q, archived: sp.archived === "1" });
  const provider = storage().name;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black text-navy">Media library</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Storage provider: <strong>{provider}</strong> · uploads are validated (magic bytes + real image decode), max {process.env.MEDIA_MAX_MB ?? 10} MB.
        AI-generated media must be flagged — placeholders are never presented as real photography.
      </p>

      <section aria-labelledby="upload-h" className="mt-6 rounded-xl border border-navy-100 bg-white p-5">
        <h2 id="upload-h" className="kicker">Upload image</h2>
        <ActionForm action={uploadMediaAction} submitLabel="Upload" resetOnSuccess className="mt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Image file (JPEG/PNG/WebP/GIF/AVIF)
              <input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" required className={`${input} file:mr-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-white`} />
            </label>
            <label className={label}>Alt text (default, EN)
              <input name="alt" className={input} dir="auto" />
            </label>
            <label className={label}>Credit (displayed line)
              <input name="credit" className={input} dir="auto" />
            </label>
            <label className={label}>Source URL (internal attribution)
              <input name="sourceUrl" type="url" className={input} placeholder="https://…" />
            </label>
            <label className={label}>License
              <input name="license" className={input} placeholder="Owned / CC BY 4.0 / AI-generated…" />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="aiGenerated" className="h-4 w-4" />
              AI-generated image
            </label>
          </div>
        </ActionForm>
      </section>

      <form method="get" className="mt-6 flex gap-2" role="search" aria-label="Search media">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search filename or credit…" className={`${input} max-w-xs`} aria-label="Search media" />
        <label className="flex items-center gap-1 text-sm font-semibold">
          <input type="checkbox" name="archived" value="1" defaultChecked={sp.archived === "1"} className="h-4 w-4" /> Archived
        </label>
        <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">Search</button>
      </form>

      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((m) => {
          const alt = m.translations.find((t) => t.locale === "en")?.alt ?? "";
          return (
            <li key={m.id} className="overflow-hidden rounded-xl border border-navy-100 bg-white">
              <a href={`/admin/en/media/${m.id}`} className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              </a>
              <div className="p-3">
                <p className="truncate text-sm font-semibold text-navy" title={m.filename}>{m.filename}</p>
                <p className="text-xs text-ink-soft">{m.width}×{m.height} · {(m.sizeBytes / 1024).toFixed(0)} kB</p>
                {m.aiGenerated && <p className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[0.65rem] font-bold text-violet-800">AI-GENERATED</p>}
              </div>
            </li>
          );
        })}
        {assets.length === 0 && <li className="col-span-full rounded-xl border border-dashed border-navy-100 p-10 text-center text-ink-soft">No media yet — upload the first image above.</li>}
      </ul>
    </div>
  );
}
