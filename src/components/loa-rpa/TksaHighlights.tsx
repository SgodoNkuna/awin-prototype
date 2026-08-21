import { ShieldCheck, Zap, BadgeCheck, Lock } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Confidential",
    body: "FAIS & POPIA protected — never visible to A-Win committee or admin accounts.",
  },
  {
    icon: Zap,
    title: "Fast",
    body: "Applicants sign and submit a Letter of Authority & Risk Profile in under 5 minutes.",
  },
  {
    icon: BadgeCheck,
    title: "Compliant",
    body: "Matches Astute's own paper form field-for-field — FSP No. 47992.",
  },
  {
    icon: Lock,
    title: "Audited",
    body: "Every access change and deletion request is logged, with two-person approval.",
  },
] as const;

/**
 * A quick "what this dashboard actually gives you" strip — adapted from a
 * generic shadcn feature-grid layout, but with real ThuthukaSA content
 * instead of placeholder marketing copy (no stock illustration either,
 * since there's nothing here that actually needs one).
 */
export function TksaHighlights() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border border-[#e8960a]/20 bg-[#1a1815] p-5 sm:grid-cols-4 sm:gap-6 sm:p-6">
      {ITEMS.map(({ icon: Icon, title, body }) => (
        <div key={title} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Icon className="size-4" style={{ color: "#e8960a" }} />
            <h3 className="text-sm font-medium text-white">{title}</h3>
          </div>
          <p className="text-xs leading-relaxed text-white/60">{body}</p>
        </div>
      ))}
    </div>
  );
}
