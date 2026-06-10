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
  const { user } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/portal", replace: true });
  }, [user, navigate]);

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
          {/* Demo credentials banner */}
          <div className="mb-5 rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-foreground">
            <p className="font-semibold text-foreground mb-1">Demo logins (for testing)</p>
            <ul className="space-y-0.5 text-foreground/90">
              <li><span className="font-medium">Admin:</span> admin@awin.demo / AwinDemo!2026</li>
              <li><span className="font-medium">Member:</span> member@awin.demo / AwinDemo!2026</li>
            </ul>
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
                    defaultValue="member@awin.demo"
                    className="bg-background text-foreground placeholder:text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-password" className="text-foreground">Password</Label>
                  <Input id="si-password" name="password" type="password" required maxLength={72}
                    defaultValue="AwinDemo!2026"
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

