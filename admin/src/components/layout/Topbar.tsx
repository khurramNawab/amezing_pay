import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { navItems } from "@/components/layout/nav";
import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/Button";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { setTheme } from "@/features/ui/uiSlice";

export function Topbar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);

  const title = useMemo(() => {
    const match = navItems.find((n) =>
      n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to),
    );
    return match?.label || "Dashboard";
  }, [location.pathname]);

  const toggleThemeMode = () => {
    dispatch(setTheme(theme === "dark" ? "light" : "dark"));
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <div className="text-xs text-text-muted">Admin</div>
          <div className="text-lg font-semibold">{title}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className={cn("relative hidden md:block", "w-[360px]")}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              className="h-10 w-full rounded-xl border border-border bg-muted/30 pl-10 pr-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search users, cards, templates…"
            />
          </div>

          <Button variant="ghost" className="h-10 w-10 p-0" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            className="h-10 w-10 p-0"
            aria-label="Toggle theme"
            onClick={toggleThemeMode}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary grid place-items-center font-semibold">
            A
          </div>
        </div>
      </div>
    </header>
  );
}

