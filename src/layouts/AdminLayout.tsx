import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { Trophy, Home, History, MonitorPlay } from "lucide-react";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/tournaments", label: "Tournaments", icon: Trophy },
    { href: "/admin/matches", label: "Matches", icon: MonitorPlay },
    { href: "/admin/history", label: "History", icon: History },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      <aside className="w-full md:w-64 bg-card border-r border-border shrink-0 flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-display font-bold text-primary tracking-wide">SCOREBOARD ADMIN</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto bg-background p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
