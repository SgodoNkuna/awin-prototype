/**
 * PayFast helpers — SERVER ONLY.
 * Never import from client / route component code.
 */
import { createHash } from "crypto";

export const PAYFAST_SANDBOX = (process.env.PAYFAST_SANDBOX ?? "true") !== "false";

export const PAYFAST_PROCESS_URL = PAYFAST_SANDBOX
  ? "https://sandbox.payfast.co.za/eng/process"
  : "https://www.payfast.co.za/eng/process";

export const PAYFAST_VALIDATE_URL = PAYFAST_SANDBOX
  ? "https://sandbox.payfast.co.za/eng/query/validate"
  : "https://www.payfast.co.za/eng/query/validate";

/**
 * PayFast uses urlencoding where SPACE = "+" (not %20) and uppercase hex.
 * This must match exactly or signatures will mismatch.
 */
function pfEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Build the MD5 signature for a set of fields.
 * - `orderedFields`: array of [key, value] in the order they should be signed.
 *   For outbound checkout, use the field order as defined in PayFast docs.
 *   For inbound ITN, use the order fields arrived in the request body.
 */
export function pfSignature(
  orderedFields: Array<[string, string]>,
  passphrase?: string,
): string {
  const parts: string[] = [];
  for (const [k, v] of orderedFields) {
    if (k === "signature") continue;
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${k}=${pfEncode(String(v).trim())}`);
  }
  let queryString = parts.join("&");
  if (passphrase && passphrase.length > 0) {
    queryString += `&passphrase=${pfEncode(passphrase)}`;
  }
  return createHash("md5").update(queryString).digest("hex");
}

/**
 * Parse raw form-urlencoded body PRESERVING field order.
 * Required for ITN signature validation.
 */
export function parseOrderedForm(body: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const pair of body.split("&")) {
    if (!pair) continue;
    const idx = pair.indexOf("=");
    const k = idx >= 0 ? pair.slice(0, idx) : pair;
    const v = idx >= 0 ? pair.slice(idx + 1) : "";
    out.push([decodeURIComponent(k.replace(/\+/g, " ")), decodeURIComponent(v.replace(/\+/g, " "))]);
  }
  return out;
}

export function orderedToObject(fields: Array<[string, string]>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of fields) o[k] = v;
  return o;
}

/** Post payload back to PayFast for server-side validation. */
export async function pfValidate(body: string): Promise<boolean> {
  try {
    const res = await fetch(PAYFAST_VALIDATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const text = (await res.text()).trim();
    return text === "VALID";
  } catch {
    return false;
  }
}

/**
 * Field order for outbound checkout signature.
 * Source: https://developers.payfast.co.za/docs#checkout
 */
export const PAYFAST_FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "name_first",
  "name_last",
  "email_address",
  "cell_number",
  "m_payment_id",
  "amount",
  "item_name",
  "item_description",
  "custom_int1",
  "custom_int2",
  "custom_int3",
  "custom_int4",
  "custom_int5",
  "custom_str1",
  "custom_str2",
  "custom_str3",
  "custom_str4",
  "custom_str5",
  "email_confirmation",
  "confirmation_address",
] as const;
