import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "member-portfolios";
const SIGNED_TTL_SECONDS = 60 * 60; // 1 hour
const STATUS_KEY = "portfolio_mirror_status";

type MirrorSummary = {
  members: number;
  uploaded: number;
  skipped: number;
  failed: number;
  updated: number;
  dry_run: boolean;
  ran_at: string;
  planned_uploads?: Array<{ member_id: string; kind: string; remote_url: string; target_key: string }>;
  planned_updates?: Array<{ member_id: string; fields: string[] }>;
  failures?: Array<{ member_id: string; remote_url?: string; error: string }>;
};

type PurgeSummary = {
  scanned: number;
  referenced: number;
  orphaned: number;
  deleted: number;
  dry_run: boolean;
  ran_at: string;
  deleted_keys?: string[];
  orphan_keys?: string[];
};

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

    // Public endpoint (no auth — it renders images on public pages), so the
    // service-role signer must NOT sign arbitrary caller-supplied keys or it
    // becomes an IDOR over the whole private bucket. Only sign keys actually
    // referenced by published team_members rows.
    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("photo_url, profile_card_url, portfolio_images");
    const allowed = new Set<string>();
    for (const m of members ?? []) {
      if (m.photo_url) allowed.add(m.photo_url);
      if (m.profile_card_url) allowed.add(m.profile_card_url);
      for (const p of (m.portfolio_images as string[] | null) ?? []) if (p) allowed.add(p);
    }
    const safeKeys = toSign.filter((k) => allowed.has(k));
    if (safeKeys.length === 0) return { urls: passthrough };

    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrls(safeKeys, SIGNED_TTL_SECONDS);
    if (error) throw new Error(error.message);

    const out = { ...passthrough };
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
    }
    return { urls: out, expiresIn: SIGNED_TTL_SECONDS };
  });

/**
 * Admin-only. Reads the last persisted mirror + purge status from site_settings.
 */
export const getPortfolioMirrorStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", STATUS_KEY)
      .maybeSingle();
    return (data?.value as { mirror?: MirrorSummary; purge?: PurgeSummary } | null) ?? null;
  });

const saveStatus = async (patch: Record<string, unknown>) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", STATUS_KEY)
    .maybeSingle();
  const next = { ...((existing?.value as object | null) ?? {}), ...patch };
  await supabaseAdmin
    .from("site_settings")
    .upsert({ key: STATUS_KEY, value: next as never });
};

/**
 * Admin-only mirror. When dry_run=true, walks the same data and returns the
 * plan (planned_uploads, planned_updates) without downloading, uploading, or
 * mutating the database.
 */
export const mirrorPortfolioAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { dry_run?: boolean }) =>
    z.object({ dry_run: z.boolean().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<MirrorSummary> => {
    const dryRun = !!data.dry_run;
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

    const summary: MirrorSummary = {
      members: 0,
      uploaded: 0,
      skipped: 0,
      failed: 0,
      updated: 0,
      dry_run: dryRun,
      ran_at: new Date().toISOString(),
      planned_uploads: [],
      planned_updates: [],
      failures: [],
    };

    const extFromContentType = (ct: string | null): string => {
      if (!ct) return "jpg";
      if (ct.includes("png")) return "png";
      if (ct.includes("webp")) return "webp";
      if (ct.includes("gif")) return "gif";
      if (ct.includes("svg")) return "svg";
      return "jpg";
    };

    const plan = async (
      memberId: string,
      remoteUrl: string,
      kind: string,
      index: number,
    ): Promise<string | null> => {
      if (!remoteUrl) return null;
      if (!/^https?:\/\//i.test(remoteUrl)) {
        summary.skipped += 1;
        return remoteUrl;
      }
      if (dryRun) {
        const key = `${memberId}/${kind}-${index}.jpg`;
        summary.planned_uploads!.push({ member_id: memberId, kind, remote_url: remoteUrl, target_key: key });
        summary.uploaded += 1;
        return key;
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
        summary.failed += 1;
        summary.failures!.push({ member_id: memberId, remote_url: remoteUrl, error: (e as Error).message });
        return null;
      }
    };

    for (const m of members ?? []) {
      summary.members += 1;
      const newPhoto = m.photo_url ? await plan(m.id, m.photo_url, "photo", 0) : null;
      const newCard = m.profile_card_url ? await plan(m.id, m.profile_card_url, "card", 0) : null;
      const portfolio: string[] = [];
      const src = Array.isArray(m.portfolio_images) ? m.portfolio_images : [];
      for (let i = 0; i < src.length; i++) {
        const k = await plan(m.id, src[i], "portfolio", i);
        if (k) portfolio.push(k);
      }

      const patch: Record<string, unknown> = {};
      const changedFields: string[] = [];
      if (newPhoto && newPhoto !== m.photo_url) { patch.photo_url = newPhoto; changedFields.push("photo_url"); }
      if (newCard && newCard !== m.profile_card_url) { patch.profile_card_url = newCard; changedFields.push("profile_card_url"); }
      if (portfolio.length > 0) { patch.portfolio_images = portfolio; changedFields.push("portfolio_images"); }

      if (changedFields.length === 0) continue;

      if (dryRun) {
        summary.planned_updates!.push({ member_id: m.id, fields: changedFields });
        summary.updated += 1;
        continue;
      }

      const { error: updErr } = await supabaseAdmin
        .from("team_members")
        .update(patch as never)
        .eq("id", m.id);
      if (updErr) {
        summary.failed += 1;
        summary.failures!.push({ member_id: m.id, error: updErr.message });
      } else {
        summary.updated += 1;
      }
    }

    // Trim heavy plan arrays for real runs to keep the stored blob small
    if (!dryRun) {
      delete summary.planned_uploads;
      delete summary.planned_updates;
    }
    await saveStatus({ mirror: summary });
    return summary;
  });

/**
 * Admin-only. Lists every object in member-portfolios and deletes any object
 * whose key is not referenced by team_members.{photo_url,profile_card_url,
 * portfolio_images}. When dry_run=true, only reports which keys would be
 * removed.
 */
export const purgeOrphanPortfolioObjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { dry_run?: boolean }) =>
    z.object({ dry_run: z.boolean().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<PurgeSummary> => {
    const dryRun = !!data.dry_run;
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Build the reference set from team_members
    const { data: members, error: fetchErr } = await supabaseAdmin
      .from("team_members")
      .select("photo_url, profile_card_url, portfolio_images");
    if (fetchErr) throw new Error(fetchErr.message);

    const referenced = new Set<string>();
    for (const m of members ?? []) {
      const push = (v: unknown) => {
        if (typeof v === "string" && v && !/^https?:\/\//i.test(v)) referenced.add(v);
      };
      push(m.photo_url);
      push(m.profile_card_url);
      if (Array.isArray(m.portfolio_images)) m.portfolio_images.forEach(push);
    }

    // Recursively list all objects in the bucket (bucket is organised as memberId/filename.ext)
    const allKeys: string[] = [];
    const { data: rootEntries, error: rootErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .list("", { limit: 1000 });
    if (rootErr) throw new Error(rootErr.message);

    for (const entry of rootEntries ?? []) {
      // Folders don't have an id; files do. Descend into folders.
      if (!entry.id) {
        const { data: children, error: childErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .list(entry.name, { limit: 1000 });
        if (childErr) throw new Error(childErr.message);
        for (const c of children ?? []) {
          if (c.id) allKeys.push(`${entry.name}/${c.name}`);
        }
      } else {
        allKeys.push(entry.name);
      }
    }

    const orphans = allKeys.filter((k) => !referenced.has(k));

    const summary: PurgeSummary = {
      scanned: allKeys.length,
      referenced: referenced.size,
      orphaned: orphans.length,
      deleted: 0,
      dry_run: dryRun,
      ran_at: new Date().toISOString(),
      orphan_keys: orphans.slice(0, 200),
    };

    if (!dryRun && orphans.length > 0) {
      // Delete in chunks of 100
      for (let i = 0; i < orphans.length; i += 100) {
        const chunk = orphans.slice(i, i + 100);
        const { error: delErr } = await supabaseAdmin.storage.from(BUCKET).remove(chunk);
        if (delErr) throw new Error(delErr.message);
        summary.deleted += chunk.length;
      }
      summary.deleted_keys = orphans.slice(0, 200);
    }

    await saveStatus({ purge: summary });
    return summary;
  });
