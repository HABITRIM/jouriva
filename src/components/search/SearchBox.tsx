"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Search box with lightweight autocomplete (Phase 4, spec §11).
 * - progressive enhancement: a plain GET form works without JavaScript
 * - client debounce (250 ms), minimum 2 characters, ≤ 8 suggestions
 * - suggestions come from /api/search/suggest (published-only, server-validated)
 * - minimal state, no external libraries
 */
export function SearchBox({
  locale,
  initialQuery,
  labels,
}: {
  locale: string;
  initialQuery: string;
  labels: { placeholder: string; button: string; suggestionsLabel: string };
}) {
  const [value, setValue] = useState(initialQuery);
  const [items, setItems] = useState<{ type: string; title: string; url: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function onChange(v: string) {
    setValue(v);
    setActive(-1);
    if (timer.current) clearTimeout(timer.current);
    const q = v.trim();
    if (q.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest/?locale=${encodeURIComponent(locale)}&q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions: { type: string; title: string; url: string }[] };
        setItems(data.suggestions ?? []);
        setOpen((data.suggestions ?? []).length > 0);
      } catch {
        /* network hiccup — suggestions just stay hidden */
      }
    }, 250);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      window.location.href = `/${locale}${items[active].url}`;
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const typeLabel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

  return (
    <div ref={boxRef} className="relative">
      <form action={`/${locale}/search/`} method="get" role="search" className="flex gap-2">
        <input
          type="search"
          name="q"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={labels.placeholder}
          aria-label={labels.placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          maxLength={100}
          className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3 text-base outline-none focus-visible:outline-2 focus-visible:outline-terracotta-ink"
        />
        <button type="submit" className="rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-navy-700">
          {labels.button}
        </button>
      </form>
      {open && (
        <ul role="listbox" aria-label={labels.suggestionsLabel} className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-navy-100 bg-white shadow-lg">
          {items.map((s, i) => (
            <li key={`${s.type}-${s.url}-${i}`} role="option" aria-selected={i === active}>
              <a
                href={`/${locale}${s.url}`}
                className={`flex items-center justify-between px-4 py-2.5 text-sm ${i === active ? "bg-sand" : "hover:bg-sand"}`}
                onMouseEnter={() => setActive(i)}
              >
                <span className="font-semibold text-navy">{s.title}</span>
                <span className="ms-3 rounded-full border border-navy-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink-soft">{typeLabel(s.type)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
