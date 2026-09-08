import { lockupFile, logoFile } from "@/lib/brand";

/**
 * JOURIVA logo renderer — brand assets are centralized and swappable
 * (src/lib/brand.ts auto-detects files; components never hardcode paths).
 *
 * Render priority:
 *   1. Full lockup master (symbol + wordmark outline) — preferred
 *   2. Symbol master + HTML-text wordmark
 *   3. Plain text wordmark (only if no masters exist)
 *
 * The logo is always rendered from the SVG masters — never redrawn in
 * CSS/HTML. Current masters follow the approved Horizon Path direction
 * (owner-authorized); drop-in replacements keep the same filenames.
 */
export function Logo({
  inverted = false,
  className = "",
}: {
  inverted?: boolean;
  className?: string;
}) {
  const lockup = lockupFile(inverted);

  if (lockup) {
    return (
      <img
        src={lockup}
        alt="JOURIVA"
        width={154}
        height={32}
        className={`h-8 w-auto ${className}`}
      />
    );
  }

  const symbol = logoFile(inverted);
  const textColor = inverted ? "text-sand" : "text-navy";

  if (symbol) {
    return (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        <img src={symbol} alt="" width={32} height={32} className="h-9 w-9" />
        <span className={`font-display text-[1.3rem] leading-none font-bold tracking-[0.18em] ${textColor}`}>
          JOURIVA
        </span>
      </span>
    );
  }

  // Fallback wordmark (only if no master exists yet). NOT a drawn logo.
  return (
    <span
      className={`font-display text-[1.35rem] leading-none font-bold tracking-[0.18em] ${textColor} ${className}`}
    >
      JOURIVA
    </span>
  );
}
