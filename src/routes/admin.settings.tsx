import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
    const { error } = await supabase.from("site_settings").upsert({ key, value: settings[key] as never });
    if (error) return toast.error(error.message);
    toast.success("Saved");
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
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
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
            <CardHeader><CardTitle className="text-base">Stats</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Members">
                  <Input
                    value={(settings.stats?.members as string) ?? ""}
                    onChange={(e) => updateSetting("stats", { ...settings.stats, members: e.target.value })}
                  />
                </Field>
                <Field label="Events">
                  <Input
                    value={(settings.stats?.events as string) ?? ""}
                    onChange={(e) => updateSetting("stats", { ...settings.stats, events: e.target.value })}
                  />
                </Field>
                <Field label="Years">
                  <Input
                    value={(settings.stats?.years as string) ?? ""}
                    onChange={(e) => updateSetting("stats", { ...settings.stats, years: e.target.value })}
                  />
                </Field>
              </div>
              <Button onClick={() => saveSetting("stats")} size="sm"><Save className="size-4 mr-2" />Save</Button>
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
          <Button
            size="sm"
            onClick={() => setTeam([...(team ?? []), { name: "", title: "", bio: "", photo_url: "", order_index: team?.length ?? 0, published: true, category: "", expertise: [], location: "", contact_email: "", website: "", linkedin_url: "", social_url: "", portfolio_images: [], committee: null, committee_position: null, committee_order: 0 }])}
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
                <Field label="Photo URL">
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
                      };
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
