import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Bot, LayoutDashboard, Building2, Users, FolderKanban,
  FileText, CheckSquare, LogOut, Menu, X, Moon, Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", icon: Bot, label: "Chat IA" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/organizations", icon: Building2, label: "Empresas" },
  { to: "/contacts", icon: Users, label: "Contactos" },
  { to: "/projects", icon: FolderKanban, label: "Proyectos" },
  { to: "/documents", icon: FileText, label: "Documentos" },
  { to: "/tasks", icon: CheckSquare, label: "Tareas" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-sidebar-primary-foreground">GLOBAL DATA CARE</h1>
            <p className="text-[11px] text-sidebar-foreground/60">Kit Espacio de Datos</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            {dark ? "Modo claro" : "Modo oscuro"}
          </button>

          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 px-4 py-3 border-b border-border lg:hidden">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-6 h-6 text-foreground" />
          </button>
          <span className="font-display font-bold text-lg">GLOBAL DATA CARE</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
