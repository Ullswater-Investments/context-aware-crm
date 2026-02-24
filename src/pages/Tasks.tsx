import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, CheckSquare, Search, Pencil, Trash2, AlertTriangle, Clock } from "lucide-react";

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

const emptyForm = { title: "", task_type: "other", priority: "medium", due_date: "" };

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTask, setDeleteTask] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase.from("tasks").select("*").order("completed", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false });
    if (data) setTasks(data);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const { error } = await supabase.from("tasks").insert({
      title: form.title,
      task_type: form.task_type as any,
      priority: form.priority as any,
      due_date: form.due_date || null,
      created_by: user!.id,
      assigned_to: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea creada");
    setForm(emptyForm);
    setOpen(false);
    load();
  };

  const openEdit = (t: any) => {
    setEditTask(t);
    setEditForm({ title: t.title, task_type: t.task_type, priority: t.priority, due_date: t.due_date ? t.due_date.slice(0, 16) : "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTask) return;
    const { error } = await supabase.from("tasks").update({
      title: editForm.title,
      task_type: editForm.task_type as any,
      priority: editForm.priority as any,
      due_date: editForm.due_date || null,
    }).eq("id", editTask.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea actualizada");
    setEditOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteTask) return;
    const { error } = await supabase.from("tasks").delete().eq("id", deleteTask.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarea eliminada");
    setDeleteTask(null);
    load();
  };

  const toggle = async (id: string, completed: boolean) => {
    await supabase.from("tasks").update({
      completed: !completed,
      completed_at: !completed ? new Date().toISOString() : null,
    }).eq("id", id);
    load();
  };

  const isOverdue = (t: any) => t.due_date && !t.completed && new Date(t.due_date) < new Date();
  const isSoon = (t: any) => {
    if (!t.due_date || t.completed) return false;
    const diff = new Date(t.due_date).getTime() - Date.now();
    return diff > 0 && diff < 48 * 60 * 60 * 1000;
  };

  let filtered = tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
  if (filterPriority !== "all") filtered = filtered.filter((t) => t.priority === filterPriority);

  const pending = filtered.filter((t) => !t.completed);
  const completed = filtered.filter((t) => t.completed);

  const TaskForm = ({ f, setF, onSave, disabled, label }: any) => (
    <div className="space-y-4">
      <div><Label>Título *</Label><Input value={f.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} /></div>
      <div>
        <Label>Tipo</Label>
        <Select value={f.task_type} onValueChange={(v: string) => setF({ ...f, task_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Prioridad</Label>
        <Select value={f.priority} onValueChange={(v: string) => setF({ ...f, priority: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Fecha límite</Label><Input type="datetime-local" value={f.due_date} onChange={(e: any) => setF({ ...f, due_date: e.target.value })} /></div>
      <Button onClick={onSave} disabled={disabled} className="w-full">{label}</Button>
    </div>
  );

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
            <TaskForm f={form} setF={setForm} onSave={create} disabled={!form.title} label="Crear tarea" />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar tareas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pending tasks */}
      <div className="space-y-2">
        {pending.length > 0 && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendientes ({pending.length})</p>}
        {pending.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border bg-card transition-all group ${isOverdue(t) ? "border-destructive/50" : "border-border"}`}>
            <Checkbox checked={t.completed} onCheckedChange={() => toggle(t.id, t.completed)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs">{typeLabels[t.task_type] || t.task_type}</span>
                {t.due_date && (
                  <span className={`text-xs flex items-center gap-1 ${isOverdue(t) ? "text-destructive font-medium" : isSoon(t) ? "text-warning font-medium" : "text-muted-foreground"}`}>
                    {isOverdue(t) && <AlertTriangle className="w-3 h-3" />}
                    {isSoon(t) && <Clock className="w-3 h-3" />}
                    · {new Date(t.due_date).toLocaleDateString("es")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteTask(t)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <Badge className={`text-xs ${priorityColors[t.priority] || ""}`}>{t.priority}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Completed tasks */}
      {completed.length > 0 && (
        <details className="group">
          <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer list-none flex items-center gap-1">
            Completadas ({completed.length}) <span className="text-[10px]">▸</span>
          </summary>
          <div className="space-y-2 mt-2">
            {completed.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card opacity-50 group/item">
                <Checkbox checked={t.completed} onCheckedChange={() => toggle(t.id, t.completed)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-through">{t.title}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button onClick={() => setDeleteTask(t)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <Badge className={`text-xs ${priorityColors[t.priority] || ""}`}>{t.priority}</Badge>
              </div>
            ))}
          </div>
        </details>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay tareas todavía</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar tarea</DialogTitle></DialogHeader>
          <TaskForm f={editForm} setF={setEditForm} onSave={saveEdit} disabled={!editForm.title} label="Guardar cambios" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTask} onOpenChange={(v) => !v && setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará "{deleteTask?.title}" permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
