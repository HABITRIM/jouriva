/**
 * One search result (Phase 4, spec §8): explicit type badge, title, optional
 * description, optional published context chips. Missing metadata is never
 * fabricated — fields simply do not render. `result.url` arrives already
 * locale-prefixed (absolute path) from the server page.
 */
export function SearchResultCard({
  result,
  labels,
}: {
  result: {
    type: string;
    title: string;
    url: string;
    description: string | null;
    image: string | null;
    context: { label: string; url: string }[];
  };
  labels: Record<string, string>;
}) {
  const badgeTone =
    result.type === "DESTINATION"
      ? "bg-terracotta-soft text-terracotta-ink"
      : result.type === "TOPIC"
        ? "bg-navy-50 text-navy"
        : result.type === "AUTHOR"
          ? "bg-sand text-ink"
          : "bg-emerald-50 text-emerald-800";
  return (
    <article className="rounded-2xl border border-navy-100 bg-white p-5 transition-colors hover:border-navy-200">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-black uppercase tracking-wide ${badgeTone}`}>{labels[result.type] ?? result.type}</span>
      </div>
      <h3 className="font-display mt-2 text-lg font-black leading-snug text-navy">
        <a href={result.url} className="hover:underline">
          {result.title}
        </a>
      </h3>
      {result.description && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{result.description}</p>}
      {result.context.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {result.context.map((c) => (
            <a key={c.url} href={c.url} className="rounded-full border border-navy-100 px-2.5 py-0.5 text-xs font-semibold text-ink-soft hover:text-navy">
              {c.label}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
