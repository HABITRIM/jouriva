import { notFound } from "next/navigation";
import { getAuthorForEdit } from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveAuthorAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

export default async function AuthorEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const author = await getAuthorForEdit(id);
  if (!author) notFound();
  const tr = (l: string) => author.translations.find((t) => t.locale === l);
  const socials = JSON.stringify((author.socials as { label: string; url: string }[] | null) ?? []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black text-navy">Edit author — {author.name}</h1>
      {author.user && (
        <p className="mt-1 text-xs text-ink-soft">Linked login: {author.user.email} ({author.user.role})</p>
      )}
      <div className="mt-4 rounded-xl border border-navy-100 bg-white p-5">
        <ActionForm action={saveAuthorAction} submitLabel="Save author">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Name
              <input name="name" defaultValue={author.name} required className={input} dir="auto" />
            </label>
            <label className={label}>Public slug
              <input name="slug" defaultValue={author.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} />
            </label>
            <label className={label}>Email
              <input name="email" type="email" defaultValue={author.email ?? ""} className={input} />
            </label>
            <label className={label}>Avatar media ID
              <input name="photoAssetId" defaultValue={author.photoAssetId ?? ""} className={input} />
            </label>
          </div>
          <fieldset className="mt-4 rounded-xl border border-navy-100 p-4">
            <legend className="px-1 text-xs font-bold uppercase text-terracotta-ink">Localized profile</legend>
            {(["en", "es", "ar"] as const).map((l) => (
              <div key={l} className="mt-2 grid gap-2 sm:grid-cols-3">
                <label className={label}>Role ({l})
                  <input name={`role_${l}`} defaultValue={tr(l)?.role ?? ""} className={input} dir="auto" />
                </label>
                <label className={label}>Biography ({l})
                  <textarea name={`bio_${l}`} rows={3} defaultValue={tr(l)?.biography ?? ""} className={input} dir="auto" />
                </label>
                <label className={label}>Expertise ({l}, comma-separated)
                  <input name={`expertise_${l}`} defaultValue={(tr(l)?.expertise ?? []).join(", ")} className={input} dir="auto" />
                </label>
              </div>
            ))}
          </fieldset>
          <label className={`${label} mt-3`}>Socials (JSON)
            <input name="socials" defaultValue={socials} className={input} />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="isActive" defaultChecked={author.isActive} className="h-4 w-4" />
            Active (visible on public author page and in pickers)
          </label>
        </ActionForm>
      </div>
    </div>
  );
}
