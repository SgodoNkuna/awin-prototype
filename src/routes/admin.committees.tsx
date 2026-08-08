import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/committees")({
  component: CommitteesPage,
});

type M = {
  id: string;
  name: string;
  photo_url: string | null;
  profile_card_url: string | null;
  committee: string | null;
  committee_position: string | null;
  committee_order: number | null;
  website_committee_position: string | null;
  website_committee_order: number | null;
};

const COMMITTEES: Array<{ key: string; label: string }> = [
  { key: "main", label: "Main Committee" },
  { key: "property", label: "Property Investment Committee" },
  { key: "website", label: "Website Committee" },
];

// A member can sit on more than one committee — `committee` stores a
// comma-separated list of keys (e.g. "main,website"), not a single value.
// committee_order/committee_position only hold ONE rank per person, which
// breaks for anyone whose standing differs between committees (e.g. chairs
// Website but isn't senior on Main). Website Committee gets its own
// website_committee_order/_position columns for that reason; every other
// committee still shares the original pair — add another dedicated pair
// if a third committee ever actually needs it, don't build it speculatively.
const committeeKeys = (committee: string | null): string[] =>
  (committee ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const inCommittee = (committee: string | null, key: string) => committeeKeys(committee).includes(key);
const orderCol = (key: string) => (key === "website" ? "website_committee_order" : "committee_order") as const;
const positionCol = (key: string) => (key === "website" ? "website_committee_position" : "committee_position") as const;
const orderFor = (m: M, key: string) => (key === "website" ? m.website_committee_order ?? m.committee_order : m.committee_order) ?? 0;
const positionFor = (m: M, key: string) => (key === "website" ? m.website_committee_position ?? m.committee_position : m.committee_position) ?? "";

function CommitteesPage() {
  const [rows, setRows] = useState<M[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("team_members")
      .select("id, name, photo_url, profile_card_url, committee, committee_position, committee_order, website_committee_position, website_committee_order")
      .order("committee_order");
    setRows((data as M[]) ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const move = async (m: M, delta: number, committeeKey: string) => {
    if (!rows) return;
    const col = orderCol(committeeKey);
    const peers = rows
      .filter((x) => inCommittee(x.committee, committeeKey))
      .sort((a, b) => orderFor(a, committeeKey) - orderFor(b, committeeKey));
    const idx = peers.findIndex((x) => x.id === m.id);
    const swapIdx = idx + delta;
    if (swapIdx < 0 || swapIdx >= peers.length) return;
    const a = peers[idx];
    const b = peers[swapIdx];
    setSaving(m.id);
    await Promise.all([
      supabase.from("team_members").update({ [col]: orderFor(b, committeeKey) }).eq("id", a.id),
      supabase.from("team_members").update({ [col]: orderFor(a, committeeKey) }).eq("id", b.id),
    ]);
    setSaving(null);
    load();
  };

  const savePosition = async (m: M, committeeKey: string, value: string) => {
    setSaving(m.id);
    const { error } = await supabase
      .from("team_members")
      .update({ [positionCol(committeeKey)]: value })
      .eq("id", m.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Position saved");
  };

  const removeFromCommittee = async (m: M, committeeKey: string) => {
    const label = COMMITTEES.find((c) => c.key === committeeKey)?.label ?? committeeKey;
    if (!confirm(`Remove ${m.name} from ${label}? Their member record and any other committees stay.`)) return;
    const remaining = committeeKeys(m.committee).filter((k) => k !== committeeKey);
    const clearWebsiteCols = committeeKey === "website" ? { website_committee_position: null, website_committee_order: null } : {};
    const clearSharedCols = remaining.length === 0 ? { committee_position: null, committee_order: 0 } : {};
    const { error } = await supabase
      .from("team_members")
      .update({
        committee: remaining.length ? remaining.join(",") : null,
        ...clearWebsiteCols,
        ...clearSharedCols,
      })
      .eq("id", m.id);
    if (error) return toast.error(error.message);
    load();
  };

  if (!rows) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl">Committees</h1>
          <p className="text-sm text-muted-foreground">
            Manage the pinned committee sections shown on the public Members page.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/settings" search={{ tab: "team" }}>
            Add or edit member profiles <ExternalLink className="ml-2 size-3.5" />
          </Link>
        </Button>
      </div>

      {COMMITTEES.map((c) => {
        const list = rows
          .filter((r) => inCommittee(r.committee, c.key))
          .sort((a, b) => orderFor(a, c.key) - orderFor(b, c.key));
        return (
          <Card key={c.key}>
            <CardHeader>
              <CardTitle className="text-base">
                {c.label}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({list.length} member{list.length === 1 ? "" : "s"})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No members assigned. Set a member's committee in Settings → Team &amp; Members.
                </p>
              )}
              {list.map((m, idx) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="size-12 rounded-full bg-muted overflow-hidden flex items-center justify-center text-sm font-semibold">
                    {m.photo_url || m.profile_card_url ? (
                      <img
                        src={m.photo_url ?? m.profile_card_url ?? ""}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      m.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.name}</div>
                    <Input
                      defaultValue={positionFor(m, c.key)}
                      placeholder="Position title"
                      className="mt-1 h-8 text-xs"
                      onBlur={(e) => {
                        if (e.target.value !== positionFor(m, c.key)) {
                          savePosition(m, c.key, e.target.value);
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0 || saving === m.id}
                      onClick={() => move(m, -1, c.key)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === list.length - 1 || saving === m.id}
                      onClick={() => move(m, 1, c.key)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeFromCommittee(m, c.key)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
