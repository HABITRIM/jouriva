import { notFound } from "next/navigation";
import { getMediaForEdit } from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { updateMediaAction, deleteMediaAction } from "@/app/actions/media";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

export default async function MediaEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await getMediaForEdit(id);
  if (!asset) notFound();
  const tr = (l: string) => asset.translations.find((t) => t.locale === l);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black text-navy">Media metadata</h1>
      <p className="mt-1 text-xs text-ink-soft">Public URL: {asset.url} (opaque key — original path never exposed)</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset.url} alt={tr("en")?.alt ?? ""} className="mt-4 max-h-96 rounded-xl border border-navy-100 object-contain" />

      <div className="mt-6 rounded-xl border border-navy-100 bg-white p-5">
        <ActionForm action={updateMediaAction} submitLabel="Save metadata">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Filename (internal label)
              <input name="filename" defaultValue={asset.filename} className={input} />
            </label>
            <label className={label}>Credit
              <input name="credit" defaultValue={asset.credit ?? ""} className={input} dir="auto" />
            </label>
            <label className={label}>Source URL
              <input name="sourceUrl" defaultValue={asset.sourceUrl ?? ""} className={input} />
            </label>
            <label className={label}>License
              <input name="license" defaultValue={asset.license ?? ""} className={input} />
            </label>
          </div>
          <fieldset className="mt-4 rounded-xl border border-navy-100 p-4">
            <legend className="px-1 text-xs font-bold uppercase text-terracotta-ink">Alt text + caption per locale</legend>
            {(["en", "es", "ar"] as const).map((l) => (
              <div key={l} className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className={label}>Alt ({l.toUpperCase()})
                  <input name={`alt_${l}`} defaultValue={tr(l)?.alt ?? ""} className={input} dir="auto" />
                </label>
                <label className={label}>Caption ({l.toUpperCase()})
                  <input name={`caption_${l}`} defaultValue={tr(l)?.caption ?? ""} className={input} dir="auto" />
                </label>
              </div>
            ))}
          </fieldset>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="aiGenerated" defaultChecked={asset.aiGenerated} className="h-4 w-4" />
              AI-generated image (internal disclosure)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="archived" defaultChecked={asset.archived} className="h-4 w-4" />
              Archived (hidden from pickers)
            </label>
          </div>
        </ActionForm>
      </div>

      <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5">
        <h2 className="kicker text-red-800">Danger zone</h2>
        <p className="mt-1 text-sm text-red-900">Permanent delete (admins, only when unused by articles). Prefer archiving.</p>
        <ActionForm action={deleteMediaAction} submitLabel="Delete permanently" confirm="Permanently delete this file? This cannot be undone." className="mt-2">
          <input type="hidden" name="id" value={id} />
        </ActionForm>
      </div>
    </div>
  );
}
