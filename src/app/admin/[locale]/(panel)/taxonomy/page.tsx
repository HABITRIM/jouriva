import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { listTopicsAdmin, listCategoryTreeAdmin } from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveTopicAction, archiveTopicAction, saveCategoryAction, archiveCategoryAction } from "@/app/actions/taxonomy";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";
const card = "rounded-xl border border-navy-100 bg-white p-5";

/**
 * Taxonomy admin (Phase 3, spec §10): topics + categories with localized
 * labels/slugs. Archive is reference-safe: referenced topics/categories are
 * deactivated, never hard-deleted.
 */
export default async function TaxonomyPage() {
  await requireRole("EDITOR").catch(() => notFound()); // server-side authz (spec §17)
  const [topics, categories] = await Promise.all([listTopicsAdmin(), listCategoryTreeAdmin()]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-black text-navy">Taxonomy</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Sections / categories / topics / tags — editorially controlled. No mass taxonomy pages: topic pages only
        list published articles, and stay out of the index when empty.
      </p>

      {/* ── Topics ─────────────────────────────────────────                                 */}
      <section aria-labelledby="topics-h" className={`${card} mt-6`}>
        <h2 id="topics-h" className="kicker">Topics — cross-cutting themes relating articles AND destinations</h2>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Topics</caption>
          <thead>
            <tr className="text-left text-xs uppercase text-ink-soft">
              <th scope="col" className="py-2">Key</th>
              <th scope="col">EN / ES / AR labels</th>
              <th scope="col">Slugs</th>
              <th scope="col">Usage</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {topics.map((t) => {
              const en = t.translations.find((x) => x.locale === "en");
              const es = t.translations.find((x) => x.locale === "es");
              const ar = t.translations.find((x) => x.locale === "ar");
              return (
                <tr key={t.id} className={t.isActive ? "" : "opacity-50"}>
                  <td className="py-2 font-mono text-xs">{t.key}{!t.isActive && <span className="ms-2 rounded-full bg-navy-100 px-2 py-0.5 text-[0.65rem] font-bold">ARCHIVED</span>}</td>
                  <td className="py-2">
                    <span dir="ltr">{en?.name ?? "—"}</span> · <span dir="ltr">{es?.name ?? "—"}</span> · <span dir="rtl">{ar?.name ?? "—"}</span>
                  </td>
                  <td className="py-2 font-mono text-xs">{[en?.slug, es?.slug, ar?.slug].filter(Boolean).join(" / ")}</td>
                  <td className="py-2 text-xs">{t._count.articles} articles · {t._count.destinations} destinations</td>
                  <td className="py-2">
                    <ActionForm action={archiveTopicAction} submitLabel={t.isActive ? "Archive" : "Delete"} className="inline-block">
                      <input type="hidden" name="topicId" value={t.id} />
                    </ActionForm>
                  </td>
                </tr>
              );
            })}
            {topics.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-ink-soft">No topics yet.</td></tr>
            )}
          </tbody>
        </table>

        <h3 className="kicker mt-6">Create / update a topic</h3>
        <ActionForm action={saveTopicAction} submitLabel="Save topic" className="mt-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={label}>Key (stable identifier)
              <input name="key" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} placeholder="food-drink" />
            </label>
            <label className={label}>Existing topic ID (leave empty to create)
              <input name="id" className={input} list="topic-ids" placeholder="select to update…" />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
              Active
            </label>
          </div>
          <datalist id="topic-ids">
            {topics.map((t) => <option key={t.id} value={t.id}>{t.key}</option>)}
          </datalist>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className={label}>EN name + slug
              <div className="flex gap-1"><input name="topicName_en" className={input} placeholder="Food & drink" /><input name="topicSlug_en" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} placeholder="food-drink" /></div>
            </label>
            <label className={label}>ES name + slug
              <div className="flex gap-1"><input name="topicName_es" className={input} dir="ltr" placeholder="Gastronomía" /><input name="topicSlug_es" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} placeholder="gastronomia" /></div>
            </label>
            <label className={label}>AR name + slug (Latin per project rule)
              <div className="flex gap-1"><input name="topicName_ar" className={input} dir="rtl" placeholder="مطبخ" /><input name="topicSlug_ar" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} placeholder="food" /></div>
            </label>
          </div>
        </ActionForm>
      </section>

      {/* ── Categories ────────────────────────────────────────                              */}
      <section aria-labelledby="cat-h" className={`${card} mt-6`}>
        <h2 id="cat-h" className="kicker">Categories — existing article categories, now also relatable to destinations</h2>
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Categories</caption>
          <thead>
            <tr className="text-left text-xs uppercase text-ink-soft">
              <th scope="col" className="py-2">Key</th>
              <th scope="col">Labels</th>
              <th scope="col">Usage</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {categories.map((c) => (
              <tr key={c.id} className={c.isActive ? "" : "opacity-50"}>
                <td className="py-2 font-mono text-xs">{c.key}{!c.isActive && <span className="ms-2 rounded-full bg-navy-100 px-2 py-0.5 text-[0.65rem] font-bold">ARCHIVED</span>}</td>
                <td className="py-2">{c.translations.map((t) => <span key={t.id} className="me-2" dir={t.locale === "ar" ? "rtl" : "ltr"}>{t.name}</span>)}</td>
                <td className="py-2 text-xs">{c._count.articles} articles · {c._count.children} children</td>
                <td className="py-2">
                  <ActionForm action={archiveCategoryAction} submitLabel={c.isActive ? "Archive" : "Delete"} className="inline-block">
                    <input type="hidden" name="categoryId" value={c.id} />
                  </ActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="kicker mt-6">Create / update a category</h3>
        <ActionForm action={saveCategoryAction} submitLabel="Save category" className="mt-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={label}>Key (dots for hierarchy, e.g. morocco.family)
              <input name="catKey" required pattern="[a-z0-9]+(\.[a-z0-9-]+)*" className={input} placeholder="morocco.family" />
            </label>
            <label className={label}>Existing category ID (leave empty to create)
              <input name="id" className={input} list="cat-ids" placeholder="select to update…" />
            </label>
            <label className={label}>Parent category ID (optional)
              <input name="catParentId" className={input} list="cat-ids" />
            </label>
          </div>
          <datalist id="cat-ids">{categories.map((c) => <option key={c.id} value={c.id}>{c.key}</option>)}</datalist>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className={label}>EN name + slug
              <div className="flex gap-1"><input name="catName_en" className={input} /><input name="catSlug_en" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} /></div>
            </label>
            <label className={label}>ES name + slug
              <div className="flex gap-1"><input name="catName_es" className={input} dir="ltr" /><input name="catSlug_es" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} /></div>
            </label>
            <label className={label}>AR name + slug (Latin per project rule)
              <div className="flex gap-1"><input name="catName_ar" className={input} dir="rtl" /><input name="catSlug_ar" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} /></div>
            </label>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
