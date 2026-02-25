import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Mail, Phone, Briefcase, Building, Plus, Trash2, Send, Tag, X, Pencil, Save, Copy, Loader2, Sparkles, Linkedin, Globe } from "lucide-react";
import ComposeEmail from "@/components/email/ComposeEmail";

const STATUS_LABELS: Record<string, string> = {
  new_lead: "Nuevo Lead",
  contacted: "Contactado",
  proposal_sent: "Propuesta Enviada",
  client: "Cliente",
  lost: "Perdido",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

const LUSHA_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-muted text-muted-foreground" },
  enriched: { label: "Enriquecido", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  not_found: { label: "No encontrado", className: "bg-orange-500/15 text-orange-700 border-orange-500/30" },
};

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  organization_id: string | null;
  organizations?: { name: string } | null;
  status: string;
  tags: string[] | null;
  notes: string | null;
  linkedin_url?: string | null;
  company_domain?: string | null;
  work_email?: string | null;
  personal_email?: string | null;
  mobile_phone?: string | null;
  work_phone?: string | null;
  lusha_status?: string | null;
  hunter_status?: string | null;
  last_enriched_at?: string | null;
}

interface ContactNote {
  id: string;
  content: string;
  created_at: string;
}

interface ContactProfileProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

function CopyButton({ value }: { value: string }) {
  const copy = () => {
    navigator.clipboard.writeText(value);
    toast.success("Copiado al portapapeles");
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
      <Copy className="w-3 h-3" />
    </button>
  );
}

export default function ContactProfile({ contact, open, onOpenChange, onUpdate }: ContactProfileProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [status, setStatus] = useState(contact?.status || "new_lead");
  const [composeOpen, setComposeOpen] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ full_name: "", email: "", phone: "", position: "", linkedin_url: "" });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichingHunter, setEnrichingHunter] = useState(false);

  const loadNotes = async (contactId: string) => {
    setLoadingNotes(true);
    const { data } = await supabase
      .from("contact_notes")
      .select("id, content, created_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });
    setNotes((data as ContactNote[]) || []);
    setLoadingNotes(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && contact) {
      setStatus(contact.status);
      setEditing(false);
      loadNotes(contact.id);
    }
    onOpenChange(isOpen);
  };

  const startEdit = () => {
    if (!contact) return;
    setEditData({
      full_name: contact.full_name,
      email: contact.email || "",
      phone: contact.phone || "",
      position: contact.position || "",
      linkedin_url: contact.linkedin_url || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!contact) return;
    const { error } = await supabase.from("contacts").update({
      full_name: editData.full_name,
      email: editData.email || null,
      phone: editData.phone || null,
      position: editData.position || null,
      linkedin_url: editData.linkedin_url || null,
    } as any).eq("id", contact.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Contacto actualizado");
    setEditing(false);
    onUpdate();
  };

  const confirmDelete = async () => {
    if (!contact) return;
    await supabase.from("contact_notes").delete().eq("contact_id", contact.id);
    const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Contacto eliminado");
    setDeleteOpen(false);
    onOpenChange(false);
    onUpdate();
  };

  const updateStatus = async (newStatus: string) => {
    if (!contact) return;
    setStatus(newStatus);
    const { error } = await supabase
      .from("contacts")
      .update({ status: newStatus } as any)
      .eq("id", contact.id);
    if (error) toast.error(error.message);
    else onUpdate();
  };

  const addTag = async () => {
    if (!contact || !newTag.trim()) return;
    const currentTags = contact.tags || [];
    if (currentTags.includes(newTag.trim())) { setNewTag(""); return; }
    const updatedTags = [...currentTags, newTag.trim()];
    const { error } = await supabase.from("contacts").update({ tags: updatedTags }).eq("id", contact.id);
    if (error) toast.error(error.message);
    else { setNewTag(""); onUpdate(); }
  };

  const removeTag = async (tag: string) => {
    if (!contact) return;
    const updatedTags = (contact.tags || []).filter((t) => t !== tag);
    const { error } = await supabase.from("contacts").update({ tags: updatedTags }).eq("id", contact.id);
    if (error) toast.error(error.message);
    else onUpdate();
  };

  const addNote = async () => {
    if (!contact || !newNote.trim()) return;
    const { error } = await supabase.from("contact_notes").insert({
      contact_id: contact.id,
      content: newNote.trim(),
      created_by: user!.id,
    } as any);
    if (error) toast.error(error.message);
    else { setNewNote(""); loadNotes(contact.id); toast.success("Nota guardada"); }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from("contact_notes").delete().eq("id", noteId);
    if (error) toast.error(error.message);
    else if (contact) loadNotes(contact.id);
  };

  const enrichWithLusha = async () => {
    if (!contact) return;
    setEnriching(true);
    try {
      // Split full_name into first/last
      const nameParts = contact.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { data, error } = await supabase.functions.invoke("enrich-lusha-contact", {
        body: {
          contact_id: contact.id,
          first_name: firstName,
          last_name: lastName,
          company_name: contact.organizations?.name || "",
          linkedin_url: contact.linkedin_url || "",
        },
      });

      if (error) {
        toast.error("Error al conectar con Lusha");
        return;
      }

      if (data?.status === "enriched") {
        toast.success("¡Contacto enriquecido con éxito!");
      } else {
        toast.warning("Lusha no encontró datos para este contacto");
      }
      onUpdate();
    } catch (err) {
      toast.error("Error inesperado al enriquecer contacto");
    } finally {
      setEnriching(false);
    }
  };

  const enrichWithHunter = async () => {
    if (!contact || !contact.email) return;
    setEnrichingHunter(true);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-hunter-contact", {
        body: { contact_id: contact.id, email: contact.email },
      });
      if (error) {
        toast.error("Error al conectar con Hunter.io");
        return;
      }
      if (data?.status === "enriched") {
        toast.success("¡Contacto enriquecido con Hunter.io!");
      } else {
        toast.warning("Hunter.io no encontró datos para este contacto");
      }
      onUpdate();
    } catch {
      toast.error("Error inesperado al enriquecer con Hunter.io");
    } finally {
      setEnrichingHunter(false);
    }
  };

  if (!contact) return null;

  const lushaStatus = contact.lusha_status || "pending";
  const lushaConfig = LUSHA_STATUS_CONFIG[lushaStatus] || LUSHA_STATUS_CONFIG.pending;
  const hunterStatus = contact.hunter_status || "pending";
  const hunterConfig = LUSHA_STATUS_CONFIG[hunterStatus] || LUSHA_STATUS_CONFIG.pending;
  const hasLushaData = contact.work_email || contact.personal_email || contact.mobile_phone || contact.work_phone;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{editing ? "Editar contacto" : contact.full_name}</DialogTitle>
                <Badge className={lushaConfig.className}>Lusha: {lushaConfig.label}</Badge>
                <Badge className={hunterConfig.className}>Hunter: {hunterConfig.label}</Badge>
              </div>
              <div className="flex gap-1">
                {!editing && (
                  <button onClick={startEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></button>
                )}
                <button onClick={() => setDeleteOpen(true)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Contact Info - Editable */}
              {editing ? (
                <div className="space-y-3">
                  <div><Label>Nombre *</Label><Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} /></div>
                  <div><Label>Teléfono</Label><Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} /></div>
                  <div><Label>Cargo</Label><Input value={editData.position} onChange={(e) => setEditData({ ...editData, position: e.target.value })} /></div>
                  <div><Label>LinkedIn URL</Label><Input value={editData.linkedin_url} onChange={(e) => setEditData({ ...editData, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={!editData.full_name}><Save className="w-3.5 h-3.5 mr-1" />Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {contact.organizations?.name && (
                    <div className="flex items-center gap-2 text-sm"><Building className="w-4 h-4 text-muted-foreground" />{contact.organizations.name}</div>
                  )}
                  {contact.position && (
                    <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-muted-foreground" />{contact.position}</div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{contact.email}</div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{contact.phone}</div>
                  )}
                  {contact.linkedin_url && (
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Linkedin className="w-4 h-4" />LinkedIn
                    </a>
                  )}
                  {contact.email && (
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => setComposeOpen(true)}>
                      <Send className="w-3.5 h-3.5 mr-1" />Enviar email
                    </Button>
                  )}
                </div>
              )}

              {/* Lusha Data Section */}
              {hasLushaData && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />Datos Lusha</Label>
                  <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                    {contact.work_email && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" />Corp: {contact.work_email}</span>
                        <CopyButton value={contact.work_email} />
                      </div>
                    )}
                    {contact.personal_email && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" />Personal: {contact.personal_email}</span>
                        <CopyButton value={contact.personal_email} />
                      </div>
                    )}
                    {contact.mobile_phone && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" />Móvil: {contact.mobile_phone}</span>
                        <CopyButton value={contact.mobile_phone} />
                      </div>
                    )}
                    {contact.work_phone && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-muted-foreground" />Trabajo: {contact.work_phone}</span>
                        <CopyButton value={contact.work_phone} />
                      </div>
                    )}
                    {contact.last_enriched_at && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Enriquecido: {new Date(contact.last_enriched_at).toLocaleString("es-ES")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Enrich Buttons */}
              {lushaStatus === "pending" && (
                <Button onClick={enrichWithLusha} disabled={enriching} className="w-full" variant="outline">
                  {enriching ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando en Lusha...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />🪄 Enriquecer con Lusha</>
                  )}
                </Button>
              )}
              {hunterStatus === "pending" && contact.email && (
                <Button onClick={enrichWithHunter} disabled={enrichingHunter} className="w-full" variant="outline">
                  {enrichingHunter ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando en Hunter.io...</>
                  ) : (
                    <><Globe className="w-4 h-4 mr-2" />🔍 Enriquecer con Hunter.io</>
                  )}
                </Button>
              )}

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Estado del embudo</Label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => updateStatus(value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                        status === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:bg-accent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1"><Tag className="w-3.5 h-3.5" />Etiquetas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(contact.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Nueva etiqueta..." value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} className="h-8 text-sm" />
                  <Button size="sm" variant="outline" onClick={addTag} disabled={!newTag.trim()}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Notas internas</Label>
                <div className="flex gap-2">
                  <Textarea placeholder="Escribe una nota..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="min-h-[60px] text-sm" />
                </div>
                <Button size="sm" onClick={addNote} disabled={!newNote.trim()}><Plus className="w-3.5 h-3.5 mr-1" />Añadir nota</Button>
                <div className="space-y-2 mt-3">
                  {notes.map((n) => (
                    <div key={n.id} className="border rounded-lg p-3 text-sm group">
                      <div className="flex justify-between items-start">
                        <p className="whitespace-pre-wrap flex-1">{n.content}</p>
                        <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive ml-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("es-ES")}</p>
                    </div>
                  ))}
                  {notes.length === 0 && !loadingNotes && <p className="text-xs text-muted-foreground">Sin notas todavía</p>}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ComposeEmail open={composeOpen} onOpenChange={setComposeOpen} defaultTo={contact.email || ""} contactId={contact.id} organizationId={contact.organization_id || undefined} />

      {/* Delete Contact Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará "{contact.full_name}" y todas sus notas permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
