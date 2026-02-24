import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, CheckSquare, Search } from "lucide-react";

const priorityColors: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
};

const typeLabels: Record<string, string> = {
  email: "📧 Email",
  call: "📞 Llamada",
  meeting: "🤝 Reunión",
  document: "📄 Documento",
  deadline: "⏰ Deadline",
  other: "📌 Otro",
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", task_type: "other", priority: "medium", due_date: "" });

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").order("completed", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false });
    if (data) setTasks(data);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const { error } = await supabase.from("tasks").insert({
      title: form.title,
      task_type: form.task_type,
      priority: form.priority,
      due_date: form.due_date || null,
      created_by: user!.id,
      assigned_to: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea creada");
    setForm({ title: "", task_type: "other", priority: "medium", due_date: "" });
    setOpen(false);
    load();
  };

  const toggle = async (id: string, completed: boolean) => {
    await supabase.from("tasks").update({
      completed: !completed,
      completed_at: !completed ? new Date().toISOString() : null,
    }).eq("id", id);
    load();
  };

  const filtered = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Tareas</h1>
          <p className="text-muted-foreground">Gestiona pendientes y seguimiento</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nueva tarea</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Fecha límite</Label><Input type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <Button onClick={create} disabled={!form.title} className="w-full">Crear tarea</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar tareas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border border-border bg-card transition-opacity ${t.completed ? "opacity-50" : ""}`}>
            <Checkbox checked={t.completed} onCheckedChange={() => toggle(t.id, t.completed)} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${t.completed ? "line-through" : ""}`}>{t.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs">{typeLabels[t.task_type] || t.task_type}</span>
                {t.due_date && <span className="text-xs text-muted-foreground">· {new Date(t.due_date).toLocaleDateString("es")}</span>}
              </div>
            </div>
            <Badge className={`text-xs ${priorityColors[t.priority] || ""}`}>{t.priority}</Badge>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay tareas todavía</p>
        </div>
      )}
    </div>
  );
}
