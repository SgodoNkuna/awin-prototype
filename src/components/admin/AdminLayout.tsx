import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  to: "/admin" | "/admin/members" | "/admin/applications" | "/admin/events" | "/admin/portfolio" | "/admin/messages" | "/admin/documents" | "/admin/settings";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};
const NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/applications", label: "Applications", icon: ClipboardList },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/documents", label: "Documents", icon: FolderOpen },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", replace: true });
    else if (!isAdmin) navigate({ to: "/portal", replace: true });
  }, [user, loading, isAdmin, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-muted/30">
      <aside className="hidden md:flex w-60 flex-col border-r bg-card">
        <div className="px-5 py-5 border-b">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">A-WIN</div>
          <div className="text-sm font-medium">Admin Console</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = item.exact ? path === item.to : path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-1">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link to="/portal">My Portal</Link>
          </Button>
          <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start">
            <LogOut className="size-4 mr-2" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-20 left-0 right-0 z-40 bg-card border-b overflow-x-auto">
        <div className="flex gap-1 p-2">
          {NAV.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap",
                  active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-secondary",
                )}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8 max-w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
