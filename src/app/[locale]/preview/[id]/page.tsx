import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslationForPreview } from "@/lib/cms/public-queries";
import { getDestinationTranslationForPreview } from "@/lib/cms/public-destinations";
import { relatedArticlesForDestination } from "@/lib/cms/related";
import { getSessionUser, verifyPreviewToken } from "@/lib/auth";
import { BlocksRenderer } from "@/components/cms/BlocksRenderer";
import { Faq } from "@/components/Faq";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { VerificationWarning } from "@/components/Verification";
import { DestinationScreen } from "@/components/destination/DestinationScreen";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ t?: string }>;
}

/** Secure preview (spec §10):
 *  - access requires EITHER a signed, expiring token (?t=) OR an
 *    authenticated CMS session (any role)
 *  - X-Robots-Tag: noindex via next.config header + meta robots below
 *  - never in sitemap/RSS/listings; no canonical URL is emitted
 *  - renders with the REAL public article components
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  void params;
  return {
    title: "[Preview] — JOURIVA CMS",
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function PreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { t: token } = await searchParams;

  const user = await getSessionUser();
  const tokenValid = token ? verifyPreviewToken(id, token) : false;
  if (!tokenValid && !user) notFound(); // unauthorized → indistinguishable from missing

  // Phase 3: destinations preview through the same token/session gate
  const destination = await getDestinationTranslationForPreview(id).catch(() => null);
  if (destination) {
    const related = await relatedArticlesForDestination(destination.destinationId, destination.locale, 6);
    return <DestinationScreen destination={destination} relatedArticles={related} locale={destination.locale} />;
  }

  const article = await getTranslationForPreview(id);
  if (!article) notFound();

  const statusLabel = article.translationGroup.find((g) => g.slug === article.slug)?.status ?? "DRAFT";

  return (
    <div className="container-jouriva py-8">
      <div className="mb-6 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4" role="note">
        <p className="font-bold text-amber-900">
          CMS PREVIEW — {statusLabel.replaceAll("_", " ")} · NOT PUBLIC · NOT INDEXED
        </p>
        <p className="mt-1 text-sm text-amber-800">
          This is how the article will render when published. Preview links expire; they are never listed publicly.
        </p>
      </div>

      <Breadcrumbs items={[{ name: "Preview" }, { name: article.title }]} />

      <p className="kicker">{article.locale.toUpperCase()} preview</p>
      <h1 className="font-display mt-2 text-3xl font-black leading-tight text-navy sm:text-4xl">{article.h1 ?? article.title}</h1>
      {article.excerpt && <p className="mt-3 max-w-3xl text-lg text-ink-soft" dir="auto">{article.excerpt}</p>}

      {article.heroImage && (
        <figure className="relative mt-6 aspect-[3/2] w-full max-w-4xl overflow-hidden rounded-2xl shadow-lg ring-1 ring-navy/10">
          <Image src={article.heroImage.url} alt={article.heroImage.alt || article.title} fill sizes="100vw" className="object-cover" />
          <figcaption className="absolute bottom-2 end-2 rounded-full bg-navy/70 px-3 py-1 text-xs text-white">
            {article.heroImage.credit}
            {article.heroImage.aiGenerated ? " · AI-generated image" : ""}
          </figcaption>
        </figure>
      )}

      <div className="mx-auto mt-6 max-w-3xl">
        <BlocksRenderer blocks={article.blocks} assets={article.blockAssets} />
      </div>

      {article.warningEnabled && (
        <div className="mx-auto mt-6 max-w-3xl">
          <VerificationWarning />
        </div>
      )}
      {article.faq.length > 0 && (
        <div className="mx-auto max-w-3xl">
          <Faq items={article.faq} />
        </div>
      )}
      {article.author && (
        <p className="mx-auto mt-8 max-w-3xl text-sm text-ink-soft">
          By <strong>{article.author.name}</strong>
          {article.author.role ? ` — ${article.author.role}` : ""}
        </p>
      )}
    </div>
  );
}
