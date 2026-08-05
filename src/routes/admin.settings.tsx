import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Loader2, Save, CloudUpload, Eye, Trash } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  mirrorPortfolioAssets,
  purgeOrphanPortfolioObjects,
  getPortfolioMirrorStatus,
  signPortfolioUrls,
} from "@/lib/portfolio-storage.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MEMBER_CATEGORIES } from "@/lib/member-categories";

export const Route = createFileRoute("/admin/settings")({
  validateSearch: z.object({
    tab: z.enum(["content", "team", "notifications", "danger"]).optional(),
  }),
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


function SettingsPage() {
  const search = Route.useSearch();
  const [activeTab, setActiveTab] = useState(search.tab ?? "content");
  const [settings, setSettings] = useState<Settings>({});
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogMember, setDialogMember] = useState<TeamMember | null>(null);
  // Display-only: storage-key image fields resolved to signed URLs, keyed by
  // the raw key. `team` itself always keeps the real stored value (a storage
  // key or a public URL) so editing/saving never writes a temporary signed
  // URL back into the database.
  const [imageDisplayMap, setImageDisplayMap] = useState<Record<string, string>>({});
  const sign = useServerFn(signPortfolioUrls);

  const load = async () => {
    const [s, m] = await Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("team_members").select("*").order("order_index"),
    ]);
    const obj: Settings = {};
    (s.data ?? []).forEach((r) => { obj[r.key] = r.value as Record<string, unknown>; });
    setSettings(obj);

    const rows = (m.data as TeamMember[]) ?? [];
    setTeam(rows);
    setLoading(false);

    // Some rows store a private-bucket storage key instead of a full URL
    // (after a real mirror run) — resolve those to signed URLs so previews
    // and thumbnails actually render, without touching the saved value.
    const keys = new Set<string>();
    for (const row of rows) {
      if (row.photo_url) keys.add(row.photo_url);
      if (row.profile_card_url) keys.add(row.profile_card_url);
    }
    if (keys.size === 0) return;
    try {
      const res = await sign({ data: { keys: [...keys] } });
      setImageDisplayMap(res.urls);
    } catch (e) {
      console.error("signPortfolioUrls failed", e);
    }
  };
  useEffect(() => { load(); }, []);

  const displayImage = (v: string | null) => (v && imageDisplayMap[v]) || v;

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
        <p className="text-sm text-muted-foreground">Edit site content and team.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="team">Team &amp; Members</TabsTrigger>
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
          <Card>
            <CardHeader><CardTitle className="text-base">EFT Banking Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Shown to applicants on onboarding and to members in the portal Billing tab.
                Members pay against these details with their AWIN reference.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  ["account_name", "Account name / beneficiary"],
                  ["bank", "Bank"],
                  ["branch", "Branch code"],
                  ["account_type", "Account type"],
                  ["account_number", "Account number"],
                ] as const).map(([k, label]) => (
                  <Field key={k} label={label}>
                    <Input
                      value={(settings.eft_banking?.[k] as string) ?? ""}
                      onChange={(e) => updateSetting("eft_banking", { ...settings.eft_banking, [k]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
              <Button onClick={() => saveSetting("eft_banking")} size="sm"><Save className="size-4 mr-2" />Publish</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Shown on the Contact page and used across the site.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {([
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["mobile", "Mobile (optional)"],
                  ["location", "Location"],
                  ["hours", "Office hours"],
                ] as const).map(([k, label]) => (
                  <Field key={k} label={label}>
                    <Input
                      value={(settings.contact_info?.[k] as string) ?? ""}
                      onChange={(e) => updateSetting("contact_info", { ...settings.contact_info, [k]: e.target.value })}
                    />
                  </Field>
                ))}
              </div>
              <Button onClick={() => saveSetting("contact_info")} size="sm"><Save className="size-4 mr-2" />Publish</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">FAQ (public FAQ &amp; Privacy page)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(((settings.faq?.items as { q: string; a: string }[]) ?? [])).map((item, i, arr) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <Field label={`Question ${i + 1}`}>
                    <Input
                      value={item.q}
                      onChange={(e) => updateSetting("faq", { items: arr.map((x, idx) => idx === i ? { ...x, q: e.target.value } : x) })}
                    />
                  </Field>
                  <Field label="Answer">
                    <Textarea
                      rows={3}
                      value={item.a}
                      onChange={(e) => updateSetting("faq", { items: arr.map((x, idx) => idx === i ? { ...x, a: e.target.value } : x) })}
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => updateSetting("faq", { items: arr.filter((_, idx) => idx !== i) })}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("faq", { items: [ ...(((settings.faq?.items as { q: string; a: string }[]) ?? [])), { q: "", a: "" } ] })}
                >
                  Add question
                </Button>
                <Button onClick={() => saveSetting("faq")} size="sm"><Save className="size-4 mr-2" />Publish</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">
            These are public profile cards shown on the "Our Members" page (photo, title, bio, category). They
            don't require a login — for real member accounts, see <a href="/admin/members" className="underline">Members</a>.
          </p>
          <MirrorStorageCard />

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-medium text-muted-foreground">
              {team?.length ?? 0} profile{team?.length === 1 ? "" : "s"}
            </p>
            <Button
              size="sm"
              onClick={() => setDialogMember({
                name: "", title: "", bio: "", photo_url: "", profile_card_url: "",
                order_index: team?.length ?? 0, published: true, category: "", expertise: [],
                location: "", contact_email: "", website: "", linkedin_url: "", social_url: "",
                portfolio_images: [], committee: null, committee_position: null, committee_order: 0,
              })}
            >
              <Plus className="size-4 mr-2" />Add Member
            </Button>
          </div>

          <div className="space-y-2">
            {team?.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-6 text-center">No member profiles yet — click Add Member to create one.</p>
            )}
            {team?.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="size-11 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold">
                  {m.profile_card_url || m.photo_url ? (
                    <img src={displayImage(m.profile_card_url) || displayImage(m.photo_url) || ""} alt="" className="size-full object-cover" />
                  ) : (
                    (m.name || "?").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{m.name || "(no name)"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.title || "—"}{m.category ? ` · ${m.category}` : ""}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDialogMember(m)}>Edit</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    if (!confirm(`Delete ${m.name || "this member"}? This cannot be undone.`)) return;
                    const { error } = await supabase.from("team_members").delete().eq("id", m.id!);
                    if (error) return toast.error(error.message);
                    toast.success("Deleted");
                    load();
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <TeamMemberDialog
            member={dialogMember}
            displayImage={displayImage}
            onClose={() => setDialogMember(null)}
            onSaved={() => { setDialogMember(null); load(); }}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {([
                ["new_application", "New membership application", "Email admin@awin.co.za when someone applies to join."],
                ["new_message", "New contact message", "Email info@awin.co.za when the contact form is submitted."],
                ["event_registration", "New event registration", "Email admin@awin.co.za when someone registers for an event."],
                ["new_loa_rpa", "New LOA & RPA submission", "Email admin@awin.co.za when someone submits a signed LOA & Risk Profile Analysis."],
              ] as const).map(([k, label, desc]) => (
                <div key={k} className="flex items-center justify-between gap-4">
                  <div>
                    <Label>{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={settings.notifications?.[k] !== false}
                    onCheckedChange={(v) => updateSetting("notifications", { ...settings.notifications, [k]: v })}
                  />
                </div>
              ))}
              <Button size="sm" onClick={() => saveSetting("notifications")}><Save className="size-4 mr-2" />Save</Button>
              <p className="text-xs text-muted-foreground">
                These control the committee alert emails sent via Zoho. Applicant/member-facing confirmation emails always send.
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

/** Add/edit dialog for a single public "Our Members" profile card. */
function TeamMemberDialog({
  member,
  displayImage,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  displayImage: (v: string | null) => string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<TeamMember | null>(member);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(member);
  }, [member]);

  if (!draft) return null;
  const isNew = !draft.id;

  const set = <K extends keyof TeamMember>(key: K, value: TeamMember[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = async () => {
    if (!draft.name.trim() || !draft.title.trim()) {
      toast.error("Name and title are required");
      return;
    }
    setSaving(true);
    try {
      const { sanitizeText, sanitizeOptionalText, sanitizeUrl } = await import("@/lib/sanitize");
      const cleanEmail = (draft.contact_email ?? "").trim().toLowerCase() || null;
      const payload = {
        name: sanitizeText(draft.name),
        title: sanitizeText(draft.title),
        bio: sanitizeOptionalText(draft.bio),
        photo_url: sanitizeUrl(draft.photo_url),
        profile_card_url: sanitizeUrl(draft.profile_card_url),
        order_index: draft.order_index,
        published: draft.published,
        category: sanitizeOptionalText(draft.category),
        expertise: draft.expertise && draft.expertise.length ? draft.expertise.map((s) => sanitizeText(s)).filter(Boolean) : null,
        location: sanitizeOptionalText(draft.location),
        contact_email: cleanEmail,
        website: sanitizeUrl(draft.website),
        linkedin_url: sanitizeUrl(draft.linkedin_url),
        social_url: sanitizeUrl(draft.social_url),
        portfolio_images: draft.portfolio_images && draft.portfolio_images.length ? draft.portfolio_images.map((s) => sanitizeUrl(s)).filter((u): u is string => !!u) : [],
        committee: draft.committee ? sanitizeText(draft.committee) : null,
        committee_position: sanitizeOptionalText(draft.committee_position),
        committee_order: draft.committee_order ?? 0,
      } as any;
      const { error } = draft.id
        ? await supabase.from("team_members").update(payload).eq("id", draft.id)
        : await supabase.from("team_members").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Saved");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Member" : `Edit ${draft.name || "Member"}`}</DialogTitle>
          <DialogDescription>Public profile card shown on the "Our Members" page. No login required.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *">
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Nokuthula Dlamini" />
            </Field>
            <Field label="Title *">
              <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Financial Advisor" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Profile Card Image (main image)">
              <div className="flex gap-2">
                <Input value={draft.profile_card_url ?? ""} placeholder="https://… or click Upload →" onChange={(e) => set("profile_card_url", e.target.value)} />
                <UploadImageButton onUploaded={(url) => set("profile_card_url", url)} />
              </div>
              {draft.profile_card_url ? <img src={displayImage(draft.profile_card_url) ?? undefined} alt="" className="mt-2 h-20 w-16 rounded object-cover border" /> : null}
            </Field>
            <Field label="Headshot (fallback)">
              <div className="flex gap-2">
                <Input value={draft.photo_url ?? ""} placeholder="https://… or click Upload →" onChange={(e) => set("photo_url", e.target.value)} />
                <UploadImageButton onUploaded={(url) => set("photo_url", url)} />
              </div>
              {draft.photo_url ? <img src={displayImage(draft.photo_url) ?? undefined} alt="" className="mt-2 h-20 w-16 rounded object-cover border" /> : null}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input
                list="member-category-options"
                value={draft.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
                placeholder="Choose or type a new category"
              />
              <datalist id="member-category-options">
                {MEMBER_CATEGORIES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Location">
              <Input value={draft.location ?? ""} placeholder="Johannesburg, ZA" onChange={(e) => set("location", e.target.value)} />
            </Field>
          </div>

          <Field label="Expertise (comma-separated)">
            <Input
              value={(draft.expertise ?? []).join(", ")}
              onChange={(e) => set("expertise", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact email">
              <Input value={draft.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} />
            </Field>
            <Field label="Website">
              <Input value={draft.website ?? ""} onChange={(e) => set("website", e.target.value)} />
            </Field>
          </div>

          <Field label="Bio">
            <Textarea rows={3} value={draft.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="LinkedIn URL">
              <Input value={draft.linkedin_url ?? ""} placeholder="https://linkedin.com/in/…" onChange={(e) => set("linkedin_url", e.target.value)} />
            </Field>
            <Field label="Other social URL">
              <Input value={draft.social_url ?? ""} placeholder="https://instagram.com/…" onChange={(e) => set("social_url", e.target.value)} />
            </Field>
          </div>

          <Field label="Portfolio image URLs (comma-separated)">
            <Textarea
              rows={2}
              value={(draft.portfolio_images ?? []).join(", ")}
              placeholder="https://…/a.jpg, https://…/b.jpg"
              onChange={(e) => set("portfolio_images", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            />
          </Field>

          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-accent">Committee placement</Label>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Committee">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.committee ?? ""}
                  onChange={(e) => set("committee", e.target.value || null)}
                >
                  <option value="">None (general member)</option>
                  <option value="main">Main Committee</option>
                  <option value="property">Property Investment Committee</option>
                  <option value="website">Website Committee</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Position">
                <Input value={draft.committee_position ?? ""} placeholder="Chairman, Secretary…" onChange={(e) => set("committee_position", e.target.value)} />
              </Field>
              <Field label="Order">
                <Input type="number" value={draft.committee_order ?? 0} onChange={(e) => set("committee_order", Number(e.target.value))} />
              </Field>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Uploads an image to the public `gallery` bucket and returns its public URL. */
function UploadImageButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs cursor-pointer hover:bg-muted ${busy ? "opacity-60 pointer-events-none" : ""}`}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CloudUpload className="size-3.5" />}
      {busy ? "Uploading…" : "Upload"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 8 * 1024 * 1024) {
            toast.error("Image must be under 8 MB");
            e.target.value = "";
            return;
          }
          setBusy(true);
          try {
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const path = `members/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error } = await supabase.storage
              .from("gallery")
              .upload(path, file, { contentType: file.type, upsert: true });
            if (error) throw error;
            const { data } = supabase.storage.from("gallery").getPublicUrl(path);
            onUploaded(data.publicUrl);
            toast.success("Image uploaded");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
    </label>
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
  const [expanded, setExpanded] = useState(false);

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
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CloudUpload className="size-4" /> Portfolio storage sync
          {mirrorStatus?.failed > 0 && <span className="text-xs font-normal text-destructive">({mirrorStatus.failed} failed)</span>}
        </span>
        <span className="text-xs text-muted-foreground">{expanded ? "Hide" : "Show"}</span>
      </button>
      {expanded && (
      <CardContent className="space-y-4 pt-0">
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
            <div className="font-semibold">Dry-run plan: nothing was changed</div>
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
            <div className="font-semibold">Purge preview: nothing was deleted</div>
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
                <li key={i} className="truncate"><code>{f.member_id}</code>: {f.error}{f.remote_url ? ` · ${f.remote_url}` : ""}</li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>
      )}
    </Card>
  );
}
