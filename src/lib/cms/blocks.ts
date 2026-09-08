import { z } from "zod";

/**
 * Structured content blocks (Phase 2, spec §9).
 *
 * Articles are stored as typed, portable block arrays — never opaque HTML —
 * so content can be re-rendered, validated, diffed and transformed later.
 * The public renderer (src/components/cms/BlocksRenderer.tsx) turns blocks
 * into semantic HTML on the server; all user strings render as React text
 * (never dangerouslySetInnerHTML), which makes XSS structurally impossible.
 *
 * Inline formatting inside paragraphs/list items/quotes uses a tiny, safe
 * subset: **bold**, *italic*, [text](/internal-or-https-link). Parsed to
 * React nodes — no raw HTML ever enters the pipeline.
 */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // Latin slugs incl. Arabic URLs (binding decision #2)

export const inlineTextSchema = z
  .string()
  .max(20_000)
  .refine((v) => !/[<>]/.test(v.replace(/<br\s*\/?>/gi, "")), {
    message: "Raw HTML tags are not allowed in text blocks",
  });

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: inlineTextSchema.min(1) }),
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().min(1).max(300),
  }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean(),
    items: z.array(inlineTextSchema.min(1)).min(1).max(50),
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string().min(1).max(5000),
    attribution: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal("image"),
    assetId: z.string().min(1),
    alt: z.string().min(1).max(1000), // alt text is REQUIRED (accessibility + SEO guidance)
    caption: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("embed"),
    provider: z.literal("youtube"), // safely supported set; IDs are validated, URLs are not embedded
    videoId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/, "Invalid video id"),
    caption: z.string().max(300).optional(),
  }),
]);

export const blocksSchema = z.array(blockSchema).max(500);

export type Block = z.infer<typeof blockSchema>;
export type ParagraphBlock = Extract<Block, { type: "paragraph" }>;
export type HeadingBlock = Extract<Block, { type: "heading" }>;
export type ListBlock = Extract<Block, { type: "list" }>;
export type QuoteBlock = Extract<Block, { type: "quote" }>;
export type ImageBlock = Extract<Block, { type: "image" }>;
export type EmbedBlock = Extract<Block, { type: "embed" }>;

/** Parse the tiny safe inline syntax into tokens (renderer turns them into React nodes). */
export type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "link"; value: string; href: string };

const INLINE_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) tokens.push({ kind: "text", value: text.slice(last, idx) });
    if (m[1] !== undefined) tokens.push({ kind: "bold", value: m[1] });
    else if (m[2] !== undefined) tokens.push({ kind: "italic", value: m[2] });
    else if (m[3] !== undefined && m[4] !== undefined) {
      const href = m[4];
      // Only internal paths or https(s) links are allowed
      const safe = /^\/[^\s]*$|^https?:\/\/[^\s]+$/.test(href) && !href.includes('"');
      if (safe) tokens.push({ kind: "link", value: m[3], href });
      else tokens.push({ kind: "text", value: m[3] });
    }
    last = idx + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: "text", value: text.slice(last) });
  return tokens;
}

export function blocksToPlainText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "paragraph":
      case "heading":
        parts.push(b.text);
        break;
      case "list":
        parts.push(b.items.join(" "));
        break;
      case "quote":
        parts.push(b.text + (b.attribution ? ` ${b.attribution}` : ""));
        break;
      case "image":
        parts.push(`${b.alt} ${b.caption ?? ""}`);
        break;
      case "embed":
        parts.push(b.caption ?? "");
        break;
    }
  }
  return parts.join(" ");
}

/** Reading time at ~200 wpm (min 1). */
export function readingMinutes(blocks: Block[]): number {
  const words = blocksToPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Defensive parse of the JSON column into validated blocks (empty on failure). */
export function parseBlocks(value: unknown): Block[] {
  const result = blocksSchema.safeParse(value);
  return result.success ? result.data : [];
}

export function validateBlocks(value: unknown): { ok: true; blocks: Block[] } | { ok: false; error: string } {
  const result = blocksSchema.safeParse(value);
  return result.success
    ? { ok: true, blocks: result.data }
    : { ok: false, error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}
