import "server-only";

/** User-facing validation failure (maps to a 400-style form error). */
export class ValidationError extends Error {}

/** Maps service errors to safe action results: never leaks stack traces. */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) return error.message;
  if (error instanceof Error && error.name === "AuthorizationError") return error.message;
  if (error instanceof Error && error.name === "AuthenticationError") return "Please sign in.";
  console.error("[cms]", error);
  return "Something went wrong. The error has been logged.";
}
