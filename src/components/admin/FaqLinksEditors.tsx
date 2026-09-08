"use client";

import { useState } from "react";

/** FAQ editor (spec §17): per-translation questions/answers with reorder. */
export function FaqEditor({ initial }: { initial: { question: string; answer: string }[] }) {
  const [items, setItems] = useState(initial);
  const field = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink";
  return (
    <div className="space-y-3">
      <input type="hidden" name="faq" value={JSON.stringify(items)} />
      {items.map((item, i) => (
        <fieldset key={i} className="rounded-xl border border-navy-100 bg-[#FAFBFC] p-3">
          <legend className="px-1 text-xs font-bold text-terracotta-ink">Q{i + 1}</legend>
          <label className="block text-xs font-bold uppercase tracking-wide text-ink-soft">
            Question
            <input className={field} value={item.question} aria-label={`Question ${i + 1}`} dir="auto"
              onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
          </label>
          <label className="mt-2 block text-xs font-bold uppercase tracking-wide text-ink-soft">
            Answer
            <textarea rows={3} className={field} value={item.answer} aria-label={`Answer ${i + 1}`} dir="auto"
              onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
          </label>
          <div className="mt-2 flex gap-1">
            <button type="button" className="rounded border border-navy-100 bg-white px-2 py-0.5 text-xs" aria-label={`Move question ${i + 1} up`} onClick={() => setItems((xs) => { const n = [...xs]; if (i > 0) [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>↑</button>
            <button type="button" className="rounded border border-navy-100 bg-white px-2 py-0.5 text-xs" aria-label={`Move question ${i + 1} down`} onClick={() => setItems((xs) => { const n = [...xs]; if (i < n.length - 1) [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}>↓</button>
            <button type="button" className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700" aria-label={`Remove question ${i + 1}`} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>✕</button>
          </div>
        </fieldset>
      ))}
      <button type="button" onClick={() => setItems((xs) => [...xs, { question: "", answer: "" }])} className="rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-terracotta">
        + Add question
      </button>
      <p className="text-xs text-ink-soft">FAQ JSON-LD is emitted only when visible questions exist on the page.</p>
    </div>
  );
}

/** Internal-linking editor (spec §18): human-controlled related links. */
export function LinksEditor({
  initial,
  candidates,
}: {
  initial: { anchorText: string; targetTranslationId: string }[];
  candidates: { id: string; title: string; locale: string; slug: string; workflowStatus: string }[];
}) {
  const [links, setLinks] = useState(initial);
  const [query, setQuery] = useState("");
  const field = "mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink";
  const filtered = candidates.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  return (
    <div className="space-y-3">
      <input type="hidden" name="links" value={JSON.stringify(links)} />
      <ul className="divide-y divide-navy-100 overflow-hidden rounded-xl border border-navy-100 bg-white">
        {links.map((l, i) => {
          const target = candidates.find((c) => c.id === l.targetTranslationId);
          return (
            <li key={i} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>
                <span className="font-semibold text-navy">{l.anchorText}</span>
                <span className="text-ink-soft"> → {target ? `/${target.locale}/guides/${target.slug}/` : "?"}</span>
              </span>
              <button type="button" aria-label={`Remove link ${i + 1}`} onClick={() => setLinks((xs) => xs.filter((_, j) => j !== i))} className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">✕</button>
            </li>
          );
        })}
        {links.length === 0 && <li className="p-3 text-sm text-ink-soft">No internal links yet.</li>}
      </ul>

      <div className="rounded-xl border border-navy-100 bg-[#FAFBFC] p-3">
        <label className="block text-xs font-bold uppercase tracking-wide text-ink-soft">
          Find target article (same-locale published/approved)
          <input className={field} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles…" />
        </label>
        <ul className="mt-2 space-y-1">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-start text-sm hover:border-terracotta"
                onClick={() => {
                  const anchor = window.prompt("Anchor text for this link:", c.title);
                  if (anchor && anchor.trim().length >= 2) setLinks((xs) => [...xs, { anchorText: anchor.trim(), targetTranslationId: c.id }]);
                }}
              >
                {c.title} <span className="text-xs text-ink-soft">({c.locale} · {c.workflowStatus})</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Media picker field (hero image / og image): dropdown over the library. */
export function MediaPickerField({
  name,
  initialId,
  assets,
  label,
}: {
  name: string;
  initialId: string | null;
  assets: { id: string; filename: string; url: string }[];
  label: string;
}) {
  const [value, setValue] = useState(initialId ?? "");
  const selected = assets.find((a) => a.id === value);
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <span className="block text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</span>
      <select aria-label={label} className="mt-1 w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm" value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="">— none —</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>{a.filename}</option>
        ))}
      </select>
      {selected && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={selected.url} alt="" className="mt-2 h-28 w-48 rounded-lg object-cover" />
      )}
    </div>
  );
}
