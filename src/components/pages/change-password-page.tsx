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
    currentPassword: z.string().min(1, "Required"),
    password: z.string().min(8, "At least 8 characters").max(72),
    confirm: z.string().min(8).max(72),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

function ChangePasswordPage({ forced = false }: { forced?: boolean }) {
  const { user, isAdmin, isAdvisor, forcePasswordChange, clearForcePasswordChange } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { next?: string };
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.email) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      currentPassword: String(fd.get("currentPassword") ?? ""),
      password: String(fd.get("password") ?? ""),
      confirm: String(fd.get("confirm") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }

    setBusy(true);
    // This project requires the current password alongside the new one
    // (GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD) — for a
    // forced first-login change, "current" is the temp password the admin
    // handed out. Wrong current password surfaces GoTrue's own error text.
    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
      current_password: parsed.data.currentPassword,
    });
    if (updateError) {
      setBusy(false);
      // GoTrue returns the exact same message text ("Current password
      // required when setting new password.") for both a missing AND a
      // wrong current password — genuinely misleading, since the field is
      // required in this form and clearly isn't empty. Use the machine
      // error code to tell the user what's actually wrong.
      const code = (updateError as { code?: string }).code;
      if (code === "current_password_invalid") {
        toast.error("That current/temporary password is incorrect — check for typos, or use \"Forgot password?\" on the sign-in page instead.");
      } else {
        toast.error(updateError.message || "Could not change password");
      }
      return;
    }

    // Clear the mandatory-change flag now that a real password is set. This
    // used to fire-and-forget: if it silently failed, the auth password DID
    // change but the DB flag stayed true, so the *next* login re-entered
    // this same form forever — exactly the "keeps asking for a new
    // password" loop. Now it's visible and retried once instead of silent.
    let { error: flagError } = await supabase.from("profiles").update({ force_password_change: false }).eq("id", user.id);
    if (flagError) {
      ({ error: flagError } = await supabase.from("profiles").update({ force_password_change: false }).eq("id", user.id));
    }
    if (flagError) {
      toast.error("Password changed, but couldn't confirm it here — if you're asked to change it again next login, that's why. Try again or contact an admin.");
    }
    clearForcePasswordChange();

    // Confirmation emails — fire and forget, the change already succeeded.
    void import("@/lib/email.functions").then(({ sendPasswordChangedEmail }) =>
      sendPasswordChangedEmail({
        data: { email: user.email!, fullName: (user.user_metadata?.full_name as string) || user.email! },
      }).catch(() => {}),
    );

    setBusy(false);
    toast.success("Password changed");
    navigate({ to: search.next || (isAdmin ? "/admin" : isAdvisor ? "/tksa" : "/portal"), replace: true });
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
              <p>Your password was reset by an administrator. Enter the temporary password you were given below, then set your own.</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-foreground">{mustChange ? "Temporary Password" : "Current Password"}</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required
                placeholder="••••••••"
                className="bg-background text-foreground placeholder:text-muted-foreground" />
            </div>
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
