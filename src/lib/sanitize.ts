/**
 * Input sanitisation helpers.
 * Strip characters commonly abused for HTML/SQL/script injection before
 * sending user input to the database. Server-side validation (Zod, RLS,
 * unique indexes) still applies — this is defense in depth.
 */

export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).trim().replace(/[<>'"`;]/g, "");
}

export function sanitizeOptionalText(input: string | null | undefined): string | null {
  const cleaned = sanitizeText(input);
  return cleaned.length ? cleaned : null;
}

export function sanitizeEmail(input: string | null | undefined): string {
  const trimmed = String(input ?? "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) throw new Error("Invalid email format");
  if (trimmed.length > 255) throw new Error("Email too long");
  return trimmed;
}

export function sanitizeIdNumber(input: string | null | undefined): string {
  return String(input ?? "").trim().replace(/\D/g, "").slice(0, 13);
}

export function sanitizePhone(input: string | null | undefined): string {
  return String(input ?? "").trim().replace(/[^\d+\s()-]/g, "").slice(0, 20);
}

export function sanitizeUrl(input: string | null | undefined): string | null {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Friendly message for Postgres unique-violation (code 23505). */
export function isDuplicateError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  return /duplicate key|already exists|unique constraint/i.test(err.message ?? "");
}
