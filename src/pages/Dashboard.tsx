import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, FolderKanban, CheckSquare, FileText, Bot, Clock, CheckCircle, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = useState({ orgs: 0, contacts: 0, projects: 0, tasks: 0, docs: 0 });
  const [lushaStats, setLushaStats] = useState({ total: 0, pending: 0, enriched: 0, notFound: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [orgs, contacts, projects, tasks, docs, totalContacts, pending, enriched, notFound] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("completed", false),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("lusha_status", "pending"),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("lusha_status", "enriched"),
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("lusha_status", "not_found"),
      ]);
      setStats({
        orgs: orgs.count ?? 0,
        contacts: contacts.count ?? 0,
        projects: projects.count ?? 0,
        tasks: tasks.count ?? 0,
        docs: docs.count ?? 0,
      });
      setLushaStats({
        total: totalContacts.count ?? 0,
        pending: pending.count ?? 0,
        enriched: enriched.count ?? 0,
        notFound: notFound.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const lushaCards = [
    { label: "Total Contactos", value: lushaStats.total, icon: Users, color: "text-primary" },
    { label: "Pendientes", value: lushaStats.pending, icon: Clock, color: "text-muted-foreground" },
    { label: "Enriquecidos", value: lushaStats.enriched, icon: CheckCircle, color: "text-success" },
    { label: "Créditos Estimados", value: lushaStats.enriched, icon: CreditCard, color: "text-warning" },
  ];

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

      {/* Lusha Enrichment Stats */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-4">Enriquecimiento Lusha</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {lushaCards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <p className="text-3xl font-display font-bold">{c.value}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
