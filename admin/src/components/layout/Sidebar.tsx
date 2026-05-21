import { Link, useLocation } from "react-router-dom";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navItems } from "@/components/layout/nav";
import { cn } from "@/components/ui/cn";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { toggleSidebar } from "@/features/ui/uiSlice";
import { logout } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/Button";

export function Sidebar() {
  const location = useLocation();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const dispatch = useAppDispatch();

  return (
    <aside
      className={cn(
        "relative h-screen border-r border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60",
        collapsed ? "w-[76px]" : "w-[280px]",
      )}
    >
      <div className="flex items-center justify-between px-5 py-5">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary grid place-items-center font-bold">
            A
          </div>
          {!collapsed ? (
            <div className="leading-tight">
              <div className="text-sm font-semibold">Amezing Pay</div>
              <div className="text-xs text-text-muted">Admin Dashboard</div>
            </div>
          ) : null}
        </div>
        <button
          className={cn(
            "rounded-xl border border-border bg-card p-2 hover:bg-muted",
            collapsed && "hidden",
          )}
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
        {collapsed ? (
          <button
            className="rounded-xl border border-border bg-card p-2 hover:bg-muted"
            onClick={() => dispatch(toggleSidebar())}
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-muted hover:bg-muted hover:text-text",
                  collapsed && "justify-center",
                )}
              >
                <Icon className={cn("h-5 w-5", active ? "text-white" : "text-text-muted group-hover:text-text")} />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="absolute bottom-0 w-full px-3 pb-4">
        <Button
          variant="secondary"
          className={cn("w-full justify-start gap-3", collapsed && "justify-center")}
          onClick={() => dispatch(logout())}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? "Sign out" : null}
        </Button>
      </div>
    </aside>
  );
}
