import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Mic,
  PlayCircle,
  Download,
  MessageSquareQuote,
  Sparkles,
  Mail,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources | Get to Know A-WIN" },
      {
        name: "description",
        content:
          "Everything you need to understand A-WIN — welcome letter, podcast, videos and more.",
      },
      { property: "og:title", content: "Resources | A-WIN" },
      {
        property: "og:description",
        content:
          "Documents, media and more to help you get to know A-WIN.",
      },
    ],
  }),
  component: ResourcesPage,
});

const GREEN = "#4CAF25";
const GREEN_SOFT = "rgba(76, 175, 37, 0.12)";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif text-2xl md:text-3xl font-semibold"
      style={{ color: GREEN }}
    >
      {children}
    </h2>
  );
}

function IconBadge({ icon: Icon }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-xl"
      style={{ background: GREEN_SOFT }}
    >
      <Icon className="h-6 w-6" style={{ color: GREEN }} />
    </div>
  );
}

function ResourcesPage() {
  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden px-4 py-20 md:py-28 text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--accent),transparent_55%)] opacity-25" />
        <div className="relative mx-auto max-w-4xl text-center animate-fade-in">
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-tight">
            Resources
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-primary-foreground/90">
            Everything you need to understand A-WIN — documents, media, and
            more.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-16 md:py-24">
        {/* WELCOME LETTER */}
        <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <IconBadge icon={FileText} />
              <div className="flex-1">
                <SectionHeading>Welcome Letter</SectionHeading>
                <p className="mt-3 text-muted-foreground">
                  Start here. Read A-WIN's Welcome Letter to understand our
                  mission, values, and what membership means.
                </p>
                <Button
                  disabled
                  className="mt-5"
                  style={{ background: GREEN, color: "white" }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Available as a downloadable PDF and readable on-page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PODCAST */}
        <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <IconBadge icon={Mic} />
              <div className="flex-1">
                <SectionHeading>WOMan Radio Podcast</SectionHeading>
                <p className="mt-3 text-muted-foreground">
                  Tune in to A-WIN's podcast — honest conversations about money,
                  investment, and women building wealth.
                </p>
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-muted-foreground">
                  <PlayCircle className="h-8 w-8 opacity-50" />
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted" />
                    <p className="mt-2 text-xs">
                      Podcast link coming soon — available on Spotify and
                      YouTube.
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Show notes and transcripts will be available here.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VIDEO */}
        <Card className="border-border/60 shadow-[var(--shadow-elegant)]">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <IconBadge icon={PlayCircle} />
              <div className="flex-1">
                <SectionHeading>
                  GMT WCW Graduation Address (2025)
                </SectionHeading>
                <p className="mt-3 text-muted-foreground">
                  Watch the graduation address from the GMT Women Can Win
                  programme — an inspiring milestone for A-WIN's community.
                </p>
                <div className="mt-5 flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/40">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <PlayCircle
                      className="h-14 w-14 opacity-60"
                      style={{ color: GREEN }}
                    />
                    <p className="mt-3 text-sm">Video coming soon.</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Upload link to YouTube or Vimeo to activate this player.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FUTURE RESOURCES */}
        <div>
          <SectionHeading>More Coming Soon</SectionHeading>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { icon: MessageSquareQuote, title: "Member Testimonials" },
              { icon: Sparkles, title: "Success Stories" },
              { icon: Mail, title: "Newsletters & Announcements" },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <Card
                  key={r.title}
                  className="border-border/60 bg-muted/30 shadow-[var(--shadow-elegant)] opacity-70"
                >
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="relative">
                      <IconBadge icon={Icon} />
                      <Lock className="absolute -right-1 -top-1 h-4 w-4 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 font-serif text-lg text-foreground">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Content being compiled — check back soon.
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
