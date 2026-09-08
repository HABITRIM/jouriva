/**
 * Verification system for time-sensitive information (Travel Updates and
 * any content with expiry-sensitive facts).
 *
 * Every verifiable page shows:
 *  - Last verified date
 *  - Verification status: Verified | Needs Review | Outdated | Archived
 *  - The standing warning: "Information may change. Always verify critical
 *    requirements with official sources."
 *
 * Status keys map to messages.verification.* per locale.
 */
export type VerificationStatusKey = "verified" | "needsReview" | "outdated" | "archived";

export const VERIFICATION_ORDER: VerificationStatusKey[] = [
  "verified",
  "needsReview",
  "outdated",
  "archived",
];

export interface VerificationInfo {
  status: VerificationStatusKey;
  /** ISO date string of the last editorial verification pass. */
  lastVerified: string;
}

/** Tailwind classes per status (color + contrast-checked). */
export const VERIFICATION_STYLES: Record<VerificationStatusKey, string> = {
  verified: "bg-emerald-100 text-emerald-900 border-emerald-700/30",
  needsReview: "bg-amber-100 text-amber-900 border-amber-700/30",
  outdated: "bg-orange-100 text-orange-900 border-orange-700/30",
  archived: "bg-stone-200 text-stone-700 border-stone-500/30",
};
