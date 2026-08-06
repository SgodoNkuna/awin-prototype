import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters").max(72),
    confirm: z.string().min(8).max(72),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

function ChangePasswordPage({ forced = false }: { forced?: boolean }) {
  const { user, isAdmin, forcePasswordChange, clearForcePasswordChange } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { next?: string };
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      password: String(fd.get("password") ?? ""),
      confirm: String(fd.get("confirm") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (updateError) {
      setBusy(false);
      toast.error(updateError.message || "Could not change password");
      return;
    }

    // Clear the mandatory-change flag now that a real password is set.
    await supabase.from("profiles").update({ force_password_change: false }).eq("id", user.id);
    clearForcePasswordChange();

    // Confirmation emails — fire and forget, the change already succeeded.
    void import("@/lib/email.functions").then(({ sendPasswordChangedEmail }) =>
      sendPasswordChangedEmail({
        data: { email: user.email!, fullName: (user.user_metadata?.full_name as string) || user.email! },
      }).catch(() => {}),
    );

    setBusy(false);
    toast.success("Password changed");
    navigate({ to: search.next || (isAdmin ? "/admin" : "/portal"), replace: true });
  };

  const mustChange = forced || forcePasswordChange;

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-border bg-card text-card-foreground shadow-[var(--shadow-elegant)]">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-center text-foreground">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          {mustChange && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-deep" />
              <p>Your password was reset by an administrator. Please set a new password to continue.</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-foreground">New Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} maxLength={72}
                placeholder="••••••••"
                className="bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-foreground">Confirm New Password</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={8} maxLength={72}
                placeholder="••••••••"
                className="bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin mr-2" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChangePasswordPage;
