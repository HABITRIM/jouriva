import "server-only";
import type { Role, WorkflowStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { AuthorizationError } from "@/lib/auth";

/**
 * Editorial workflow state machine (spec §6/§8).
 *
 * · Transitions are explicit and guarded — no arbitrary status writes.
 * · Publishing (PUBLISH) is a separate, explicit human action; nothing in
 *   the pipeline (AI draft, fact-check, SEO score, translation) ever
 *   advances content to PUBLISHED or SCHEDULED automatically.
 * · Every transition is recorded (ArticleTransition): who/when/from/to/notes.
 */

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "FACT_CHECK",
  "SEO_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];

export type WorkflowAction =
  | "submit_review"     // DRAFT → IN_REVIEW
  | "reject"            // IN_REVIEW|FACT_CHECK|SEO_REVIEW|APPROVED → DRAFT (revision requested)
  | "start_fact_check"  // IN_REVIEW → FACT_CHECK
  | "pass_fact_check"   // FACT_CHECK → SEO_REVIEW
  | "start_seo_review"  // SEO_REVIEW handled from FACT_CHECK pass; editors may send back
  | "pass_seo_review"   // SEO_REVIEW → APPROVED
  | "approve"           // SEO_REVIEW → APPROVED (alias, explicit human approval)
  | "schedule"          // APPROVED → SCHEDULED (+future scheduledAt)
  | "unschedule"        // SCHEDULED → APPROVED
  | "publish"           // APPROVED|SCHEDULED → PUBLISHED (explicit human action only)
  | "unpublish"         // PUBLISHED → DRAFT
  | "archive"           // PUBLISHED → ARCHIVED
  | "revive";           // ARCHIVED → DRAFT

type TransitionRule = {
  from: WorkflowStatus[];
  to: WorkflowStatus | ((ctx: { scheduledAt?: Date | null }) => WorkflowStatus);
  roles: Role[]; // minimum roles (ADMIN always allowed)
  /** Authors may act only on their own article (ownership checked separately). */
  authorOwn?: boolean;
  requiresNotes?: boolean;
};

export const TRANSITIONS: Record<WorkflowAction, TransitionRule> = {
  submit_review:    { from: ["DRAFT"], to: "IN_REVIEW", roles: ["AUTHOR", "REVIEWER", "EDITOR"], authorOwn: true },
  reject:           { from: ["IN_REVIEW", "FACT_CHECK", "SEO_REVIEW", "APPROVED"], to: "DRAFT", roles: ["REVIEWER", "EDITOR"], requiresNotes: true },
  start_fact_check: { from: ["IN_REVIEW"], to: "FACT_CHECK", roles: ["REVIEWER", "EDITOR"] },
  pass_fact_check:  { from: ["FACT_CHECK"], to: "SEO_REVIEW", roles: ["REVIEWER", "EDITOR"] },
  start_seo_review: { from: ["FACT_CHECK"], to: "SEO_REVIEW", roles: ["REVIEWER", "EDITOR"] },
  pass_seo_review:  { from: ["SEO_REVIEW"], to: "APPROVED", roles: ["REVIEWER", "EDITOR"] },
  approve:          { from: ["SEO_REVIEW"], to: "APPROVED", roles: ["REVIEWER", "EDITOR"] },
  schedule:         { from: ["APPROVED"], to: "SCHEDULED", roles: ["EDITOR"] },
  unschedule:       { from: ["SCHEDULED"], to: "APPROVED", roles: ["EDITOR"] },
  publish:          { from: ["APPROVED", "SCHEDULED"], to: "PUBLISHED", roles: ["EDITOR"] },
  unpublish:        { from: ["PUBLISHED"], to: "DRAFT", roles: ["EDITOR"] },
  archive:          { from: ["PUBLISHED"], to: "ARCHIVED", roles: ["EDITOR"] },
  revive:           { from: ["ARCHIVED"], to: "DRAFT", roles: ["EDITOR"] },
};

export const PUBLISH_ACTIONS: WorkflowAction[] = ["publish", "schedule"];

export function canTransition(
  action: WorkflowAction,
  from: WorkflowStatus,
  role: Role,
  opts?: { isOwner?: boolean; scheduledAt?: Date | null; notes?: string | null }
): { ok: boolean; to?: WorkflowStatus; reason?: string } {
  const rule = TRANSITIONS[action];
  if (!rule) return { ok: false, reason: `Unknown action: ${action}` };
  if (!rule.from.includes(from)) {
    return { ok: false, reason: `Action "${action}" is not allowed from ${from}` };
  }
  if (rule.requiresNotes && !opts?.notes?.trim()) {
    return { ok: false, reason: "This action requires revision notes" };
  }
  const roleOk = role === "ADMIN" || rule.roles.includes(role);
  if (!roleOk) return { ok: false, reason: `Role ${role} may not perform "${action}"` };
  if (rule.authorOwn && role === "AUTHOR" && !opts?.isOwner) {
    return { ok: false, reason: "Authors may only act on their own articles" };
  }
  const to = typeof rule.to === "function" ? rule.to({ scheduledAt: opts?.scheduledAt }) : rule.to;
  if (action === "schedule" && (!opts?.scheduledAt || opts.scheduledAt <= new Date())) {
    return { ok: false, reason: "Scheduling requires a future date/time" };
  }
  return { ok: true, to };
}

/** Enforcing wrapper for server actions. Throws AuthorizationError on denial. */
export function assertTransition(
  action: WorkflowAction,
  from: WorkflowStatus,
  user: SessionUser,
  opts?: { isOwner?: boolean; scheduledAt?: Date | null; notes?: string | null }
): WorkflowStatus {
  const result = canTransition(action, from, user.role, opts);
  if (!result.ok || !result.to) throw new AuthorizationError(result.reason ?? "Transition not allowed");
  return result.to;
}

/** Human-review gate: these are the ONLY actions that can ever produce PUBLISHED/SCHEDULED. */
export function isPublishingAction(action: WorkflowAction): boolean {
  return PUBLISH_ACTIONS.includes(action);
}
