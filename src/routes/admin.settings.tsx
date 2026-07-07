import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Loader2, Save, CloudUpload, Eye, Trash } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  mirrorPortfolioAssets,
  purgeOrphanPortfolioObjects,
  getPortfolioMirrorStatus,
} from "@/lib/portfolio-storage.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

type Settings = Record<string, Record<string, unknown>>;

type TeamMember = {
  id?: string;
  name: string;
  title: string;
  bio: string | null;
  photo_url: string | null;
  profile_card_url: string | null;
  order_index: number;
  published: boolean;
  category: string | null;
  expertise: string[] | null;
  location: string | null;
  contact_email: string | null;
  website: string | null;
  linkedin_url: string | null;
  social_url: string | null;
  portfolio_images: string[] | null;
  committee: string | null;
  committee_position: string | null;
  committee_order: number | null;
};


type Tier = {
  id: string;
  tier: string;
  name: string;
  price_zar: number;
  benefits: string[];
  featured: boolean;
  active: boolean;
};

function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [s, t, m] = await Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("membership_tiers").select("*").order("price_zar"),
      supabase.from("team_members").select("*").order("order_index"),
    ]);
    const obj: Settings = {};
    (s.data ?? []).forEach((r) => { obj[r.key] = r.value as Record<string, unknown>; });
    setSettings(obj);
    setTiers((t.data as Tier[]) ?? []);
    setTeam((m.data as TeamMember[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateSetting = (key: string, value: Record<string, unknown>) =>
    setSettings({ ...settings, [key]: value });

  const saveSetting = async (key: string) => {
    // Show the admin what is currently public before confirming the change.
    const { data: current } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
    const currentText = current?.value ? JSON.stringify(current.value, null, 2) : "(nothing published yet)";
    const nextText = JSON.stringify(settings[key] ?? {}, null, 2);
    if (!confirm(`Publish changes to "${key}"?\n\nCurrently public:\n${currentText}\n\nNew:\n${nextText}`)) return;
    const { error } = await supabase.from("site_settings").upsert({ key, value: settings[key] as never });
    if (error) return toast.error(error.message);
    toast.success("Published");
  };

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Edit site content, membership tiers and team.</p>
      </div>

      <Tabs defaultValue="content">
        <TabsList className="flex-wrap">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="danger" className="text-destructive">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Hero</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Title">
                <Input
                  value={(settings.hero?.title as string) ?? ""}
                  onChange={(e) => updateSetting("hero", { ...settings.hero, title: e.target.value })}
                />
              </Field>
              <Field label="Subtitle">
                <Input
                  value={(settings.hero?.subtitle as string) ?? ""}
                  onChange={(e) => updateSetting("hero", { ...settings.hero, subtitle: e.target.value })}
                />
              </Field>
              <Field label="CTA Label">
                <Input
                  value={(settings.hero?.cta as string) ?? ""}
                  onChange={(e) => updateSetting("hero", { ...settings.hero, cta: e.target.value })}
                />
              </Field>
              <Button onClick={() => saveSetting("hero")} size="sm"><Save className="size-4 mr-2" />Save</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Mission Statement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={3}
                value={(settings.mission?.statement as string) ?? ""}
                onChange={(e) => updateSetting("mission", { statement: e.target.value })}
              />
              <Button onClick={() => saveSetting("mission")} size="sm"><Save className="size-4 mr-2" />Save</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Homepage Stats</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Shown as four cards on the homepage. Saving asks you to confirm against the values currently published.</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="Members">
                  <Input
                    value={(settings.stats?.members as string) ?? ""}
                    onChange={(e) => updateSetting("stats", { ...settings.stats, members: e.target.value })}
                  />
                </Field>
                <Field label="Total Invested">
                  <Input
                    value={(settings.stats?.invested as string) ?? ""}
                    onChange={(e) => updateSetting("stats", { ...settings.stats, invested: e.target.value })}
                  />
                </Field>
                <Field label="Years Active">
                  <Input
                    value={(settings.stats?.years as string) ?? ""}
                    onChange={(e) => updateSetting("stats", { ...settings.stats, years: e.target.value })}
                  />
                </Field>
                <Field label="Women Supported">
                  <Input
                    value={(settings.stats?.supported as string) ?? ""}
                    onChange={(e) => updateSetting("stats", { ...settings.stats, supported: e.target.value })}
                  />
                </Field>
              </div>
              <Button onClick={() => saveSetting("stats")} size="sm"><Save className="size-4 mr-2" />Publish</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-3 mt-4">
          {tiers?.map((t, i) => (
            <Card key={t.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg capitalize">{t.tier}</h3>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={t.featured}
                      onCheckedChange={(v) => setTiers(tiers.map((x, idx) => idx === i ? { ...x, featured: v } : x))}
                    />
                    <Label className="text-xs">Featured</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Display name">
                    <Input value={t.name} onChange={(e) => setTiers(tiers.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                  </Field>
                  <Field label="Price (ZAR/year)">
                    <Input type="number" value={t.price_zar} onChange={(e) => setTiers(tiers.map((x, idx) => idx === i ? { ...x, price_zar: Number(e.target.value) } : x))} />
                  </Field>
                </div>
                <Field label="Benefits (one per line)">
                  <Textarea
                    rows={4}
                    value={t.benefits.join("\n")}
                    onChange={(e) => setTiers(tiers.map((x, idx) => idx === i ? { ...x, benefits: e.target.value.split("\n").filter(Boolean) } : x))}
                  />
                </Field>
                <Button
                  size="sm"
                  onClick={async () => {
                    const { error } = await supabase.from("membership_tiers").update({
                      name: t.name, price_zar: t.price_zar, benefits: t.benefits, featured: t.featured,
                    }).eq("id", t.id);
                    if (error) return toast.error(error.message);
                    toast.success("Saved");
                  }}
                >
                  <Save className="size-4 mr-2" />Save Tier
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="team" className="space-y-3 mt-4">
          <MirrorStorageCard />
          <Button
            size="sm"
            onClick={() => setTeam([...(team ?? []), { name: "", title: "", bio: "", photo_url: "", profile_card_url: "", order_index: team?.length ?? 0, published: true, category: "", expertise: [], location: "", contact_email: "", website: "", linkedin_url: "", social_url: "", portfolio_images: [], committee: null, committee_position: null, committee_order: 0 }])}
          >
            <Plus className="size-4 mr-2" />Add Member
          </Button>
          {team?.map((m, i) => (
            <Card key={m.id ?? `new-${i}`}>
              <CardContent className="pt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">
                    <Input value={m.name} onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} />
                  </Field>
                  <Field label="Title">
                    <Input value={m.title} onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                  </Field>
                </div>
                <Field label="Profile Card Image URL (full designed graphic — shown as the main image)">
                  <Input value={m.profile_card_url ?? ""} placeholder="https://..." onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, profile_card_url: e.target.value } : x))} />
                </Field>
                <Field label="Headshot URL (optional fallback)">
                  <Input value={m.photo_url ?? ""} onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, photo_url: e.target.value } : x))} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <Input value={m.category ?? ""} placeholder="Finance & Accounting" onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, category: e.target.value } : x))} />
                  </Field>
                  <Field label="Location">
                    <Input value={m.location ?? ""} placeholder="Johannesburg, ZA" onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, location: e.target.value } : x))} />
                  </Field>
                </div>
                <Field label="Expertise (comma-separated)">
                  <Input value={(m.expertise ?? []).join(", ")} onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, expertise: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x))} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Contact email">
                    <Input value={m.contact_email ?? ""} onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, contact_email: e.target.value } : x))} />
                  </Field>
                  <Field label="Website">
                    <Input value={m.website ?? ""} onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, website: e.target.value } : x))} />
                  </Field>
                </div>
                <Field label="Bio">
                  <Textarea rows={2} value={m.bio ?? ""} onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, bio: e.target.value } : x))} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="LinkedIn URL">
                    <Input value={m.linkedin_url ?? ""} placeholder="https://linkedin.com/in/…" onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, linkedin_url: e.target.value } : x))} />
                  </Field>
                  <Field label="Other social URL">
                    <Input value={m.social_url ?? ""} placeholder="https://instagram.com/…" onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, social_url: e.target.value } : x))} />
                  </Field>
                </div>
                <Field label="Portfolio image URLs (comma-separated)">
                  <Textarea
                    rows={2}
                    value={(m.portfolio_images ?? []).join(", ")}
                    placeholder="https://…/a.jpg, https://…/b.jpg"
                    onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, portfolio_images: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x))}
                  />
                </Field>
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-accent">Committee placement</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Committee">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={m.committee ?? ""}
                        onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, committee: e.target.value || null } : x))}
                      >
                        <option value="">None (general member)</option>
                        <option value="main">Main Committee</option>
                        <option value="property">Property Investment Committee</option>
                        <option value="website">Website Committee</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Position">
                      <Input value={m.committee_position ?? ""} placeholder="Chairman, Secretary…" onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, committee_position: e.target.value } : x))} />
                    </Field>
                    <Field label="Order">
                      <Input type="number" value={m.committee_order ?? 0} onChange={(e) => setTeam(team.map((x, idx) => idx === i ? { ...x, committee_order: Number(e.target.value) } : x))} />
                    </Field>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const { sanitizeText, sanitizeOptionalText, sanitizeUrl } = await import("@/lib/sanitize");
                      const cleanEmail = (m.contact_email ?? "").trim().toLowerCase() || null;
                      const payload = {
                        name: sanitizeText(m.name),
                        title: sanitizeText(m.title),
                        bio: sanitizeOptionalText(m.bio),
                        photo_url: sanitizeUrl(m.photo_url),
                        profile_card_url: sanitizeUrl(m.profile_card_url),
                        order_index: m.order_index,
                        published: m.published,
                        category: sanitizeOptionalText(m.category),
                        expertise: m.expertise && m.expertise.length ? m.expertise.map((s) => sanitizeText(s)).filter(Boolean) : null,
                        location: sanitizeOptionalText(m.location),
                        contact_email: cleanEmail,
                        website: sanitizeUrl(m.website),
                        linkedin_url: sanitizeUrl(m.linkedin_url),
                        social_url: sanitizeUrl(m.social_url),
                        portfolio_images: m.portfolio_images && m.portfolio_images.length ? m.portfolio_images.map((s) => sanitizeUrl(s)).filter((u): u is string => !!u) : [],
                        committee: m.committee ? sanitizeText(m.committee) : null,
                        committee_position: sanitizeOptionalText(m.committee_position),
                        committee_order: m.committee_order ?? 0,
                      } as any;
                      const { error } = m.id
                        ? await supabase.from("team_members").update(payload).eq("id", m.id)
                        : await supabase.from("team_members").insert(payload);
                      if (error) return toast.error(error.message);
                      toast.success("Saved");
                      load();
                    }}
                  >
                    <Save className="size-4 mr-2" />Save
                  </Button>


                  {m.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Delete this team member?")) return;
                        await supabase.from("team_members").delete().eq("id", m.id!);
                        load();
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {(["new_application", "new_message", "event_registration"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
                  <Switch
                    checked={!!settings.notifications?.[k]}
                    onCheckedChange={(v) => updateSetting("notifications", { ...settings.notifications, [k]: v })}
                  />
                </div>
              ))}
              <Button size="sm" onClick={() => saveSetting("notifications")}><Save className="size-4 mr-2" />Save</Button>
              <p className="text-xs text-muted-foreground">
                Email delivery requires connecting an email domain (skipped for now). These preferences are stored for later use.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-4 mt-4">
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DangerAction
                title="Clear all contact messages"
                description="Permanently delete every message submitted through the contact form."
                confirmText="DELETE MESSAGES"
                onConfirm={async () => {
                  const { error } = await supabase.from("contact_messages").delete().gte("created_at", "1970-01-01");
                  if (error) throw error;
                }}
              />
              <DangerAction
                title="Reset all site settings to defaults"
                description="Removes every key in site_settings. Public copy will fall back to hard-coded defaults until you republish."
                confirmText="RESET SETTINGS"
                onConfirm={async () => {
                  const { error } = await supabase.from("site_settings").delete().gte("key", "");
                  if (error) throw error;
                  await load();
                }}
              />
              <DangerAction
                title="Delete all draft (unpublished) team profiles"
                description="Removes team_members rows where published = false. Live members are untouched."
                confirmText="DELETE DRAFTS"
                onConfirm={async () => {
                  const { error } = await supabase.from("team_members").delete().eq("published", false);
                  if (error) throw error;
                  await load();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function DangerAction({
  title, description, confirmText, onConfirm,
}: { title: string; description: string; confirmText: string; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button
        variant="destructive"
        size="sm"
        disabled={busy}
        onClick={async () => {
          const entered = window.prompt(`Type ${confirmText} to confirm. This cannot be undone.`);
          if (entered !== confirmText) return;
          setBusy(true);
          try { await onConfirm(); toast.success("Done"); }
          catch (e: any) { toast.error(e.message ?? "Failed"); }
          finally { setBusy(false); }
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Run"}
      </Button>
    </div>
  );
}

function MirrorStorageCard() {
  const mirror = useServerFn(mirrorPortfolioAssets);
  const purge = useServerFn(purgeOrphanPortfolioObjects);
  const loadStatus = useServerFn(getPortfolioMirrorStatus);
  const [busy, setBusy] = useState<null | "mirror" | "dry" | "purge" | "purge-dry">(null);
  const [status, setStatus] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);

  const refresh = async () => {
    try { setStatus(await loadStatus()); } catch { /* ignore */ }
  };
  useEffect(() => { refresh(); }, []);

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");

  const run = async (mode: "mirror" | "dry" | "purge" | "purge-dry") => {
    setBusy(mode);
    setPreview(null);
    try {
      let r: any;
      if (mode === "mirror") r = await mirror({ data: { dry_run: false } });
      else if (mode === "dry") r = await mirror({ data: { dry_run: true } });
      else if (mode === "purge") {
        if (!confirm("Delete every storage object in member-portfolios that is not referenced by team_members? This cannot be undone.")) { setBusy(null); return; }
        r = await purge({ data: { dry_run: false } });
      } else r = await purge({ data: { dry_run: true } });

      if (mode === "dry" || mode === "purge-dry") setPreview({ mode, ...r });
      else toast.success(mode === "mirror" ? `Mirror complete: ${r.uploaded} uploaded, ${r.updated} updated` : `Purge complete: ${r.deleted} deleted`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const mirrorStatus = status?.mirror;
  const purgeStatus = status?.purge;

  return (
    <Card className="border-accent/40 bg-accent/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CloudUpload className="size-4" /> Portfolio storage sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Mirrors every remote member photo, card and portfolio image into the private <code>member-portfolios</code> bucket and rewrites the database to use storage keys. The site then renders via signed URLs so Vercel and Supabase stay in sync.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border bg-background p-3 text-xs">
            <div className="font-semibold mb-1">Last mirror run</div>
            {mirrorStatus ? (
              <>
                <div>Ran: {fmt(mirrorStatus.ran_at)} {mirrorStatus.dry_run && <span className="text-muted-foreground">(dry run)</span>}</div>
                <div>Members scanned: <strong>{mirrorStatus.members}</strong></div>
                <div>Objects uploaded: <strong>{mirrorStatus.uploaded}</strong></div>
                <div>Members updated: <strong>{mirrorStatus.updated}</strong></div>
                <div>Skipped (already storage keys): <strong>{mirrorStatus.skipped}</strong></div>
                <div className={mirrorStatus.failed > 0 ? "text-destructive" : ""}>Failures: <strong>{mirrorStatus.failed}</strong></div>
              </>
            ) : <div className="text-muted-foreground">Never run.</div>}
          </div>
          <div className="rounded-md border bg-background p-3 text-xs">
            <div className="font-semibold mb-1">Last purge run</div>
            {purgeStatus ? (
              <>
                <div>Ran: {fmt(purgeStatus.ran_at)} {purgeStatus.dry_run && <span className="text-muted-foreground">(dry run)</span>}</div>
                <div>Objects scanned: <strong>{purgeStatus.scanned}</strong></div>
                <div>Referenced by members: <strong>{purgeStatus.referenced}</strong></div>
                <div>Orphaned: <strong>{purgeStatus.orphaned}</strong></div>
                <div>Deleted: <strong>{purgeStatus.deleted}</strong></div>
              </>
            ) : <div className="text-muted-foreground">Never run.</div>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("dry")}>
            {busy === "dry" ? <Loader2 className="size-4 animate-spin mr-2" /> : <Eye className="size-4 mr-2" />}
            Preview mirror (dry run)
          </Button>
          <Button size="sm" disabled={!!busy} onClick={() => run("mirror")}>
            {busy === "mirror" ? <Loader2 className="size-4 animate-spin mr-2" /> : <CloudUpload className="size-4 mr-2" />}
            Run mirror now
          </Button>
          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("purge-dry")}>
            {busy === "purge-dry" ? <Loader2 className="size-4 animate-spin mr-2" /> : <Eye className="size-4 mr-2" />}
            Preview purge
          </Button>
          <Button size="sm" variant="destructive" disabled={!!busy} onClick={() => run("purge")}>
            {busy === "purge" ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash className="size-4 mr-2" />}
            Purge orphaned objects
          </Button>
        </div>

        {preview && preview.mode === "dry" && (
          <div className="rounded-md border bg-background p-3 text-xs space-y-2 max-h-72 overflow-auto">
            <div className="font-semibold">Dry-run plan — nothing was changed</div>
            <div>Would upload <strong>{preview.uploaded}</strong> objects, update <strong>{preview.updated}</strong> members, {preview.failed} would fail.</div>
            {preview.planned_uploads?.length > 0 && (
              <details>
                <summary className="cursor-pointer">{preview.planned_uploads.length} planned uploads</summary>
                <ul className="mt-1 space-y-0.5">
                  {preview.planned_uploads.slice(0, 50).map((p: any, i: number) => (
                    <li key={i} className="truncate"><code>{p.target_key}</code> ← {p.remote_url}</li>
                  ))}
                  {preview.planned_uploads.length > 50 && <li className="text-muted-foreground">…and {preview.planned_uploads.length - 50} more</li>}
                </ul>
              </details>
            )}
            {preview.planned_updates?.length > 0 && (
              <details>
                <summary className="cursor-pointer">{preview.planned_updates.length} member row updates</summary>
                <ul className="mt-1 space-y-0.5">
                  {preview.planned_updates.slice(0, 50).map((p: any, i: number) => (
                    <li key={i}><code>{p.member_id}</code>: {p.fields.join(", ")}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {preview && preview.mode === "purge-dry" && (
          <div className="rounded-md border bg-background p-3 text-xs space-y-2 max-h-72 overflow-auto">
            <div className="font-semibold">Purge preview — nothing was deleted</div>
            <div>{preview.orphaned} of {preview.scanned} objects are not referenced.</div>
            {preview.orphan_keys?.length > 0 && (
              <details open>
                <summary className="cursor-pointer">Orphaned keys</summary>
                <ul className="mt-1 space-y-0.5">
                  {preview.orphan_keys.slice(0, 100).map((k: string) => (
                    <li key={k} className="truncate"><code>{k}</code></li>
                  ))}
                  {preview.orphan_keys.length > 100 && <li className="text-muted-foreground">…and more</li>}
                </ul>
              </details>
            )}
          </div>
        )}

        {mirrorStatus?.failures?.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-destructive">{mirrorStatus.failures.length} failures from last mirror</summary>
            <ul className="mt-1 space-y-0.5 max-h-40 overflow-auto">
              {mirrorStatus.failures.slice(0, 50).map((f: any, i: number) => (
                <li key={i} className="truncate"><code>{f.member_id}</code>: {f.error}{f.remote_url ? ` — ${f.remote_url}` : ""}</li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
