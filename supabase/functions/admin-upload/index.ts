// Defensive validator for admin uploads.
// Validates path safety, size, and mime type before forwarding to Storage.
// Callers must be authenticated admins (RLS on the documents bucket enforces this).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_MIME: Record<string, string[]> = {
  documents: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ],
};
const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25MB

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-max-bytes",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401, headers: cors });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identify caller and verify admin role.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response("Unauthorized", { status: 401, headers: cors });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: userRes.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }

    const form = await req.formData();
    const file = form.get("file");
    const bucket = String(form.get("bucket") ?? "documents");
    const rawPath = String(form.get("path") ?? "");

    // Path traversal guard.
    if (
      !rawPath ||
      rawPath.includes("..") ||
      rawPath.startsWith("/") ||
      rawPath.includes("\\") ||
      rawPath.includes("\x00") ||
      rawPath.length > 512
    ) {
      return new Response("Invalid path", { status: 400, headers: cors });
    }

    if (!(file instanceof File)) {
      return new Response("Missing file", { status: 400, headers: cors });
    }

    const maxBytes = Number(req.headers.get("x-max-bytes") ?? DEFAULT_MAX_BYTES);
    if (file.size > maxBytes) {
      return new Response(`File too large (max ${maxBytes} bytes)`, { status: 413, headers: cors });
    }

    const allowed = ALLOWED_MIME[bucket];
    if (allowed && !allowed.includes(file.type)) {
      return new Response(`Mime type ${file.type} not allowed for ${bucket}`, { status: 415, headers: cors });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.storage.from(bucket).upload(rawPath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, path: data.path }), {
      status: 200,
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
