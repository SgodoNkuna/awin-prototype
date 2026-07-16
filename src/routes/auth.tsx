import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign In | A-WIN" },
      { name: "description", content: "Sign in or create your A-WIN member account." },
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

function AuthPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    // Admins land on the admin dashboard; members continue to the portal.
    navigate({ to: isAdmin ? "/admin" : "/portal", replace: true });
  }, [user, isAdmin, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the form");

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) return toast.error(error.message);
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
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal`,
        data: { full_name: parsed.data.full_name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email to confirm.");
    setTab("signin");
  };

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
                  <Label htmlFor="si-password" className="text-foreground">Password</Label>
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

          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/" className="hover:text-primary">← Back to home</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

