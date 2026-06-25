import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await sb.from("site_settings").select("*");
for (const r of data) {
  const txt = JSON.stringify(r.value);
  if (txt.includes("Women in Investment")) {
    const fixed = JSON.parse(txt.replaceAll("Women in Investment", "Women Investment"));
    await sb.from("site_settings").update({ value: fixed }).eq("key", r.key);
    console.log("updated", r.key);
  }
}
