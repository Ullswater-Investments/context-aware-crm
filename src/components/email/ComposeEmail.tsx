import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Loader2, Paperclip, X, Settings2 } from "lucide-react";
import SignatureManager, { type Signature } from "./SignatureManager";

interface ComposeEmailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  contactId?: string;
  organizationId?: string;
  projectId?: string;
  onSent?: () => void;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ComposeEmail({
  open,
  onOpenChange,
  defaultTo = "",
  contactId,
  organizationId,
  projectId,
  onSent,
}: ComposeEmailProps) {
  const { user } = useAuth();
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>("none");
  const [sigManagerOpen, setSigManagerOpen] = useState(false);

  const fetchSignatures = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_signatures")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      const sigs = data as Signature[];
      setSignatures(sigs);
      const def = sigs.find((s) => s.is_default);
      if (def) setSelectedSignatureId(def.id);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTo(defaultTo);
      setSubject("");
      setBody("");
      setAttachments([]);
      fetchSignatures();
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (open) fetchSignatures();
  }, [open, user]);

  const handleAttachFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_FILES - attachments.length;
    if (files.length > remaining) {
      toast.error(`Máximo ${MAX_FILES} archivos adjuntos`);
    }
    const valid = files.slice(0, remaining).filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} supera el límite de 10MB`);
        return false;
      }
      return true;
    });
    setAttachments((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    if (!to || !subject || !user) {
      toast.error("Destinatario y asunto son obligatorios");
      return;
    }
    setSending(true);
    try {
      // Upload attachments to storage
      const uploadedAttachments: { file_name: string; path: string; file_size: number; file_type: string }[] = [];
      const timestamp = Date.now();
      for (const file of attachments) {
        const ext = file.name.split(".").pop();
        const safeName = `${timestamp}_${Math.random().toString(36).slice(2)}.${ext}`;
        const storagePath = `${user.id}/${safeName}`;
        const { error } = await supabase.storage
          .from("email-attachments")
          .upload(storagePath, file);
        if (error) throw new Error(`Error subiendo ${file.name}: ${error.message}`);
        uploadedAttachments.push({
          file_name: file.name,
          path: storagePath,
          file_size: file.size,
          file_type: file.type,
        });
      }

      // Build signature URL
      let signatureImageUrl: string | null = null;
      if (selectedSignatureId && selectedSignatureId !== "none") {
        const sig = signatures.find((s) => s.id === selectedSignatureId);
        if (sig) {
          signatureImageUrl = supabase.storage
            .from("email-signatures")
            .getPublicUrl(sig.image_path).data.publicUrl;
        }
      }

      // Build HTML with signature
      let htmlBody = `<div style="font-family: sans-serif; line-height: 1.6;">${body.replace(/\n/g, "<br/>")}</div>`;
      if (signatureImageUrl) {
        htmlBody += `<br/><div style="margin-top: 16px;"><img src="${signatureImageUrl}" alt="Firma" style="max-width: 400px; height: auto;" /></div>`;
      }

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to,
          subject,
          html: htmlBody,
          text: body,
          contact_id: contactId,
          organization_id: organizationId,
          project_id: projectId,
          attachments: uploadedAttachments.map((a) => ({
            filename: a.file_name,
            path: a.path,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update contact status if applicable
      if (contactId) {
        const { data: currentContact } = await supabase
          .from("contacts")
          .select("status")
          .eq("id", contactId)
          .single();
        if (currentContact && currentContact.status === "new_lead") {
          await supabase
            .from("contacts")
            .update({ status: "contacted" } as any)
            .eq("id", contactId);
        }
      }

      toast.success("Email enviado correctamente");
      handleOpenChange(false);
      onSent?.();
    } catch (e: any) {
      console.error("Send email error:", e);
      toast.error(e.message || "Error al enviar el email");
    } finally {
      setSending(false);
    }
  };

  const selectedSig = signatures.find((s) => s.id === selectedSignatureId);
  const sigPreviewUrl = selectedSig
    ? supabase.storage.from("email-signatures").getPublicUrl(selectedSig.image_path).data.publicUrl
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Redactar email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Para *</Label>
              <Input
                type="email"
                placeholder="email@ejemplo.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <Label>Asunto *</Label>
              <Input
                placeholder="Asunto del email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <Label>Mensaje</Label>
              <Textarea
                placeholder="Escribe tu mensaje aquí..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[140px]"
              />
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="mb-0">Adjuntos</Label>
                <span className="text-xs text-muted-foreground">({attachments.length}/{MAX_FILES})</span>
              </div>
              <label className="inline-flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline">
                <Paperclip className="w-4 h-4" />
                Adjuntar archivos
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachFiles}
                  disabled={attachments.length >= MAX_FILES}
                />
              </label>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-2 py-1">
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(f.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                      <button onClick={() => removeAttachment(i)} className="text-destructive hover:text-destructive/80">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Signature selector */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label className="mb-0">Firma</Label>
                <button
                  onClick={() => setSigManagerOpen(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Settings2 className="w-3 h-3" /> Gestionar
                </button>
              </div>
              <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin firma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin firma</SelectItem>
                  {signatures.map((sig) => (
                    <SelectItem key={sig.id} value={sig.id}>
                      {sig.name}{sig.is_default ? " ⭐" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sigPreviewUrl && (
                <div className="mt-2 border border-border rounded-md p-2 bg-muted/30">
                  <img src={sigPreviewUrl} alt="Firma" className="max-h-16 mx-auto" />
                </div>
              )}
            </div>

            <Button onClick={send} disabled={sending || !to || !subject} className="w-full">
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Enviar email</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SignatureManager
        open={sigManagerOpen}
        onOpenChange={setSigManagerOpen}
        onSignaturesChange={fetchSignatures}
      />
    </>
  );
}
