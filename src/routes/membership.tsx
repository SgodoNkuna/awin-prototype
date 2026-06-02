import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, FileText, Users, CreditCard, PartyPopper, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/membership")({
  component: MembershipPage,
  head: () => ({
    meta: [
      { title: "Join A-WIN | Membership" },
      {
        name: "description",
        content:
          "Become an A-WIN member. Choose from General, Active or Patron tiers and start your investment journey with us.",
      },
    ],
  }),
});

const TIERS = [
  {
    id: "general" as const,
    name: "General Member",
    price: "R 250",
    period: "/ year",
    featured: false,
    benefits: [
      "Access to monthly newsletter",
      "Invitations to public events",
      "Community forum access",
      "Educational resources library",
    ],
  },
  {
    id: "active" as const,
    name: "Active Member",
    price: "R 650",
    period: "/ year",
    featured: true,
    benefits: [
      "Everything in General",
      "Voting rights at AGM",
      "Member-only workshops & webinars",
      "Investment club participation",
      "Mentorship matching",
      "Discounted event tickets",
    ],
  },
  {
    id: "patron" as const,
    name: "Patron Member",
    price: "R 1,500",
    period: "/ year",
    featured: false,
    benefits: [
      "Everything in Active",
      "Priority access to all events",
      "1-on-1 advisory sessions",
      "Exclusive Patron-only summits",
      "Recognition on the donor wall",
      "Direct line to the executive team",
    ],
  },
];

const STEPS = [
  { n: 1, title: "Submit Application", icon: FileText, desc: "Fill out the form below with your details." },
  { n: 2, title: "Committee Review", icon: Users, desc: "Our team reviews within 5 business days." },
  { n: 3, title: "Pay Membership Fee", icon: CreditCard, desc: "Secure payment via Stripe upon approval." },
  { n: 4, title: "Welcome to A-WIN", icon: PartyPopper, desc: "Access all your member benefits instantly." },
];

const applicationSchema = z.object({
  full_name: z.string().trim().min(1, "Required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(6, "Required").max(30),
  id_number: z.string().trim().min(4, "Required").max(50),
  occupation: z.string().trim().min(1, "Required").max(120),
  employer: z.string().trim().max(120).optional(),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  motivation: z.string().trim().min(10, "Tell us a bit more").max(2000),
  referral: z.string().trim().max(120).optional(),
  tier: z.enum(["general", "active", "patron"]),
});

function MembershipPage() {
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<"general" | "active" | "patron">("active");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const scrollToForm = (tier: "general" | "active" | "patron") => {
    setSelectedTier(tier);
    document.getElementById("application")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      full_name: String(fd.get("full_name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      id_number: String(fd.get("id_number") ?? ""),
      occupation: String(fd.get("occupation") ?? ""),
      employer: String(fd.get("employer") ?? "") || undefined,
      experience: String(fd.get("experience") ?? "") as "beginner" | "intermediate" | "advanced",
      motivation: String(fd.get("motivation") ?? ""),
      referral: String(fd.get("referral") ?? "") || undefined,
      tier: selectedTier,
    };

    const parsed = applicationSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("applications").insert({
      ...parsed.data,
      user_id: user?.id ?? null,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    setSubmitted(true);
    toast.success("Application received!");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/80 py-24 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Join A-WIN</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">
            Choose the membership tier that fits your journey. Grow your wealth and your network alongside a community of women investors.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Membership Tiers</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {TIERS.map((tier) => (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${
                  tier.featured ? "border-2 border-accent shadow-xl scale-105" : ""
                }`}
              >
                {tier.featured && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                    Recommended
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.benefits.map((b) => (
                      <li key={b} className="flex gap-2 text-sm">
                        <Check className="size-4 text-accent shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => scrollToForm(tier.id)}
                    variant={tier.featured ? "default" : "outline"}
                    className="w-full"
                  >
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {STEPS.map((step) => (
              <div key={step.n} className="text-center">
                <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {step.n}
                </div>
                <step.icon className="size-6 mx-auto mb-2 text-accent" />
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section id="application" className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Membership Application</h2>
          <p className="text-center text-muted-foreground mb-10">
            Tell us about yourself — we'll be in touch within 5 business days.
          </p>

          {submitted ? (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="size-16 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto">
                  <Check className="size-8" />
                </div>
                <h3 className="text-2xl font-semibold">Application received!</h3>
                <p className="text-muted-foreground">
                  We will review your application and contact you within 5 business days.
                </p>
                <Button asChild variant="outline">
                  <Link to="/">Back to Home</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" name="full_name" required maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" name="phone" required maxLength={30} />
                </div>
                <div>
                  <Label htmlFor="id_number">ID Number *</Label>
                  <Input id="id_number" name="id_number" required maxLength={50} />
                </div>
                <div>
                  <Label htmlFor="occupation">Occupation *</Label>
                  <Input id="occupation" name="occupation" required maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="employer">Employer</Label>
                  <Input id="employer" name="employer" maxLength={120} />
                </div>
              </div>

              <div>
                <Label htmlFor="experience">Investment Experience *</Label>
                <Select name="experience" defaultValue="beginner">
                  <SelectTrigger id="experience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="motivation">Why do you want to join? *</Label>
                <Textarea id="motivation" name="motivation" required rows={4} maxLength={2000} />
              </div>

              <div>
                <Label htmlFor="referral">Referral (optional)</Label>
                <Input id="referral" name="referral" maxLength={120} placeholder="Who referred you?" />
              </div>

              <div>
                <Label htmlFor="tier">Membership Tier *</Label>
                <Select
                  value={selectedTier}
                  onValueChange={(v) => setSelectedTier(v as "general" | "active" | "patron")}
                >
                  <SelectTrigger id="tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Member — R 250/year</SelectItem>
                    <SelectItem value="active">Active Member — R 650/year</SelectItem>
                    <SelectItem value="patron">Patron Member — R 1,500/year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Submit Application
              </Button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
