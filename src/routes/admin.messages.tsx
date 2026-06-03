import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, MailOpen, Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/messages")({
  component: MessagesPage,
});

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
};

function MessagesPage() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [tab, setTab] = useState<"inbox" | "unread" | "archived">("inbox");

  const load = async () => {
    const { data } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
    setMessages((data as Message[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = (messages ?? []).filter((m) => {
    if (tab === "archived") return m.is_archived;
    if (tab === "unread") return !m.is_archived && !m.is_read;
    return !m.is_archived;
  });

  const update = async (id: string, patch: Partial<Message>) => {
    const { error } = await supabase.from("contact_messages").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Messages</h1>
        <p className="text-sm text-muted-foreground">Contact form submissions</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({messages?.filter((m) => !m.is_read && !m.is_archived).length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {messages === null ? (
        <div className="py-8 flex justify-center"><Loader2 className="size-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No messages.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card key={m.id} className={!m.is_read && !m.is_archived ? "border-accent/40" : ""}>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{m.subject}</h3>
                      {!m.is_read && !m.is_archived && <Badge className="bg-accent text-accent-foreground">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{m.name} · {m.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm bg-muted/40 rounded p-3 whitespace-pre-wrap">{m.message}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}>Reply</a>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => update(m.id, { is_read: !m.is_read })}>
                    {m.is_read ? <Mail className="size-4 mr-1" /> : <MailOpen className="size-4 mr-1" />}
                    Mark {m.is_read ? "unread" : "read"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => update(m.id, { is_archived: !m.is_archived })}>
                    {m.is_archived ? <ArchiveRestore className="size-4 mr-1" /> : <Archive className="size-4 mr-1" />}
                    {m.is_archived ? "Unarchive" : "Archive"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del(m.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
