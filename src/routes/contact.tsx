import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Phone, MapPin, Clock, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact A-Win | Get in Touch" },
      {
        name: "description",
        content:
          "Reach out to A-Win with questions, partnership ideas, or media enquiries. We respond within 2 business days.",
      },
    ],
  }),
});

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  subject: z.enum(["general", "membership", "events", "partnership", "media"]),
  message: z.string().trim().min(10).max(2000),
});

// Defaults — overridden by the `contact_info` site_setting (Admin → Settings → Content).
const INFO_DEFAULTS = {
  email: "info@awin.co.za",
  phone: "+27 72 236 9002",
  mobile: "",
  location: "Centurion, South Africa",
  hours: "Mon – Fri · 09:00 – 17:00 SAST",
};

function useContactInfo() {
  const [info, setInfo] = useState(INFO_DEFAULTS);
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", "contact_info")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setInfo({ ...INFO_DEFAULTS, ...(data.value as Partial<typeof INFO_DEFAULTS>) });
      });
  }, []);
  return [
    { icon: Mail, label: "Email", value: info.email },
    { icon: Phone, label: "Phone", value: info.phone },
    ...(info.mobile ? [{ icon: Phone, label: "Mobile", value: info.mobile }] : []),
    { icon: MapPin, label: "Location", value: info.location },
    { icon: Clock, label: "Office Hours", value: info.hours },
  ];
}

function ContactPage() {
  const INFO = useContactInfo();
  const [subject, setSubject] = useState<"general" | "membership" | "events" | "partnership" | "media">("general");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { sanitizeText, sanitizeEmail } = await import("@/lib/sanitize");
    let cleanEmail = "";
    try {
      cleanEmail = sanitizeEmail(String(fd.get("email") ?? ""));
    } catch {
      toast.error("Please enter a valid email address.");
      return;
    }
    const raw = {
      name: sanitizeText(String(fd.get("name") ?? "")),
      email: cleanEmail,
      subject,
      message: sanitizeText(String(fd.get("message") ?? "")),
    };
    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("Could not send. Please try again.");
      return;
    }
    setSent(true);
    toast.success("Message sent — we'll be in touch.");
    // Forward to the info@ inbox — fire-and-forget, the DB row is the source of truth.
    void import("@/lib/email.functions").then(({ sendContactNotification }) =>
      sendContactNotification({ data: parsed.data }).catch(() => {}),
    );
    (e.target as HTMLFormElement).reset();
  };


  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/80 py-24 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Get In Touch</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">
            Questions, partnerships, or just want to say hello? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Two-column */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 max-w-6xl">
          {/* Form */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
            {sent ? (
              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="size-14 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto">
                    <Check className="size-7" />
                  </div>
                  <h3 className="text-xl font-semibold">Message sent!</h3>
                  <p className="text-muted-foreground">
                    Thank you for reaching out. We'll respond within 2 business days.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} />
                </div>
                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Select value={subject} onValueChange={(v) => setSubject(v as typeof subject)}>
                    <SelectTrigger id="subject">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Enquiry</SelectItem>
                      <SelectItem value="membership">Membership</SelectItem>
                      <SelectItem value="events">Events</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" name="message" required rows={5} maxLength={2000} />
                </div>
                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Send Message
                </Button>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">Contact information</h2>
            {INFO.map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-6 flex gap-4 items-start">
                  <div className="size-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <item.icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{item.label}</div>
                    <div className="text-muted-foreground text-sm">{item.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Map */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted">
                <iframe
                  title="A-Win office location on map"
                  src="https://www.google.com/maps?q=Centurion%2C+Pretoria%2C+South+Africa&output=embed"
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
              <CardContent className="pt-4 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Centurion, Pretoria, South Africa
                </span>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Centurion%2C+Pretoria%2C+South+Africa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary story-link"
                >
                  Get directions
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
