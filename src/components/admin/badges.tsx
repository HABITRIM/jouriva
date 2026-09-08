import type { WorkflowStatus, VerificationStatus } from "@prisma/client";

const STATUS_STYLES: Record<WorkflowStatus, string> = {
  DRAFT: "bg-stone-100 text-stone-700 border-stone-300",
  IN_REVIEW: "bg-sky-100 text-sky-900 border-sky-300",
  FACT_CHECK: "bg-violet-100 text-violet-900 border-violet-300",
  SEO_REVIEW: "bg-cyan-100 text-cyan-900 border-cyan-300",
  APPROVED: "bg-emerald-100 text-emerald-900 border-emerald-300",
  SCHEDULED: "bg-amber-100 text-amber-900 border-amber-300",
  PUBLISHED: "bg-emerald-600 text-white border-emerald-700",
  ARCHIVED: "bg-red-50 text-red-800 border-red-200",
};

export function StatusBadge({ status }: { status: WorkflowStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

const VERIFY_STYLES: Record<string, string> = {
  VERIFIED: "bg-emerald-100 text-emerald-900 border-emerald-300",
  NEEDS_REVIEW: "bg-amber-100 text-amber-900 border-amber-300",
  OUTDATED: "bg-orange-100 text-orange-900 border-orange-300",
  ARCHIVED: "bg-stone-200 text-stone-700 border-stone-400",
};

export function VerificationBadgeSmall({ status }: { status: VerificationStatus | null }) {
  if (!status) {
    return <span className="inline-block whitespace-nowrap rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-semibold text-stone-500">UNSET</span>;
  }
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold ${VERIFY_STYLES[status]}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
