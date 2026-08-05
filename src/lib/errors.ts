/**
 * Extracts a human-readable message from any thrown value. Server function
 * errors are usually a real Error, but a middleware failure (e.g. a missing
 * env var crashing before the handler even runs) can come back as a plain
 * object with no `.message`, which `toast.error(e.message)` would render as
 * an unhelpful "{}" or "undefined".
 */
export function getErrorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  if (e && typeof e === "object") {
    const withMessage = e as { message?: unknown };
    if (typeof withMessage.message === "string" && withMessage.message) return withMessage.message;
  }
  return fallback;
}
