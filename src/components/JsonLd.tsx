/**
 * JSON-LD structured data injector.
 * Renders a <script type="application/ld+json"> tag for one schema object.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD content is data, not user-supplied markup
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
