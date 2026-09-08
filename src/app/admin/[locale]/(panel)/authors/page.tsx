import { listAuthorsAdmin } from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveAuthorAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

export default async function AuthorsPage() {
  const authors = await listAuthorsAdmin();
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-black text-navy">Authors</h1>
      <p className="mt-1 text-sm text-ink-soft">Real, CMS-managed profiles with localized biographies — “By Admin” does not exist in JOURIVA.</p>

      <ul className="mt-4 divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {authors.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              {a.photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={a.photo.url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                  {a.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
              )}
              <div>
                <a href={`/admin/en/authors/${a.id}`} className="font-semibold text-navy hover:underline">{a.name}</a>
                <p className="text-xs text-ink-soft">/{a.slug} · {a._count.articles} article(s) · {a.isActive ? "active" : "inactive"}</p>
              </div>
            </div>
            <a href={`/{locale}/authors/${a.slug}`} className="text-xs font-bold text-terracotta-ink hover:underline" title="Public page">{a.slug}</a>
          </li>
        ))}
      </ul>

      <section aria-labelledby="new-author-h" className="mt-8 rounded-xl border border-navy-100 bg-white p-5">
        <h2 id="new-author-h" className="kicker">New author</h2>
        <ActionForm action={saveAuthorAction} submitLabel="Create author" resetOnSuccess className="mt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Name
              <input name="name" required minLength={2} className={input} dir="auto" />
            </label>
            <label className={label}>Public slug
              <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} placeholder="salma-benali" />
            </label>
            <label className={label}>Email (public contact, optional)
              <input name="email" type="email" className={input} />
            </label>
            <label className={label}>Avatar media ID (from library; optional)
              <input name="photoAssetId" className={input} placeholder="MediaAsset id…" />
            </label>
          </div>
          <fieldset className="mt-4 rounded-xl border border-navy-100 p-4">
            <legend className="px-1 text-xs font-bold uppercase text-terracotta-ink">Localized profile</legend>
            {(["en", "es", "ar"] as const).map((l) => (
              <div key={l} className="mt-2 grid gap-2 sm:grid-cols-3">
                <label className={label}>Role ({l})
                  <input name={`role_${l}`} className={input} dir="auto" />
                </label>
                <label className={label}>Biography ({l})
                  <textarea name={`bio_${l}`} rows={2} className={input} dir="auto" />
                </label>
                <label className={label}>Expertise ({l}, comma-separated)
                  <input name={`expertise_${l}`} className={input} dir="auto" />
                </label>
              </div>
            ))}
          </fieldset>
          <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-ink-soft">Socials (JSON, optional)
            <input name="socials" className={input} placeholder='[{"label":"LinkedIn","url":"https://…"}]' />
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
