import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Save } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import type { EmailTemplate } from "./TemplatePicker";

interface TemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TemplateManager({ open, onOpenChange }: TemplateManagerProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [category, setCategory] = useState("");
  const [entity, setEntity] = useState("none");

  const fetchTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("email_templates")
      .select("id, name, subject, content_html, category, entity")
      .order("category", { ascending: true });
    if (data) setTemplates(data as EmailTemplate[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);

  const openEdit = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setName(t.name);
    setSubject(t.subject || "");
    setContentHtml(t.content_html);
    setCategory(t.category || "");
    setEntity(t.entity || "none");
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setName("");
    setSubject("");
    setContentHtml("");
    setCategory("");
    setEntity("none");
  };

  const handleSave = async () => {
    if (!name.trim() || !user) {
      toast.error("El nombre es obligatorio");
      return;
    }
    try {
      const payload = {
        name: name.trim(),
        subject: subject || null,
        content_html: contentHtml || "<p></p>",
        category: category.trim() || null,
        entity: entity === "none" ? null : entity,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("email_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        toast.success("Plantilla actualizada");
      } else {
        const { error } = await supabase
          .from("email_templates")
          .insert({ ...payload, created_by: user.id });
        if (error) throw error;
        toast.success("Plantilla creada");
      }
      resetForm();
      fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("email_templates").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Plantilla eliminada");
      setDeleteId(null);
      fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar");
    }
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestionar plantillas</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
            {!loading && templates.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay plantillas creadas.</p>
            )}
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.category && <span className="mr-2">{t.category}</span>}
                    {t.entity && <span className="bg-muted px-1 rounded text-[10px]">{t.entity}</span>}
                    {!t.category && !t.entity && stripHtml(t.content_html).slice(0, 60)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit/Create form */}
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-sm font-medium">{editingTemplate ? "Editar plantilla" : "Nueva plantilla"}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Nombre *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Asunto</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto" className="h-8 text-sm mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Categoría</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ventas, Legal..." className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Entidad</Label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="GDC">GDC</SelectItem>
                    <SelectItem value="NextGen">NextGen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Contenido</Label>
              <div className="mt-1">
                <RichTextEditor
                  content={contentHtml}
                  onChange={setContentHtml}
                  userId={user?.id || ""}
                  placeholder="Contenido de la plantilla..."
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Variables: {"{{nombre}}"}, {"{{email}}"}, {"{{empresa}}"}, {"{{cargo}}"}
            </p>
          </div>

          <DialogFooter className="gap-2">
            {editingTemplate && (
              <Button variant="outline" size="sm" onClick={resetForm}>Cancelar edición</Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
              {editingTemplate ? <><Save className="w-3.5 h-3.5 mr-1" />Actualizar</> : <><Plus className="w-3.5 h-3.5 mr-1" />Crear</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
