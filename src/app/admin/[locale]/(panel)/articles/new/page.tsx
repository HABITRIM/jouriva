import { getCategories, listAuthorsAdmin } from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { createArticleAction } from "@/app/actions/articles";

export const dynamic = "force-dynamic";

/** New-article form: creates base article + first translation as DRAFT. */
export default async function NewArticlePage() {
  const [categories, authors] = await Promise.all([getCategories(), listAuthorsAdmin()]);
  const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink";
  const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black text-navy">New article</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Creates the base article plus its first language version as a <strong>DRAFT</strong>.
        Content, SEO, FAQ and verification are managed in the editor.
      </p>

      <div className="mt-6 rounded-xl border border-navy-100 bg-white p-6">
        <ActionForm action={createArticleAction} submitLabel="Create draft">
          <label className={label}>Locale
            <select name="locale" defaultValue="en" className={input} required>
              <option value="en">English (/en/)</option>
              <option value="es">Español (/es/)</option>
              <option value="ar">العربية (/ar/ — Latin slug)</option>
            </select>
          </label>
          <label className={`${label} mt-4`}>Title
            <input name="title" required minLength={3} maxLength={200} className={input} dir="auto" />
          </label>
          <label className={`${label} mt-4`}>Slug (lowercase, hyphens — Latin per project rule)
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} placeholder="marrakech-with-kids" />
          </label>
          <label className={`${label} mt-4`}>Excerpt
            <textarea name="excerpt" rows={2} maxLength={500} className={input} dir="auto" />
          </label>
          <label className={`${label} mt-4`}>Author (required — never “By Admin”)
            <select name="authorId" required className={input}>
              <option value="">— select author —</option>
              {authors.filter((a) => a.isActive).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className={`${label} mt-4`}>Category
            <select name="categoryId" className={input}>
              <option value="">— none —</option>
              {categories.map((c) => {
                const name = c.translations.find((t) => t.locale === "en")?.name ?? c.key;
                return <option key={c.id} value={c.id}>{name}</option>;
              })}
            </select>
          </label>
          <input type="hidden" name="blocks" value={JSON.stringify([{ type: "paragraph", text: "Draft — open the editor to write." }])} />
          <input type="hidden" name="faq" value="[]" />
          <input type="hidden" name="links" value="[]" />
          <input type="hidden" name="verificationStatus" value="" />
        </ActionForm>
      </div>
    </div>
  );
}
