import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  Briefcase,
  Mail,
  FolderOpen,
  Settings,
  LogOut,
  Loader2,
  CreditCard,
  FileDown,
  Menu,
  Award,
  Newspaper,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AdminPath =
  | "/admin"
  | "/admin/members"
  | "/admin/committees"
  | "/admin/applications"
  | "/admin/events"
  | "/admin/portfolio"
  | "/admin/messages"
  | "/admin/documents"
  | "/admin/billing"
  | "/admin/exports"
  | "/admin/settings";

type NavItem = {
  to: AdminPath;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    label: "People",
    items: [
      { to: "/admin/members", label: "Members", icon: Users },
      { to: "/admin/committees", label: "Committees", icon: Award },
      { to: "/admin/applications", label: "Applications", icon: ClipboardList },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/events", label: "Events", icon: Calendar },
      { to: "/admin/portfolio", label: "News & Gallery", icon: Newspaper },
      { to: "/admin/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    label: "Communications",
    items: [
      { to: "/admin/messages", label: "Messages", icon: Mail },
      { to: "/admin/billing", label: "Billing", icon: CreditCard },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/exports", label: "PDF Export", icon: FileDown },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];


const FLAT_NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function AdminLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", replace: true });
    else if (!isAdmin) navigate({ to: "/portal", replace: true });
  }, [user, loading, isAdmin, navigate]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isActive = (item: NavItem) =>
    item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");

  const currentLabel = FLAT_NAV.find(isActive)?.label ?? "Admin";

  const NavList = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex-1 overflow-y-auto p-3 space-y-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/60">
            {group.label}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNav}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-11",
                    active
                      ? "bg-[#E8960A] text-white"
                      : "text-white/85 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const Footer = ({ onNav }: { onNav?: () => void }) => (
    <div className="p-3 border-t border-white/10 space-y-1">
      <Link
        to="/portal"
        onClick={onNav}
        className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white min-h-11"
      >
        My Portal
      </Link>
      <button
        onClick={() => { onNav?.(); signOut(); }}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white min-h-11"
      >
        <LogOut className="size-4" /> Sign Out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 flex-col border-r sticky top-20 self-start h-[calc(100vh-5rem)]"
        style={{ background: "#3D8B2F", color: "#FFFFFF" }}
      >
        <div className="px-5 py-4 border-b border-white/10">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#E8960A]">A-WIN</div>
          <div className="text-sm font-medium text-white">Admin Console</div>
          <div className="text-xs text-white/70 truncate mt-0.5">{user.email}</div>
        </div>
        <NavList />
        <Footer />
      </aside>

      {/* Mobile top bar with hamburger */}
      <div className="md:hidden fixed top-20 left-0 right-0 z-40 bg-card border-b shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                size="sm"
                className="gap-2 min-h-11 text-white font-semibold"
                style={{ background: "#E8960A" }}
                aria-label="Open admin menu"
              >
                <Menu className="size-4" />
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 p-0 flex flex-col border-0"
              style={{ background: "#3D8B2F", color: "#FFFFFF" }}
            >
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <div className="px-5 py-4 border-b border-white/10">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#E8960A]">A-WIN</div>
                <div className="text-sm font-medium text-white">{currentLabel}</div>
                <div className="text-xs text-white/70 truncate mt-0.5">{user.email}</div>
              </div>
              <NavList onNav={() => setMobileOpen(false)} />
              <Footer onNav={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="text-sm font-medium truncate">{currentLabel}</div>
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 max-w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
