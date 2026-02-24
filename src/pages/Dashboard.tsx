import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FolderKanban, CheckSquare, FileText, Bot } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = useState({ orgs: 0, contacts: 0, projects: 0, tasks: 0, docs: 0 });

  useEffect(() => {
    const load = async () => {
      const [orgs, contacts, projects, tasks, docs] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("completed", false),
        supabase.from("documents").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        orgs: orgs.count ?? 0,
        contacts: contacts.count ?? 0,
        projects: projects.count ?? 0,
        tasks: tasks.count ?? 0,
        docs: docs.count ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Empresas", value: stats.orgs, icon: Building2, to: "/organizations", color: "text-primary" },
    { label: "Contactos", value: stats.contacts, icon: Users, to: "/contacts", color: "text-accent" },
    { label: "Proyectos", value: stats.projects, icon: FolderKanban, to: "/projects", color: "text-info" },
    { label: "Tareas pendientes", value: stats.tasks, icon: CheckSquare, to: "/tasks", color: "text-warning" },
    { label: "Documentos", value: stats.docs, icon: FileText, to: "/documents", color: "text-success" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu espacio de trabajo</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Bot className="w-4 h-4" />
          Chat IA
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-display font-bold">{c.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
