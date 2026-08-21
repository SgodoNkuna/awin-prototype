import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureAdmin } from "@/lib/admin-roles.functions";

// Supabase free-tier storage cap — not exposed anywhere in the API, this is
// the published limit for this project's plan. Update if the plan changes.
export const FREE_TIER_STORAGE_BYTES = 1024 * 1024 * 1024;

type ObjectRow = { bucket_id: string; name: string; size: number; created_at: string };

async function fetchAllObjects(supabaseAdmin: any): Promise<ObjectRow[]> {
  // storage.objects isn't exposed via PostgREST directly — go through the
  // admin_list_storage_objects() SECURITY DEFINER function instead.
  const { data, error } = await supabaseAdmin.rpc("admin_list_storage_objects" as any);
  if (error) throw new Error(error.message);
  return (data as any[]).map((r) => ({
    bucket_id: r.bucket_id,
    name: r.name,
    size: Number(r.size ?? 0),
    created_at: r.created_at,
  }));
}

export const getStorageOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const objects = await fetchAllObjects(supabaseAdmin);

    const byBucket = new Map<string, { file_count: number; total_bytes: number }>();
    for (const o of objects) {
      const cur = byBucket.get(o.bucket_id) ?? { file_count: 0, total_bytes: 0 };
      cur.file_count += 1;
      cur.total_bytes += o.size;
      byBucket.set(o.bucket_id, cur);
    }
    const buckets = Array.from(byBucket.entries())
      .map(([bucket_id, v]) => ({ bucket_id, ...v }))
      .sort((a, b) => b.total_bytes - a.total_bytes);

    const largestFiles = [...objects]
      .sort((a, b) => b.size - a.size)
      .slice(0, 25)
      .map((o) => ({ bucket_id: o.bucket_id, name: o.name, bytes: o.size, created_at: o.created_at }));

    const totalBytes = objects.reduce((sum, o) => sum + o.size, 0);

    // Cleanup suggestions: files in the `gallery` bucket not referenced by
    // anything we know about. Best-effort, not a guarantee — anything
    // referenced only from outside these tables would show up here too, so
    // this is a suggestion list to review, never an auto-delete.
    const [{ data: galleryRows }, { data: teamRows }] = await Promise.all([
      supabaseAdmin.from("event_gallery").select("storage_path"),
      supabaseAdmin.from("team_members").select("photo_url, profile_card_url, video_url"),
    ]);
    const referenced = new Set<string>();
    for (const r of galleryRows ?? []) {
      if (r.storage_path) referenced.add(String(r.storage_path).replace(/^assets\//, ""));
    }
    for (const r of teamRows ?? []) {
      for (const v of [r.photo_url, r.profile_card_url, r.video_url]) {
        if (v && typeof v === "string" && v.includes("/storage/v1/object/public/gallery/")) {
          referenced.add(v.split("/storage/v1/object/public/gallery/")[1]);
        } else if (v && typeof v === "string" && !v.startsWith("http")) {
          referenced.add(v); // private-bucket storage key form
        }
      }
    }
    referenced.add("assets/from-debt-to-riches-cover.webp");

    const unreferencedGallery = objects
      .filter((o) => o.bucket_id === "gallery" && !referenced.has(o.name))
      .sort((a, b) => b.size - a.size)
      .map((o) => ({ name: o.name, bytes: o.size, created_at: o.created_at }));

    return { buckets, largestFiles, totalBytes, unreferencedGallery };
  });

const deleteSchema = z.object({
  bucket: z.enum(["gallery", "member-portfolios", "onboarding-uploads", "loa-rpa-documents", "event-gallery", "documents"]),
  path: z.string().trim().min(1),
});

/** Direct delete, no two-person approval — same risk tier as the existing
 * per-photo delete in Admin > Photo Gallery, not FAIS-regulated data. */
export const deleteStorageFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => deleteSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(data.bucket).remove([data.path]);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      actor_email: context.claims?.email ?? null,
      action: "storage_file_delete",
      target_type: "storage_object",
      target_id: `${data.bucket}/${data.path}`,
      reason: "Manual cleanup via Admin > Storage",
      details: { bucket: data.bucket, path: data.path },
    });
    return { ok: true };
  });
