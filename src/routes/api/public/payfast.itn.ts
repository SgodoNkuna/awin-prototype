import { createFileRoute } from "@tanstack/react-router";

/**
 * PayFast ITN webhook.
 * Public endpoint — no auth — but signature + post-back validated inside.
 */
export const Route = createFileRoute("/api/public/payfast/itn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { parseOrderedForm, orderedToObject, pfSignature } = await import(
          "@/lib/payfast.server"
        );
        const { processItnPayload } = await import("@/lib/payfast-process.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const rawBody = await request.text();
        const ordered = parseOrderedForm(rawBody);
        const payload = orderedToObject(ordered);

        const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
        const expectedSig = pfSignature(ordered, passphrase);
        const sigValid = expectedSig === (payload["signature"] ?? "");

        // Log the event up front so admins can retry failed ones
        const sourceIp =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          null;

        let processed = false;
        let error: string | null = sigValid ? null : "invalid signature";
        let paymentId: string | null = null;

        if (sigValid) {
          const result = await processItnPayload(payload);
          processed = result.ok;
          error = result.error ?? null;
          paymentId = result.paymentId ?? null;
        }

        await supabaseAdmin.from("payment_webhook_events").insert({
          provider: "payfast",
          payment_id: paymentId,
          m_payment_id: payload["m_payment_id"] ?? null,
          pf_payment_id: payload["pf_payment_id"] ?? null,
          payload,
          source_ip: sourceIp,
          signature_valid: sigValid,
          source_valid: true, // we rely on post-back validate rather than IP allowlist
          processed,
          error,
        });

        // PayFast expects 200 OK regardless — they'll retry on non-2xx
        return new Response("OK", { status: 200 });
      },
    },
  },
});
