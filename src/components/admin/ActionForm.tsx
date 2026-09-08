"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

/**
 * Shared admin form wrapper: useActionState + inline error/success messages +
 * pending-aware submit button. Server actions are passed as references.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  confirm,
  resetOnSuccess = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children?: React.ReactNode;
  submitLabel: string;
  className?: string;
  confirm?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
      key={resetOnSuccess && state.ok ? String(state.message) : "form"}
    >
      {children}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-700 disabled:opacity-50"
      >
        {pending ? "Working…" : submitLabel}
      </button>
      {state.error && (
        <p role="alert" className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {state.message}
        </p>
      )}
    </form>
  );
}
