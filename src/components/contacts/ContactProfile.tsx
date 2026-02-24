import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Mail, Phone, Briefcase, Building, Plus, Trash2, Send, Tag, X } from "lucide-react";
import ComposeEmail from "@/components/email/ComposeEmail";

const STATUS_LABELS: Record<string, string> = {
  new_lead: "Nuevo Lead",
  contacted: "Contactado",
  proposal_sent: "Propuesta Enviada",
  client: "Cliente",
  lost: "Perdido",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

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

export default function ContactProfile({ contact, open, onOpenChange, onUpdate }: ContactProfileProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [status, setStatus] = useState(contact?.status || "new_lead");
  const [composeOpen, setComposeOpen] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

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

  // Load notes when contact changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && contact) {
      setStatus(contact.status);
      loadNotes(contact.id);
    }
    onOpenChange(isOpen);
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
    const { error } = await supabase
      .from("contacts")
      .update({ tags: updatedTags })
      .eq("id", contact.id);
    if (error) toast.error(error.message);
    else { setNewTag(""); onUpdate(); }
  };

  const removeTag = async (tag: string) => {
    if (!contact) return;
    const updatedTags = (contact.tags || []).filter((t) => t !== tag);
    const { error } = await supabase
      .from("contacts")
      .update({ tags: updatedTags })
      .eq("id", contact.id);
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
    else {
      setNewNote("");
      loadNotes(contact.id);
      toast.success("Nota guardada");
    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from("contact_notes").delete().eq("id", noteId);
    if (error) toast.error(error.message);
    else if (contact) loadNotes(contact.id);
  };

  if (!contact) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">{contact.full_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Contact Info */}
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
                {contact.email && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setComposeOpen(true)}>
                    <Send className="w-3.5 h-3.5 mr-1" />Enviar email
                  </Button>
                )}
              </div>

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
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nueva etiqueta..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={addTag} disabled={!newTag.trim()}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Notas internas</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escribe una nota..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>
                <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Añadir nota
                </Button>
                <div className="space-y-2 mt-3">
                  {notes.map((n) => (
                    <div key={n.id} className="border rounded-lg p-3 text-sm group">
                      <div className="flex justify-between items-start">
                        <p className="whitespace-pre-wrap flex-1">{n.content}</p>
                        <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive ml-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString("es-ES")}
                      </p>
                    </div>
                  ))}
                  {notes.length === 0 && !loadingNotes && (
                    <p className="text-xs text-muted-foreground">Sin notas todavía</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ComposeEmail
        open={composeOpen}
        onOpenChange={setComposeOpen}
        defaultTo={contact.email || ""}
        contactId={contact.id}
        organizationId={contact.organization_id || undefined}
      />
    </>
  );
}
