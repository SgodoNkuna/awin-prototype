import { useEffect, useState } from "react";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { supabase as sb } from "@/integrations/supabase/client";
const supabase = sb as any;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Signed = {
  membershipCertUrl: string | null;
  loaRpaUrl: string | null;
};

/**
 * A member's own generated documents — the stamped membership certificate
 * (once the committee verifies payment) and their signed LOA & Risk Profile
 * PDF, if submitted. Both are private storage objects, so links are
 * short-lived signed URLs fetched on demand rather than stored/rendered.
 */
export function SignedDocumentsCard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Signed>({ membershipCertUrl: null, loaRpaUrl: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: app } = await supabase
        .from("applications")
        .select("id, stamped_document_path")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let membershipCertUrl: string | null = null;
      if (app?.stamped_document_path) {
        const { data: signed } = await supabase.storage
          .from("onboarding-uploads")
          .createSignedUrl(app.stamped_document_path, 60 * 10);
        membershipCertUrl = signed?.signedUrl ?? null;
      }

      let loaRpaUrl: string | null = null;
      const { data: loaRow } = await supabase
        .from("loa_rpa_submissions")
        .select("pdf_path")
        .eq("application_id", app?.id ?? "")
        .limit(1)
        .maybeSingle();
      if (loaRow?.pdf_path) {
        const { data: signed } = await supabase.storage
          .from("loa-rpa-documents")
          .createSignedUrl(loaRow.pdf_path, 60 * 10);
        loaRpaUrl = signed?.signedUrl ?? null;
      }

      if (!cancelled) {
        setDocs({ membershipCertUrl, loaRpaUrl });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!docs.membershipCertUrl && !docs.loaRpaUrl) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Signed Documents</CardTitle>
        <CardDescription>Certificates and forms generated for you, ready to download.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {docs.membershipCertUrl && (
          <a
            href={docs.membershipCertUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="size-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">Membership Registration Certificate</p>
                <p className="text-xs text-muted-foreground">Your stamped membership agreement</p>
              </div>
            </div>
            <ExternalLink className="size-4 text-muted-foreground shrink-0" />
          </a>
        )}
        {docs.loaRpaUrl && (
          <a
            href={docs.loaRpaUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="size-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">Letter of Authority &amp; Risk Profile</p>
                <p className="text-xs text-muted-foreground">Your signed LOA &amp; RPA submission</p>
              </div>
            </div>
            <ExternalLink className="size-4 text-muted-foreground shrink-0" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
