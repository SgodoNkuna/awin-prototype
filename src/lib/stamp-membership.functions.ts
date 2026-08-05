import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureAdmin } from "@/lib/admin-roles.functions";

const CONTRIBUTION_LABEL: Record<string, "R200 entry fee" | "R500 monthly"> = {
  general: "R200 entry fee",
  active: "R500 monthly",
};

const stampSchema = z.object({
  application_id: z.string().uuid(),
});

/**
 * Generates the stamped membership certificate PDF for a verified applicant
 * and stores it in the private onboarding-uploads bucket. Runs with the
 * service role so it isn't subject to the applicant's own storage RLS scope
 * — an admin, not the member, is the one producing this record.
 */
export const generateStampedDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => stampSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildMembershipAgreementPdf } = await import("@/lib/membership-agreement-pdf");

    const { data: app } = await supabaseAdmin
      .from("applications")
      .select("id, user_id, full_name, id_number, phone, occupation, motivation, tier, agreement_version, payment_reference, signature_typed_name, signature_doc_hash, agreement_accepted_at")
      .eq("id", data.application_id)
      .maybeSingle();
    if (!app) throw new Error("Application not found");
    if (!app.signature_typed_name || !app.agreement_accepted_at) {
      throw new Error("This applicant hasn't signed the membership agreement yet");
    }

    const dateStr = new Date(app.agreement_accepted_at).toLocaleString("en-ZA", {
      dateStyle: "long",
      timeStyle: "short",
    });

    const blob = await buildMembershipAgreementPdf({
      fullName: app.full_name ?? "",
      idNumber: app.id_number ?? "",
      phone: app.phone ?? "",
      occupation: app.occupation ?? "",
      motivation: app.motivation ?? "",
      contribution: CONTRIBUTION_LABEL[app.tier ?? "active"] ?? "R500 monthly",
      agreementVersion: app.agreement_version ?? "v1.0-2026",
      reference: app.payment_reference ?? "—",
      typedSignature: app.signature_typed_name,
      docHash: app.signature_doc_hash ?? "",
      dateStr,
    });

    const ownerPrefix = app.user_id ?? "unlinked";
    const path = `${ownerPrefix}/stamped-${data.application_id}.pdf`;
    const buf = new Uint8Array(await blob.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from("onboarding-uploads")
      .upload(path, buf, { upsert: true, contentType: "application/pdf" });
    if (upErr) throw new Error(upErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("applications")
      .update({ stamped_document_path: path })
      .eq("id", data.application_id);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, path };
  });
