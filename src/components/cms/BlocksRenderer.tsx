import Image from "next/image";
import { parseInline, type Block, type InlineToken } from "@/lib/cms/blocks";

/**
 * Server-side renderer: structured blocks → semantic HTML (React elements).
 * No dangerouslySetInnerHTML anywhere — user text is always escaped by React,
 * and inline links are protocol-validated at parse time (spec §23).
 */

function Inline({ text }: { text: string }) {
  const tokens: InlineToken[] = parseInline(text);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === "bold") return <strong key={i}>{t.value}</strong>;
        if (t.kind === "italic") return <em key={i}>{t.value}</em>;
        if (t.kind === "link") {
          const external = t.href.startsWith("http");
          return (
            <a
              key={i}
              href={t.href}
              {...(external ? { rel: "noopener nofollow" } : {})}
              className="text-terracotta-ink underline underline-offset-2 hover:text-terracotta-dark"
            >
              {t.value}
            </a>
          );
        }
        return <span key={i}>{t.value}</span>;
      })}
    </>
  );
}

export function BlocksRenderer({
  blocks,
  assets,
}: {
  blocks: Block[];
  assets: Record<string, { url: string; width: number | null; height: number | null; alt: string; credit: string | null; aiGenerated: boolean }>;
}) {
  return (
    <div className="prose-jouriva">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return (
              <p key={i} dir="auto">
                <Inline text={block.text} />
              </p>
            );
          case "heading": {
            const Tag = block.level === 2 ? "h2" : "h3";
            return (
              <Tag key={i} dir="auto" className="font-display mt-8 text-2xl font-bold text-navy">
                {block.text}
              </Tag>
            );
          }
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={i} dir="auto" className={`my-4 max-w-[65ch] space-y-1.5 ps-6 ${block.ordered ? "list-decimal" : "list-disc"}`}>
                {block.items.map((item, j) => (
                  <li key={j} className="leading-relaxed">
                    <Inline text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote key={i} dir="auto" className="my-6 max-w-[65ch] border-s-4 border-terracotta bg-sand/60 py-3 pe-4 ps-5 italic">
                <Inline text={block.text} />
                {block.attribution && <footer className="mt-2 text-sm not-italic text-ink-soft">— {block.attribution}</footer>}
              </blockquote>
            );
          case "image": {
            const asset = assets[block.assetId];
            if (!asset) return null;
            return (
              <figure key={i} className="my-6">
                <div className="relative aspect-[16/10] w-full max-w-3xl overflow-hidden rounded-xl">
                  <Image src={asset.url} alt={block.alt || asset.alt} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
                </div>
                {(block.caption || asset.credit) && (
                  <figcaption className="mt-2 text-sm text-ink-soft" dir="auto">
                    {block.caption}
                    {asset.credit ? ` · ${asset.credit}` : ""}
                    {asset.aiGenerated ? " · AI-generated image" : ""}
                  </figcaption>
                )}
              </figure>
            );
          }
          case "embed":
            return (
              <figure key={i} className="my-6">
                <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-xl">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(block.videoId)}`}
                    title={block.caption ?? "Video"}
                    loading="lazy"
                    allowFullScreen
                    className="h-full w-full"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                {block.caption && <figcaption className="mt-2 text-sm text-ink-soft" dir="auto">{block.caption}</figcaption>}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
