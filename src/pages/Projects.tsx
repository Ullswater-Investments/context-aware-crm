import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FolderKanban, Search, Calendar } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  proposal: { label: "Propuesta", variant: "outline" },
  active: { label: "En curso", variant: "default" },
  completed: { label: "Finalizado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", call_reference: "", status: "proposal" as string, description: "", start_date: "", end_date: "" });

  const load = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (data) setProjects(data);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const insert: any = {
      title: form.title,
      call_reference: form.call_reference || null,
      status: form.status,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: user!.id,
    };
    const { error } = await supabase.from("projects").insert(insert);
    if (error) { toast.error(error.message); return; }
    toast.success("Proyecto creado");
    setForm({ title: "", call_reference: "", status: "proposal", description: "", start_date: "", end_date: "" });
    setOpen(false);
    load();
  };

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.call_reference?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Proyectos</h1>
          <p className="text-muted-foreground">Gestiona proyectos y oportunidades europeas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nuevo proyecto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo proyecto</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Convocatoria</Label><Input value={form.call_reference} onChange={(e) => setForm({ ...form, call_reference: e.target.value })} placeholder="ej. HORIZON-CL4-2025" /></div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Propuesta</SelectItem>
                    <SelectItem value="active">En curso</SelectItem>
                    <SelectItem value="completed">Finalizado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Inicio</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>Fin</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <Button onClick={create} disabled={!form.title} className="w-full">Crear proyecto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar proyectos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const s = statusLabels[p.status] || statusLabels.proposal;
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-5 h-5 text-info" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{p.title}</CardTitle>
                      {p.call_reference && <p className="text-sm text-muted-foreground">{p.call_reference}</p>}
                    </div>
                  </div>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {(p.start_date || p.end_date) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {p.start_date && new Date(p.start_date).toLocaleDateString("es")}
                    {p.start_date && p.end_date && " — "}
                    {p.end_date && new Date(p.end_date).toLocaleDateString("es")}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay proyectos todavía</p>
        </div>
      )}
    </div>
  );
}
