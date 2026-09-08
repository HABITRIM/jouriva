import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getDestinationForEdit,
  listDestinationOptions,
  listTopicsAdmin,
  listMedia,
} from "@/lib/cms/admin-queries";
import { createPreviewToken } from "@/lib/auth";
import { destinationQuality } from "@/lib/cms/destinations";
import { ActionForm } from "@/components/admin/ActionForm";
import { BlocksEditor } from "@/components/admin/BlocksEditor";
import { FaqEditor, MediaPickerField } from "@/components/admin/FaqLinksEditors";
import { StatusBadge } from "@/components/admin/badges";
import {
  saveDestinationAction,
  destinationTransitionAction,
  createDestinationTranslationAction,
} from "@/app/actions/destinations";

export const dynamic = "force-dynamic";

const input = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";
const card = "rounded-xl border border-navy-100 bg-white p-5";

export default async function DestinationEditorPage({
  params,
}: {
  params: Promise<{ id: string; tr: string }>;
}) {
  await requireRole("EDITOR").catch(() => notFound()); // server-side authz (spec §17)
  const { id, tr: locale } = await params;
  const destination = await getDestinationForEdit(id);
  if (!destination) notFound();
  const translation = destination.translations.find((t) => t.locale === locale);
  const [allDestinations, topics, media] = await Promise.all([
    listDestinationOptions(locale),
    listTopicsAdmin(),
    listMedia(),
  ]);
  if (!translation) {
    return <MissingLocaleView destinationId={id} locale={locale} name={destination.translations[0]?.name ?? id} />;
  }

  const anchorOk = destination.type === "COUNTRY" ? !!destination.countryId : !!(destination.cityId || destination.countryId);
  const quality = destinationQuality(
    {
      workflowStatus: translation.workflowStatus,
      noindex: translation.noindex,
      name: translation.name,
      description: translation.description,
      blocks: translation.blocks,
      metaDescription: translation.metaDescription,
    },
    anchorOk
  );
  const anchorLabel =
    destination.type === "COUNTRY"
      ? destination.country?.translations.find((t) => t.locale === "en")?.name
      : destination.city
        ? `${destination.city.translations.find((t) => t.locale === "en")?.name} — ${destination.city.country?.translations.find((t) => t.locale === "en")?.name}`
        : destination.country?.translations.find((t) => t.locale === "en")?.name;
  const blocksJson = Array.isArray(translation.blocks) ? translation.blocks : [];
  const faqInitial = (translation.faqGroup?.items ?? []).flatMap((item) =>
    item.translations.filter((x) => x.locale === locale).map((x) => ({ question: x.question, answer: x.answer }))
  );
  const curatedIds = destination.curatedByTranslationId
    .filter((l) => l.ownerDestinationTranslationId === translation.id)
    .map((l) => l.targetDestinationId)
    .filter(Boolean) as string[];
  const galleryIds = destination.gallery.map((g) => g.assetId).join(",");
  const selectedTopics = destination.topics.map((t) => t.topicId).join(",");
  const linkedArticles = destination.articleLinks
    .map((l) => ({ role: l.role, position: l.position, tr: l.article.translations.find((t) => t.locale === locale) }))
    .filter((x) => x.tr);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">{destination.type} · anchored to {anchorLabel ?? "—"}</p>
          <h1 className="text-2xl font-black text-navy">{translation.name}</h1>
        </div>
        <a href={`/admin/en/destinations/`} className="text-sm font-bold text-terracotta-ink hover:underline">← All destinations</a>
      </div>

      {/* Translation group (spec §5 philosophy) */}
      <section aria-labelledby="group-h" className={`${card} mt-6`}>
        <h2 id="group-h" className="kicker">Translation group — independent publishing per locale</h2>
        <table className="mt-3 w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-ink-soft"><th className="py-1" scope="col">Locale</th><th scope="col">Name</th><th scope="col">Status</th><th scope="col"></th></tr></thead>
          <tbody className="divide-y divide-navy-100">
            {destination.translations.map((t) => (
              <tr key={t.id}>
                <td className="py-2 font-bold">{t.locale.toUpperCase()}</td>
                <td className="py-2">{t.name}</td>
                <td className="py-2"><StatusBadge status={t.workflowStatus} /></td>
                <td className="py-2"><a className="font-bold text-terracotta-ink hover:underline" href={`/admin/en/destinations/${id}/${t.locale}`}>Edit →</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 border-t border-navy-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Add a version (independent DRAFT — nothing is machine-copied)</p>
          <ActionForm action={createDestinationTranslationAction} submitLabel="Create version" className="mt-2">
            <input type="hidden" name="destinationId" value={id} />
            <div className="flex flex-wrap gap-2">
              <select name="locale" className={input} aria-label="Locale">
                {["en", "es", "ar"].filter((l) => !destination.translations.some((t) => t.locale === l)).map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
              <input name="name" placeholder="Name" required minLength={2} className={`${input} flex-1`} aria-label="Name" dir="auto" />
              <input name="slug" placeholder="slug-latin" required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} aria-label="Slug" />
            </div>
          </ActionForm>
        </div>
      </section>

      {/* Workflow — explicit human gate (EDITOR+) */}
      <section aria-labelledby="wf-h" className={`${card} mt-6`}>
        <h2 id="wf-h" className="kicker">Publishing — explicit human actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {translation.workflowStatus === "DRAFT" && (
            <ActionForm action={destinationTransitionAction} submitLabel="Publish" confirm="Publish this destination version publicly?">
              <input type="hidden" name="action" value="publish" /><input type="hidden" name="translationId" value={translation.id} />
            </ActionForm>
          )}
          {translation.workflowStatus === "PUBLISHED" && (
            <>
              <ActionForm action={destinationTransitionAction} submitLabel="Unpublish" confirm="Remove this destination from public view?">
                <input type="hidden" name="action" value="unpublish" /><input type="hidden" name="translationId" value={translation.id} />
              </ActionForm>
              <ActionForm action={destinationTransitionAction} submitLabel="Archive">
                <input type="hidden" name="action" value="archive" /><input type="hidden" name="translationId" value={translation.id} />
              </ActionForm>
            </>
          )}
          {translation.workflowStatus === "ARCHIVED" && (
            <ActionForm action={destinationTransitionAction} submitLabel="Restore to draft">
              <input type="hidden" name="action" value="restore" /><input type="hidden" name="translationId" value={translation.id} />
            </ActionForm>
          )}
          <a href={`/${locale}/preview/${translation.id}/?t=${createPreviewToken(translation.id)}`} className="rounded-lg border border-navy-100 px-4 py-2 text-sm font-bold" id="preview-link">
            Preview
          </a>
        </div>
        {translation.publishedAt && <p className="mt-2 text-xs text-ink-soft">Published: {translation.publishedAt.toISOString().slice(0, 16).replace("T", " ")}</p>}
      </section>

      {/* Editorial core */}
      <div className={`${card} mt-6`}>
        <ActionForm action={saveDestinationAction} submitLabel="Save destination">
          <input type="hidden" name="destinationId" value={id} />
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={label}>Name ({locale.toUpperCase()})
              <input name="name" defaultValue={translation.name} required minLength={2} className={input} dir="auto" />
            </label>
            <label className={label}>Slug ({locale.toUpperCase()}) — Latin per project rule
              <input name="slug" defaultValue={translation.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={input} />
            </label>
          </div>
          <label className={`${label} mt-3`}>Tagline
            <input name="tagline" defaultValue={translation.tagline ?? ""} className={input} dir="auto" />
          </label>
          <label className={`${label} mt-3`}>Editorial introduction (standfirst)
            <textarea name="intro" rows={3} defaultValue={translation.description ?? ""} className={input} dir="auto" />
          </label>

          <h2 className="kicker mt-8">Editorial core (structured blocks — overview / why visit / practical)</h2>
          <div className="mt-3">
            <BlocksEditor initialBlocks={blocksJson as never} assets={media.map((m) => ({ id: m.id, url: m.url, filename: m.filename }))} />
          </div>

          <h2 className="kicker mt-8">Media</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <MediaPickerField
              name="heroAssetId"
              initialId={destination.heroAssetId}
              assets={media.map((m) => ({ id: m.id, filename: m.filename, url: m.url }))}
              label="Hero image"
            />
            <label className={label}>Gallery media IDs (comma-separated, ordered)
              <input name="galleryAssetIds" defaultValue={galleryIds} className={input} placeholder="asset-id, asset-id…" />
            </label>
          </div>

          <h2 className="kicker mt-8">SEO</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className={label}>SEO title
              <input name="seoTitle" defaultValue={translation.seoTitle ?? ""} maxLength={200} className={input} dir="auto" />
            </label>
            <label className={label}>Canonical override (path or absolute URL)
              <input name="canonicalOverride" defaultValue={translation.canonicalOverride ?? ""} className={input} />
            </label>
          </div>
          <label className={`${label} mt-3`}>Meta description
            <textarea name="metaDescription" rows={2} defaultValue={translation.metaDescription ?? ""} maxLength={400} className={input} dir="auto" />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="noindex" defaultChecked={translation.noindex} className="h-4 w-4" />
            noindex (keep out of sitemap/search; still previewable)
          </label>

          {/* Thin-content quality gate (spec §15) */}
          <div className={`mt-4 rounded-xl border p-4 ${quality.indexable ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
            <p className="text-sm font-bold">
              {quality.indexable ? "✓ Meets the indexability quality gate" : "✗ Not indexable — quality gate:"}
            </p>
            {!quality.indexable && (
              <ul className="mt-1 list-disc ps-5 text-sm text-amber-900">
                {quality.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              Editorial text: {quality.textLength} chars (≥ 400 required). Thin destinations stay out of the sitemap and get noindex meta.
            </p>
          </div>

          <h2 className="kicker mt-8">Verification (time-sensitive facts)</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className={label}>Status
              <select name="verificationStatus" defaultValue={translation.verificationStatus ?? ""} className={input}>
                <option value="">— none —</option>
                <option value="VERIFIED">Verified</option>
                <option value="NEEDS_REVIEW">Needs review</option>
                <option value="OUTDATED">Outdated</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className={label}>Last verified
              <input type="date" name="lastVerifiedAt" defaultValue={translation.lastVerifiedAt?.toISOString().slice(0, 10) ?? ""} className={input} />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" name="warningEnabled" defaultChecked={translation.warningEnabled} className="h-4 w-4" />
              Show official-source warning
            </label>
          </div>
          <label className={`${label} mt-3`}>Verification notes
            <textarea name="verificationNotes" rows={2} defaultValue={translation.verificationNotes ?? ""} className={input} dir="auto" />
          </label>

          <h2 className="kicker mt-8">FAQ (visible on page — schema only when present)</h2>
          <div className="mt-3">
            <FaqEditor initial={faqInitial} />
          </div>

          <h2 className="kicker mt-8">Related destinations (curated — human-picked)</h2>
          <label className={`${label} mt-2`}>Destination IDs (comma-separated, ordered)
            <input name="relatedDestinationIds" defaultValue={curatedIds.join(",")} className={input} placeholder="destination id, …" />
          </label>
          <details className="mt-2 text-sm text-ink-soft">
            <summary className="cursor-pointer font-semibold">Available destinations</summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {allDestinations.filter((d) => d.id !== id).map((d) => (
                <li key={d.id} className="rounded border border-navy-100 px-2 py-1">
                  <span className="font-semibold">{d.name}</span> <span className="text-xs">{d.type} · <code>{d.id}</code></span>
                </li>
              ))}
            </ul>
          </details>

          <h2 className="kicker mt-8">Topics (cross-cutting taxonomy)</h2>
          <label className={`${label} mt-2`}>Topic IDs (comma-separated)
            <input name="topicIds" defaultValue={selectedTopics} className={input} placeholder="topic id, …" />
          </label>
          <details className="mt-2 text-sm text-ink-soft">
            <summary className="cursor-pointer font-semibold">Available topics</summary>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {topics.map((t) => (
                <li key={t.id} className="rounded border border-navy-100 px-2 py-1">
                  <span className="font-semibold">{t.translations.find((x) => x.locale === locale)?.name ?? t.key}</span>{" "}
                  <span className="text-xs">· <code>{t.id}</code></span>
                </li>
              ))}
            </ul>
          </details>
        </ActionForm>
      </div>

      {/* Related articles (relationship-driven) */}
      <section aria-labelledby="arts-h" className={`${card} mt-6`}>
        <h2 id="arts-h" className="kicker">Articles linked to this destination</h2>
        <p className="mt-1 text-xs text-ink-soft">Managed from each article's editor (primary + secondary destinations). Related lists on this page follow these editorial links first.</p>
        <ul className="mt-3 divide-y divide-navy-100">
          {linkedArticles.map((l) => (
            <li key={`${l.role}-${l.position}`} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="me-2 rounded border border-navy-100 px-1.5 py-0.5 text-xs font-bold">{l.role}</span>
                {l.tr!.title}
              </span>
              <a className="text-xs font-bold text-terracotta-ink hover:underline" href={`/admin/en/articles/${id}/${locale}`}>open article →</a>
            </li>
          ))}
          {linkedArticles.length === 0 && <li className="py-3 text-sm text-ink-soft">No articles linked yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function MissingLocaleView({ destinationId, locale, name }: { destinationId: string; locale: string; name: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black text-navy">{name}</h1>
      <p className="mt-2 text-sm text-ink-soft">No {locale.toUpperCase()} version exists yet — create it from the destination's default locale page.</p>
      <a href={`/admin/en/destinations/${destinationId}/en/`} className="mt-4 inline-block rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white">
        Open default version
      </a>
    </div>
  );
}
