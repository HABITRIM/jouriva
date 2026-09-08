"use client";

import { useState } from "react";

/**
 * Structured block editor (spec §9) — plain React, no heavyweight editor
 * dependency. Produces the portable Block[] JSON consumed by the public
 * renderer. Keyboard-accessible controls, labelled inputs, focus styles.
 */

type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "image"; assetId: string; alt: string; caption?: string }
  | { type: "embed"; provider: "youtube"; videoId: string; caption?: string };

export interface AssetOption {
  id: string;
  url: string;
  filename: string;
}

let counter = 0;
const key = () => `b${++counter}`;

const field =
  "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink";
const label = "block text-xs font-bold uppercase tracking-wide text-ink-soft";

export function BlocksEditor({ initialBlocks, assets }: { initialBlocks: Block[]; assets: AssetOption[] }) {
  const [blocks, setBlocks] = useState<{ k: string; b: Block }[]>(
    initialBlocks.map((b) => ({ k: key(), b }))
  );

  const update = (k: string, b: Block) => setBlocks((bs) => bs.map((x) => (x.k === k ? { k, b } : x)));
  const remove = (k: string) => setBlocks((bs) => bs.filter((x) => x.k !== k));
  const move = (idx: number, delta: number) =>
    setBlocks((bs) => {
      const next = [...bs];
      const j = idx + delta;
      if (j < 0 || j >= next.length) return bs;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const add = (b: Block) => setBlocks((bs) => [...bs, { k: key(), b }]);

  return (
    <div className="space-y-3">
      <input type="hidden" name="blocks" value={JSON.stringify(blocks.map((x) => x.b))} />

      {blocks.map(({ k, b }, idx) => (
        <fieldset key={k} className="rounded-xl border border-navy-100 bg-[#FAFBFC] p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-terracotta-ink">
            {b.type}
          </legend>

          <div className="absolute right-4 top-4 flex gap-1">
            <button type="button" aria-label={`Move block ${idx + 1} up`} onClick={() => move(idx, -1)} className="rounded border border-navy-100 bg-white px-2 py-0.5 text-xs">↑</button>
            <button type="button" aria-label={`Move block ${idx + 1} down`} onClick={() => move(idx, 1)} className="rounded border border-navy-100 bg-white px-2 py-0.5 text-xs">↓</button>
            <button type="button" aria-label={`Remove block ${idx + 1}`} onClick={() => remove(k)} className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">✕</button>
          </div>

          {b.type === "paragraph" && (
            <label className={label}>
              Paragraph · inline: **bold** *italic* [text](/link)
              <textarea rows={4} className={field} value={b.text} onChange={(e) => update(k, { type: "paragraph", text: e.target.value })} dir="auto" />
            </label>
          )}

          {b.type === "heading" && (
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <label className={label}>
                Level
                <select className={field} value={b.level} onChange={(e) => update(k, { type: "heading", level: Number(e.target.value) as 2 | 3, text: b.text })}>
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                </select>
              </label>
              <label className={label}>
                Heading text
                <input className={field} value={b.text} onChange={(e) => update(k, { type: "heading", level: b.level, text: e.target.value })} dir="auto" />
              </label>
            </div>
          )}

          {b.type === "list" && (
            <div>
              <label className={label}>
                List type
                <select className={field} value={b.ordered ? "ol" : "ul"} onChange={(e) => update(k, { type: "list", ordered: e.target.value === "ol", items: b.items })}>
                  <option value="ul">Bullet list</option>
                  <option value="ol">Numbered list</option>
                </select>
              </label>
              {b.items.map((item, i) => (
                <div key={i} className="mt-1 flex gap-1">
                  <input
                    className={field}
                    value={item}
                    aria-label={`Item ${i + 1}`}
                    onChange={(e) => update(k, { type: "list", ordered: b.ordered, items: b.items.map((x, j) => (j === i ? e.target.value : x)) })}
                    dir="auto"
                  />
                  <button type="button" aria-label={`Remove item ${i + 1}`} className="rounded border border-red-200 bg-red-50 px-2 text-xs text-red-700" onClick={() => update(k, { type: "list", ordered: b.ordered, items: b.items.filter((_, j) => j !== i) })}>✕</button>
                </div>
              ))}
              <button type="button" className="mt-1 rounded-lg border border-navy-100 bg-white px-2 py-1 text-xs font-bold" onClick={() => update(k, { type: "list", ordered: b.ordered, items: [...b.items, ""] })}>
                + Add item
              </button>
            </div>
          )}

          {b.type === "quote" && (
            <div className="grid gap-2">
              <label className={label}>
                Quote
                <textarea rows={3} className={field} value={b.text} onChange={(e) => update(k, { type: "quote", text: e.target.value, attribution: b.attribution })} dir="auto" />
              </label>
              <label className={label}>
                Attribution (optional)
                <input className={field} value={b.attribution ?? ""} onChange={(e) => update(k, { type: "quote", text: b.text, attribution: e.target.value })} />
              </label>
            </div>
          )}

          {b.type === "image" && (
            <div className="grid gap-2">
              <label className={label}>
                Image (media library)
                <select className={field} value={b.assetId} onChange={(e) => update(k, { type: "image", assetId: e.target.value, alt: b.alt, caption: b.caption })}>
                  <option value="">— select —</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.filename}</option>
                  ))}
                </select>
              </label>
              <label className={label}>
                Alt text (required — accessibility + SEO)
                <input className={field} value={b.alt} onChange={(e) => update(k, { type: "image", assetId: b.assetId, alt: e.target.value, caption: b.caption })} dir="auto" />
              </label>
              <label className={label}>
                Caption (optional)
                <input className={field} value={b.caption ?? ""} onChange={(e) => update(k, { type: "image", assetId: b.assetId, alt: b.alt, caption: e.target.value })} dir="auto" />
              </label>
              {b.assetId && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={assets.find((a) => a.id === b.assetId)?.url} alt="" className="h-24 w-44 rounded-lg object-cover" />
              )}
            </div>
          )}

          {b.type === "embed" && (
            <div className="grid gap-2">
              <label className={label}>
                YouTube video ID (safe embed only)
                <input className={field} value={b.videoId} onChange={(e) => update(k, { type: "embed", provider: "youtube", videoId: e.target.value.trim(), caption: b.caption })} />
              </label>
              <label className={label}>
                Caption (optional)
                <input className={field} value={b.caption ?? ""} onChange={(e) => update(k, { type: "embed", provider: "youtube", videoId: b.videoId, caption: e.target.value })} />
              </label>
            </div>
          )}
        </fieldset>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => add({ type: "paragraph", text: "" })} className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-terracotta">+ Paragraph</button>
        <button type="button" onClick={() => add({ type: "heading", level: 2, text: "" })} className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-terracotta">+ Heading</button>
        <button type="button" onClick={() => add({ type: "list", ordered: false, items: [""] })} className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-terracotta">+ List</button>
        <button type="button" onClick={() => add({ type: "quote", text: "" })} className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-terracotta">+ Quote</button>
        <button type="button" onClick={() => add({ type: "image", assetId: "", alt: "" })} className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-terracotta">+ Image</button>
        <button type="button" onClick={() => add({ type: "embed", provider: "youtube", videoId: "" })} className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-terracotta">+ YouTube embed</button>
      </div>
    </div>
  );
}
