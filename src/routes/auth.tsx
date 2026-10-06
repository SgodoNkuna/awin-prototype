import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requestPasswordReset, signUpMember } from "@/lib/auth-email.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign In | A-Win" },
      { name: "description", content: "Sign in or create your A-Win member account." },
    ],
  }),
});

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(1, "Required").max(120),
});

/**
 * Forgot-password: a 6-digit code (plus a one-click link) emailed by our own
 * requestPasswordReset server fn through ZeptoMail — not Supabase's built-in
 * mailer, which was rate-limiting and landing in spam (see auth-email.server.ts).
 *
 * `verifyOtp({type:'recovery'})` exchanges that code for a real session —
 * unlike a normal password change, a recovery-flow session does not need
 * `current_password` (the whole point of "forgot" is not having it).
 */
function ForgotPasswordFlow({
  onDone,
  onHoldRedirect,
  initialEmail = "",
}: {
  onDone: () => void;
  onHoldRedirect: (hold: boolean) => void;
  initialEmail?: string;
}) {
  const callReset = useServerFn(requestPasswordReset);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email("Invalid email").max(255).safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Enter a valid email");
    setBusy(true);
    try {
      await callReset({ data: { email: parsed.data } });
    } catch (err) {
      setBusy(false);
      return toast.error(err instanceof Error ? err.message : "Couldn't send the code — try again");
    }
    setBusy(false);
    setEmail(parsed.data.toLowerCase());
    toast.success("If that email has an account, a 6-digit code is on its way. Check spam/junk too.");
    setStep("verify");
  };

  const verifyAndSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) return toast.error("Enter the 6-digit code from your email");
    if (password.length < 8) return toast.error("At least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    // verifyOtp signs them in, which would otherwise trigger the page's
    // role-based redirect before the new password is saved — and a user
    // flagged force_password_change would land on /change-password asking
    // for a temp password they never had.
    onHoldRedirect(true);
    const { error: otpError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "recovery" });
    if (otpError) {
      setBusy(false);
      onHoldRedirect(false);
      return toast.error(otpError.message || "Invalid or expired code");
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      return toast.error(updateError.message || "Could not set new password");
    }
    const { data: { user: me } } = await supabase.auth.getUser();
    if (me) await supabase.from("profiles").update({ force_password_change: false }).eq("id", me.id);
    toast.success("Password set — you're signed in");
    onDone();
    // Full reload so roles and the password-change flag are re-read fresh.
    window.location.replace("/auth");
  };

  return (
    <div className="space-y-4 mt-4">
      {step === "request" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your account email — we'll send a 6-digit code to reset your password.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="fp-email" className="text-foreground">Email</Label>
            <Input id="fp-email" type="email" required maxLength={255} value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="bg-background text-foreground placeholder:text-muted-foreground" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin mr-2" />}
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyAndSet} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the code sent to {email}, and your new password. Not there after a few minutes? Check spam/junk, or{" "}
            <button type="button" className="underline" onClick={() => setStep("request")}>send another</button>.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="fp-code" className="text-foreground">6-digit code</Label>
            <Input id="fp-code" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="123456" className="bg-background text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fp-password" className="text-foreground">New Password</Label>
            <Input id="fp-password" type="password" required minLength={8} maxLength={72} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="bg-background text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fp-confirm" className="text-foreground">Confirm New Password</Label>
            <Input id="fp-confirm" type="password" required minLength={8} maxLength={72} value={confirm}
              onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
              className="bg-background text-foreground placeholder:text-muted-foreground" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin mr-2" />}
            Set new password
          </Button>
        </form>
      )}
    </div>
  );
}

/** Turn Supabase's terse auth errors into something a person can act on. */
function friendlySignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) {
    return "Wrong email or password. If you've forgotten it (or never set one), use “Forgot password?” to choose a new one.";
  }
  if (/email not confirmed/i.test(message)) {
    return "This email hasn't been confirmed yet. Use “Forgot password?” — that confirms your email and lets you set a password in one step.";
  }
  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isAdvisor, loading } = useAuth();
  const callSignUp = useServerFn(signUpMember);
  const [tab, setTab] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [recovering, setRecovering] = useState(() => {
    if (typeof window === "undefined") return false;
    const q = new URLSearchParams(window.location.search);
    // A recovery link must hold the redirect from the very first render —
    // verifyOtp signs them in before we get to flip this on.
    return q.get("recover") === "1" || (!!q.get("token_hash") && q.get("type") === "recovery");
  });
  const [holdRedirect, setHoldRedirect] = useState(false);
  const verifying = useRef(false);

  // Links in our own (ZeptoMail) emails land here as ?token_hash=…&type=…
  // — exchange them for a session directly, no Supabase redirect involved.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (!tokenHash || (type !== "recovery" && type !== "signup") || verifying.current) return;
    verifying.current = true;
    (async () => {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) {
        window.history.replaceState(null, "", "/auth");
        setRecovering(false);
        toast.error("That link has expired or was already used. Use “Forgot password?” to get a fresh one.");
        setTab("reset");
        return;
      }
      if (type === "recovery") {
        window.history.replaceState(null, "", "/auth?recover=1");
        setRecovering(true);
      } else {
        window.history.replaceState(null, "", "/auth");
        toast.success("Email confirmed — welcome!");
      }
    })();
  }, []);

  useEffect(() => {
    if (loading || !user || recovering || holdRedirect) return;
    // ThuthukaSA advisors land on their own dashboard (even if someone also
    // gave them admin — the A-Win console can't show LOA/RPA data), A-Win
    // admins on the admin dashboard, everyone else on the member portal.
    navigate({ to: isAdvisor ? "/tksa" : isAdmin ? "/admin" : "/portal", replace: true });
  }, [user, isAdmin, isAdvisor, loading, navigate, recovering, holdRedirect]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the form");

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ ...parsed.data, email: parsed.data.email.toLowerCase() });
    setBusy(false);
    if (error) {
      setResetEmail(parsed.data.email);
      return toast.error(friendlySignInError(error.message), { duration: 10000 });
    }
    toast.success("Signed in");
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      full_name: String(fd.get("full_name") ?? ""),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the form");

    setBusy(true);
    try {
      const res = await callSignUp({ data: parsed.data });
      if (res.status === "already_registered") {
        toast.info("That email already has an account — sign in, or use “Forgot password?” if you don't know the password.", { duration: 10000 });
      } else {
        toast.success("Check your email (and spam/junk) for a link to confirm your account.", { duration: 10000 });
      }
      setTab("signin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the account — try again");
    } finally {
      setBusy(false);
    }
  };

  if (recovering && user) {
    return (
      <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-center text-foreground">Set a new password</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const pw = String(fd.get("pw") ?? "");
                if (pw.length < 8) return toast.error("At least 8 characters");
                if (pw !== String(fd.get("pw2") ?? "")) return toast.error("Passwords do not match");
                setBusy(true);
                const { error } = await supabase.auth.updateUser({ password: pw });
                setBusy(false);
                if (error) return toast.error(error.message);
                await supabase.from("profiles").update({ force_password_change: false }).eq("id", user.id);
                toast.success("Password set");
                window.location.replace(isAdvisor ? "/tksa" : isAdmin ? "/admin" : "/portal");
              }}
            >
              <p className="text-sm text-muted-foreground">Signed in as {user.email}. Choose your new password.</p>
              <Input name="pw" type="password" required minLength={8} maxLength={72} placeholder="New password" />
              <Input name="pw2" type="password" required minLength={8} maxLength={72} placeholder="Confirm new password" />
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin mr-2" />}
                Save password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-border bg-card text-card-foreground shadow-[var(--shadow-elegant)]">
        <CardHeader>
          <CardTitle className="font-serif text-2xl text-center text-foreground">Member Portal</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Helpful onboarding note */}
          <div className="mb-5 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
            <p className="font-semibold mb-1">New here?</p>
            <p className="text-foreground/90">
              Continue with Google for instant access, or create an email account on the
              Sign Up tab.
            </p>
          </div>

          {/* Google sign-in */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              // Use our own Supabase project's Google OAuth (configured in Supabase
              // Auth → Providers).
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/portal` },
              });
              if (error) {
                setBusy(false);
                toast.error(error.message || "Google sign-in failed");
              }
              // On success the browser redirects to Google, then back to /portal.
            }}
          >
            <svg className="size-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.47 12c0-.73.13-1.43.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {tab === "reset" ? (
            <>
              {/* The role-aware redirect effect above fires once `user` is set — no need to duplicate its admin/advisor/member logic here. */}
              <ForgotPasswordFlow onDone={() => {}} onHoldRedirect={setHoldRedirect} initialEmail={resetEmail} />
              <p className="text-center text-sm text-muted-foreground mt-4">
                <button type="button" className="hover:text-primary underline-offset-2 hover:underline" onClick={() => setTab("signin")}>
                  ← Back to sign in
                </button>
              </p>
            </>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="si-email" className="text-foreground">Email</Label>
                    <Input id="si-email" name="email" type="email" required maxLength={255}
                      placeholder="you@example.com"
                      className="bg-background text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="si-password" className="text-foreground">Password</Label>
                      <button type="button" className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline" onClick={() => setTab("reset")}>
                        Forgot password?
                      </button>
                    </div>
                    <Input id="si-password" name="password" type="password" required maxLength={72}
                      placeholder="••••••••"
                      className="bg-background text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin mr-2" />}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-name" className="text-foreground">Full Name</Label>
                    <Input id="su-name" name="full_name" required maxLength={120}
                      className="bg-background text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email" className="text-foreground">Email</Label>
                    <Input id="su-email" name="email" type="email" required maxLength={255}
                      className="bg-background text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-password" className="text-foreground">Password</Label>
                    <Input id="su-password" name="password" type="password" required minLength={6} maxLength={72}
                      className="bg-background text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin mr-2" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/" className="hover:text-primary">← Back to home</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

