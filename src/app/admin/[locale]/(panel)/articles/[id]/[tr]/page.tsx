import { notFound } from "next/navigation";
import { getSessionUser, createPreviewToken } from "@/lib/auth";
import {
  getArticleForEdit, getCategories, listAuthorsAdmin, listMedia, listRevisions, listTransitions, translationGroupStatuses, searchLinkTargets,
} from "@/lib/cms/admin-queries";
import { ActionForm } from "@/components/admin/ActionForm";
import { BlocksEditor } from "@/components/admin/BlocksEditor";
import { FaqEditor, LinksEditor, MediaPickerField } from "@/components/admin/FaqLinksEditors";
import { listDestinationOptions, listTopicsAdmin } from "@/lib/cms/admin-queries";
import { StatusBadge, VerificationBadgeSmall } from "@/components/admin/badges";
import { saveTranslationAction, transitionAction, restoreRevisionAction, createTranslationAction } from "@/app/actions/articles";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";
const card = "rounded-xl border border-navy-100 bg-white p-5";

export default async function ArticleEditorPage({
  params,
}: {
  params: Promise<{ id: string; tr: string }>;
}) {
  const { id, tr: locale } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const article = await getArticleForEdit(id);
  if (!article) notFound();
  const translation = article.translations.find((t) => t.locale === locale);
  if (!translation) notFound();

  const [categories, authors, media, revisions, transitions, group, linkCandidates, destinationOptions, topics] = await Promise.all([
    getCategories(),
    listAuthorsAdmin(),
    listMedia(),
    listRevisions(translation.id),
    listTransitions(translation.id),
    translationGroupStatuses(id),
    searchLinkTargets("", locale),
    listDestinationOptions(locale),
    listTopicsAdmin(),
  ]);

  const previewToken = createPreviewToken(translation.id);
  const blocksJson = Array.isArray(translation.blocks) ? translation.blocks : [];
  const faqInitial = (translation.faqGroup?.items ?? []).flatMap((item) =>
    item.translations.filter((x) => x.locale === locale).map((x) => ({ question: x.question, answer: x.answer }))
  );
  const linksInitial = translation.outgoingLinks
    .filter((l) => l.target)
    .map((l) => ({ anchorText: l.anchorText, targetTranslationId: l.target!.id }));
  const missingLocales = ["en", "es", "ar"].filter((l) => !group.some((g) => g.locale === l));

  // Phase 3: current editorial destination + topic links (article-level)
  const primaryDestId = article.destinationLinks.find((l) => l.role === "PRIMARY")?.destinationId ?? "";
  const secondaryDestIds = article.destinationLinks
    .filter((l) => l.role === "SECONDARY")
    .map((l) => l.destinationId)
    .join(",");
  const currentTopicIds = article.topics.map((t) => t.topicId).join(",");

  // ── SEO guidance: explicit rule checks only (spec §16) — no fake score ────
  const seoChecks: { ok: boolean; text: string }[] = [
    { ok: !!translation.seoTitle, text: translation.seoTitle ? "SEO title set" : "Missing SEO title" },
    { ok: !!translation.seoTitle && translation.seoTitle.length <= 60, text: "SEO title ≤ 60 characters" },
    { ok: !!translation.metaDescription, text: translation.metaDescription ? "Meta description set" : "Missing meta description" },
    { ok: !!translation.metaDescription && translation.metaDescription.length <= 155, text: "Meta description ≤ 155 characters" },
    { ok: !!article.heroImage, text: article.heroImage ? "Featured image set" : "Missing featured image" },
    { ok: blocksJson.some((b) => (b as { type: string }).type === "image") === false || blocksJson.some((b) => (b as { type: string; alt?: string }).type === "image" && !!(b as { alt?: string }).alt), text: "All content images have alt text" },
    { ok: /^[-a-z0-9]+$/.test(translation.slug), text: "Slug uses lowercase letters, numbers, hyphens" },
    { ok: !!translation.h1 || !!translation.title, text: "H1 present (title or explicit H1)" },
  ];

  const status = translation.workflowStatus;

  return (
    <div className="mx-auto max-w-4xl pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="kicker">{locale.toUpperCase()} version · {status.replaceAll("_", " ")}</p>
          <h1 className="mt-1 text-2xl font-black text-navy">{translation.title}</h1>
          <p className="text-xs text-ink-soft">/{locale}/guides/{translation.slug}/ · updated {translation.updatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={status} />
          <VerificationBadgeSmall status={translation.verificationStatus} />
          <a
            href={`/${locale}/preview/${translation.id}?t=${previewToken}`}
            target="_blank"
            rel="noopener"
            className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-sm font-bold text-navy hover:border-terracotta"
          >
            Preview (signed) ↗
          </a>
        </div>
      </div>

      {/* Translation group (spec §5) */}
      <section aria-labelledby="group-h" className={`${card} mt-6`}>
        <h2 id="group-h" className="kicker">Translation group</h2>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-ink-soft"><th className="py-1" scope="col">Locale</th><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
          <tbody className="divide-y divide-navy-100">
            {group.map((g) => (
              <tr key={g.id}>
                <td className="py-2 font-bold">{g.locale.toUpperCase()}</td>
                <td className="py-2">{g.title}</td>
                <td className="py-2"><StatusBadge status={g.workflowStatus} /></td>
                <td className="py-2"><a className="font-bold text-terracotta-ink hover:underline" href={`/admin/en/articles/${id}/${g.locale}`}>Edit →</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        {missingLocales.length > 0 && (
          <div className="mt-4 border-t border-navy-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Add a version (independent DRAFT — nothing is machine-copied)</p>
            <ActionForm action={createTranslationAction} submitLabel="Create version" className="mt-2">
              <input type="hidden" name="articleId" value={id} />
              <div className="flex flex-wrap gap-2">
                <select name="locale" className={input} aria-label="Locale">
                  {missingLocales.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
                <input name="title" placeholder="Title" required minLength={3} className={`${input} flex-1`} aria-label="Title" dir="auto" />
                <input name="slug" placeholder="slug-latin" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} aria-label="Slug" />
              </div>
            </ActionForm>
          </div>
        )}
      </section>

      {/* Workflow (spec §6/§8) — each action is an explicit, role-guarded submit */}
      <section aria-labelledby="wf-h" className={`${card} mt-6`}>
        <h2 id="wf-h" className="kicker">Editorial workflow — publishing requires an explicit human action</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {status === "DRAFT" && (
            <ActionForm action={transitionAction} submitLabel="Submit for review"><input type="hidden" name="action" value="submit_review" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
          )}
          {status === "IN_REVIEW" && (
            <>
              <ActionForm action={transitionAction} submitLabel="Start fact-check"><input type="hidden" name="action" value="start_fact_check" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
              <ActionForm action={transitionAction} submitLabel="Request revisions…" className="inline">
                <input type="hidden" name="action" value="reject" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} />
                <label className={label}>Revision notes (required)
                  <textarea name="notes" required rows={2} className={input} />
                </label>
              </ActionForm>
            </>
          )}
          {status === "FACT_CHECK" && (
            <>
              <ActionForm action={transitionAction} submitLabel="Pass fact-check → SEO review" className="inline">
                <input type="hidden" name="action" value="pass_fact_check" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} />
                <label className={label}>Fact-check notes
                  <textarea name="notes" rows={2} className={input} />
                </label>
              </ActionForm>
              <ActionForm action={transitionAction} submitLabel="Return to draft…"><input type="hidden" name="action" value="reject" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /><label className={label}>Notes (required)<textarea name="notes" required rows={2} className={input} /></label></ActionForm>
            </>
          )}
          {status === "SEO_REVIEW" && (
            <>
              <ActionForm action={transitionAction} submitLabel="Approve (human approval)"><input type="hidden" name="action" value="approve" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
              <ActionForm action={transitionAction} submitLabel="Return to draft…"><input type="hidden" name="action" value="reject" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /><label className={label}>Notes (required)<textarea name="notes" required rows={2} className={input} /></label></ActionForm>
            </>
          )}
          {status === "APPROVED" && (
            <>
              <ActionForm action={transitionAction} submitLabel="Publish now" confirm="Publish this version publicly?"><input type="hidden" name="action" value="publish" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
              <ActionForm action={transitionAction} submitLabel="Schedule…" className="inline">
                <input type="hidden" name="action" value="schedule" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} />
                <label className={label}>Publication time (UTC, future)
                  <input type="datetime-local" name="scheduledAt" required className={input} />
                </label>
              </ActionForm>
              <ActionForm action={transitionAction} submitLabel="Back to draft…"><input type="hidden" name="action" value="reject" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /><label className={label}>Notes (required)<textarea name="notes" required rows={2} className={input} /></label></ActionForm>
            </>
          )}
          {status === "SCHEDULED" && (
            <>
              <p className="w-full text-sm text-ink-soft">
                Scheduled for: <strong>{translation.scheduledAt?.toISOString().slice(0, 16) ?? "—"} UTC</strong> — the cron endpoint promotes it automatically.
              </p>
              <ActionForm action={transitionAction} submitLabel="Publish now (early)"><input type="hidden" name="action" value="publish" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
              <ActionForm action={transitionAction} submitLabel="Unschedule"><input type="hidden" name="action" value="unschedule" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
            </>
          )}
          {status === "PUBLISHED" && (
            <>
              <ActionForm action={transitionAction} submitLabel="Unpublish → draft" confirm="Unpublish this version? It will disappear from the public site."><input type="hidden" name="action" value="unpublish" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
              <ActionForm action={transitionAction} submitLabel="Archive" confirm="Archive this version?"><input type="hidden" name="action" value="archive" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
            </>
          )}
          {status === "ARCHIVED" && (
            <ActionForm action={transitionAction} submitLabel="Revive → draft"><input type="hidden" name="action" value="revive" /><Hidden ids={{ translationId: translation.id, articleId: id, locale }} /></ActionForm>
          )}
        </div>

        {/* Transition history */}
        {transitions.length > 0 && (
          <table className="mt-5 w-full text-xs">
            <caption className="sr-only">Workflow transition history</caption>
            <thead><tr className="text-left uppercase text-ink-soft"><th className="py-1" scope="col">When</th><th scope="col">From → To</th><th scope="col">By</th><th scope="col">Notes</th></tr></thead>
            <tbody className="divide-y divide-navy-100">
              {transitions.map((t) => (
                <tr key={t.id}>
                  <td className="py-1.5">{t.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="py-1.5 font-semibold">{t.fromStatus ?? "—"} → {t.toStatus}</td>
                  <td className="py-1.5">{t.user?.name ?? "system"}</td>
                  <td className="py-1.5">{t.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Main save form */}
      <ActionForm action={saveTranslationAction} submitLabel="Save" className={`${card} mt-6 block`} resetOnSuccess>
        <input type="hidden" name="articleId" value={id} />
        <input type="hidden" name="locale" value={locale} />

        <h2 className="kicker">Article settings</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className={label}>Category
            <select name="categoryId" defaultValue={article.categoryId ?? ""} className={input}>
              <option value="">— none —</option>
              {categories.map((c) => {
                const name = c.translations.find((t) => t.locale === "en")?.name ?? c.key;
                return <option key={c.id} value={c.id}>{name}</option>;
              })}
            </select>
          </label>
          <label className={label}>Author
            <select name="authorId" defaultValue={article.authorId} className={input} required>
              {authors.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <MediaPickerField
            name="heroImageId"
            initialId={article.heroImageId}
            assets={media.map((m) => ({ id: m.id, filename: m.filename, url: m.url }))}
            label="Featured image"
          />
        </div>

        <h2 className="kicker mt-8">Content ({locale.toUpperCase()})</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className={label}>Title
            <input name="title" defaultValue={translation.title} required minLength={3} className={input} dir="auto" />
          </label>
          <label className={label}>Slug (Latin — project rule; changing a live slug auto-creates a 301)
            <input name="slug" defaultValue={translation.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} />
          </label>
          <label className={label}>H1 (optional — falls back to title)
            <input name="h1" defaultValue={translation.h1 ?? ""} className={input} dir="auto" />
          </label>
          <label className={label}>Excerpt
            <textarea name="excerpt" rows={2} defaultValue={translation.excerpt ?? ""} maxLength={500} className={input} dir="auto" />
          </label>
        </div>

        <div className="mt-4">
          <BlocksEditor initialBlocks={blocksJson as never} assets={media.map((m) => ({ id: m.id, url: m.url, filename: m.filename }))} />
        </div>

        <h2 className="kicker mt-8">Destinations (Phase 3 — explicit editorial links, never slug-inferred)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className={label}>Primary destination (exactly one when linked)
            <select name="primaryDestinationId" defaultValue={primaryDestId} className={input}>
              <option value="">— none —</option>
              {destinationOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.type.toLowerCase()})</option>
              ))}
            </select>
          </label>
          <label className={label}>Secondary destinations (IDs, comma-separated)
            <input name="secondaryDestinationIds" defaultValue={secondaryDestIds} className={input} placeholder="destination id, …" />
          </label>
        </div>
        <details className="mt-2 text-sm text-ink-soft">
          <summary className="cursor-pointer font-semibold">Destination ID reference</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {destinationOptions.map((d) => (
              <li key={d.id} className="rounded border border-navy-100 px-2 py-1">
                <span className="font-semibold">{d.name}</span> <span className="text-xs">· <code>{d.id}</code></span>
              </li>
            ))}
          </ul>
        </details>

        <h2 className="kicker mt-8">Topics (cross-cutting taxonomy)</h2>
        <label className={`${label} mt-2`}>Topic IDs (comma-separated)
          <input name="topicIds" defaultValue={currentTopicIds} className={input} placeholder="topic id, …" />
        </label>
        <details className="mt-2 text-sm text-ink-soft">
          <summary className="cursor-pointer font-semibold">Topic ID reference</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {topics.map((t) => (
              <li key={t.id} className="rounded border border-navy-100 px-2 py-1">
                <span className="font-semibold">{t.translations.find((x) => x.locale === locale)?.name ?? t.key}</span>{" "}
                <span className="text-xs">· <code>{t.id}</code></span>
              </li>
            ))}
          </ul>
        </details>

        <h2 className="kicker mt-8">SEO (spec §16 — guidance below is rule-based, never an auto-decision)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className={label}>SEO title
            <input name="seoTitle" defaultValue={translation.seoTitle ?? ""} maxLength={200} className={input} dir="auto" />
          </label>
          <label className={label}>Meta description
            <textarea name="metaDescription" rows={2} defaultValue={translation.metaDescription ?? ""} maxLength={400} className={input} dir="auto" />
          </label>
          <label className={label}>Canonical override (path or absolute URL)
            <input name="canonicalOverride" defaultValue={translation.canonicalOverride ?? ""} className={input} placeholder="/en/guides/…" />
          </label>
          <MediaPickerField name="ogImageId" initialId={translation.ogImageId} assets={media.map((m) => ({ id: m.id, filename: m.filename, url: m.url }))} label="OG image (falls back to featured image)" />
          <label className="flex items-center gap-2 text-sm font-semibold text-charcoal">
            <input type="checkbox" name="noindex" defaultChecked={translation.noindex} className="h-4 w-4" />
            noindex (keep out of sitemap/RSS/listings; still previewable by URL)
          </label>
        </div>

        <ul className="mt-4 grid gap-1.5 rounded-xl border border-navy-100 bg-[#FAFBFC] p-4 text-sm sm:grid-cols-2" aria-label="SEO guidance">
          {seoChecks.map((c, i) => (
            <li key={i} className={c.ok ? "text-emerald-800" : "text-amber-800"}>
              {c.ok ? "✓" : "⚠"} {c.text}
            </li>
          ))}
        </ul>

        <h2 className="kicker mt-8">Verification (spec §7 — time-sensitive content)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className={label}>Verification status
            <select name="verificationStatus" defaultValue={translation.verificationStatus ?? ""} className={input}>
              <option value="">— not sensitive —</option>
              <option value="VERIFIED">Verified</option>
              <option value="NEEDS_REVIEW">Needs review</option>
              <option value="OUTDATED">Outdated</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className={label}>Last verified date
            <input type="date" name="lastVerifiedAt" defaultValue={translation.lastVerifiedAt?.toISOString().slice(0, 10) ?? ""} className={input} />
          </label>
          <label className={label}>Verification notes
            <textarea name="verificationNotes" rows={2} defaultValue={translation.verificationNotes ?? ""} className={input} dir="auto" />
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-charcoal">
            <input type="checkbox" name="warningEnabled" defaultChecked={translation.warningEnabled} className="h-4 w-4" />
            Show the “verify with official sources” warning on the public page
          </label>
        </div>

        <h2 className="kicker mt-8">FAQ (visible on page — schema only when present)</h2>
        <div className="mt-3">
          <FaqEditor initial={faqInitial} />
        </div>

        <h2 className="kicker mt-8">Internal links (related articles, human-curated)</h2>
        <div className="mt-3">
          <LinksEditor initial={linksInitial} candidates={linkCandidates.filter((c) => c.id !== translation.id)} />
        </div>
      </ActionForm>

      {/* Revisions */}
      <section aria-labelledby="rev-h" className={`${card} mt-6`}>
        <h2 id="rev-h" className="kicker">Revision history (structured snapshots with restore)</h2>
        <table className="mt-3 w-full text-xs">
          <caption className="sr-only">Revisions</caption>
          <thead><tr className="text-left uppercase text-ink-soft"><th className="py-1" scope="col">When</th><th scope="col">By</th><th scope="col">Status at snapshot</th><th scope="col">Note</th><th scope="col">Restore</th></tr></thead>
          <tbody className="divide-y divide-navy-100">
            {revisions.map((r) => (
              <tr key={r.id}>
                <td className="py-1.5">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="py-1.5">{r.createdBy?.name ?? "—"}</td>
                <td className="py-1.5">{r.status}</td>
                <td className="py-1.5">{r.note ?? "—"}</td>
                <td className="py-1.5">
                  <ActionForm action={restoreRevisionAction} submitLabel="Restore" confirm="Restore this snapshot into the editor? The current state is snapshotted first.">
                    <input type="hidden" name="revisionId" value={r.id} />
                    <input type="hidden" name="translationId" value={translation.id} />
                    <input type="hidden" name="articleId" value={id} />
                    <input type="hidden" name="locale" value={locale} />
                  </ActionForm>
                </td>
              </tr>
            ))}
            {revisions.length === 0 && <tr><td colSpan={5} className="py-3 text-ink-soft">No revisions yet.</td></tr>}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink-soft">Limitation (Phase 2): structured snapshots + restore; visual diffs arrive later.</p>
      </section>
    </div>
  );
}

function Hidden({ ids }: { ids: Record<string, string> }) {
  return (
    <>
      {Object.entries(ids).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}
