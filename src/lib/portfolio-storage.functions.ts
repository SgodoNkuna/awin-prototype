import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "member-portfolios";
const SIGNED_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Public server fn. Takes an array of storage keys (paths inside the bucket)
 * and returns a { key: signedUrl } map. External URLs (http/https) are passed
 * through unchanged so mixed inputs are safe.
 */
export const signPortfolioUrls = createServerFn({ method: "POST" })
  .inputValidator((data: { keys: string[] }) =>
    z.object({ keys: z.array(z.string().min(1)).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const passthrough: Record<string, string> = {};
    const toSign: string[] = [];
    for (const k of data.keys) {
      if (/^https?:\/\//i.test(k)) passthrough[k] = k;
      else toSign.push(k);
    }
    if (toSign.length === 0) return { urls: passthrough };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(toSign, SIGNED_TTL_SECONDS);
    if (error) throw new Error(error.message);

    const out = { ...passthrough };
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
    }
    return { urls: out, expiresIn: SIGNED_TTL_SECONDS };
  });

/**
 * Admin-only mirror. Downloads every remote http(s) URL in
 * team_members.portfolio_images / photo_url / profile_card_url and uploads
 * to the private member-portfolios bucket, then rewrites those columns to
 * storage keys. Idempotent — already-mirrored keys are skipped.
 */
export const mirrorPortfolioAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members, error: fetchErr } = await supabaseAdmin
      .from("team_members")
      .select("id, photo_url, profile_card_url, portfolio_images");
    if (fetchErr) throw new Error(fetchErr.message);

    const summary = { members: 0, uploaded: 0, skipped: 0, failed: 0, updated: 0 };

    const extFromContentType = (ct: string | null): string => {
      if (!ct) return "jpg";
      if (ct.includes("png")) return "png";
      if (ct.includes("webp")) return "webp";
      if (ct.includes("gif")) return "gif";
      if (ct.includes("svg")) return "svg";
      return "jpg";
    };

    const mirrorOne = async (memberId: string, remoteUrl: string, kind: string, index: number): Promise<string | null> => {
      if (!remoteUrl) return null;
      if (!/^https?:\/\//i.test(remoteUrl)) {
        summary.skipped += 1;
        return remoteUrl; // already a storage key
      }
      try {
        const res = await fetch(remoteUrl);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const ct = res.headers.get("content-type");
        const ext = extFromContentType(ct);
        const key = `${memberId}/${kind}-${index}.${ext}`;
        const buf = new Uint8Array(await res.arrayBuffer());
        const { error: upErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(key, buf, { contentType: ct ?? undefined, upsert: true });
        if (upErr) throw upErr;
        summary.uploaded += 1;
        return key;
      } catch (e) {
        console.error("mirror failed", { memberId, remoteUrl, error: (e as Error).message });
        summary.failed += 1;
        return null;
      }
    };

    for (const m of members ?? []) {
      summary.members += 1;
      const newPhoto = m.photo_url ? await mirrorOne(m.id, m.photo_url, "photo", 0) : null;
      const newCard = m.profile_card_url
        ? await mirrorOne(m.id, m.profile_card_url, "card", 0)
        : null;
      const portfolio: string[] = [];
      const src = Array.isArray(m.portfolio_images) ? m.portfolio_images : [];
      for (let i = 0; i < src.length; i++) {
        const k = await mirrorOne(m.id, src[i], "portfolio", i);
        if (k) portfolio.push(k);
      }

      const patch: Record<string, unknown> = {};
      if (newPhoto && newPhoto !== m.photo_url) patch.photo_url = newPhoto;
      if (newCard && newCard !== m.profile_card_url) patch.profile_card_url = newCard;
      if (portfolio.length > 0) patch.portfolio_images = portfolio;

      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await supabaseAdmin
          .from("team_members")
          .update(patch)
          .eq("id", m.id);
        if (updErr) {
          summary.failed += 1;
          console.error("update failed", { memberId: m.id, error: updErr.message });
        } else {
          summary.updated += 1;
        }
      }
    }

    return summary;
  });
