/**
 * Lightweight field validation helpers — no external dependencies.
 * Actions call these to build `fieldErrors` maps; the client translates
 * the returned error codes via `useErrorText()`.
 */

export type FieldErrors = Record<string, string>;

/** Returns error code if value is null/empty, otherwise null. */
export function vRequired(
  v: string | null | undefined,
  code: string,
): string | null {
  return !v || v.trim() === "" ? code : null;
}

/** Returns "email_invalid" if value is not a valid email (only if non-empty). */
export function vEmail(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null; // let vRequired handle empty
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "email_invalid";
}

/** Returns "number_invalid" if value is non-empty but not a valid number. */
export function vNumber(v: string | null | undefined): string | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? null : "number_invalid";
}

/** Returns true when fieldErrors has at least one entry. */
export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
