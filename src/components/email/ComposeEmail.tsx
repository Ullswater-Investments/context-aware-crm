import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Send, Loader2, Paperclip, X, Sparkles, ChevronDown, ChevronUp, Settings2, PenLine,
} from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import SignatureManager, { type Signature } from "./SignatureManager";
import AccountStatusDot from "./AccountStatusDot";

type EmailAccountOption = {
  id: string;
  email_address: string;
  display_name: string | null;
  status: string;
  error_message: string | null;
  is_default: boolean;
};

interface ComposeEmailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  defaultCc?: string;
  defaultSubject?: string;
  defaultBody?: string;
  contactId?: string;
  organizationId?: string;
  projectId?: string;
  onSent?: () => void;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const tones = [
  { id: "formal", label: "Formal", icon: "👔" },
  { id: "amigable", label: "Amigable", icon: "👋" },
  { id: "persuasivo", label: "Persuasivo", icon: "🎯" },
  { id: "conciso", label: "Conciso", icon: "⚡" },
];

export default function ComposeEmail({
  open,
  onOpenChange,
  defaultTo = "",
  defaultCc = "",
  defaultSubject = "",
  defaultBody = "",
  contactId,
  organizationId,
  projectId,
  onSent,
}: ComposeEmailProps) {
  const { user } = useAuth();
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>("none");
  const [sigManagerOpen, setSigManagerOpen] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sigPreviewOpen, setSigPreviewOpen] = useState(false);
  const [suggestingReply, setSuggestingReply] = useState(false);
  const [fromAccount, setFromAccount] = useState<string>("");
  const [emailAccounts, setEmailAccounts] = useState<EmailAccountOption[]>([]);

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
      setCc(defaultCc);
      setBcc("");
      setSubject(defaultSubject);
      setBody(defaultBody);
      setAttachments([]);
      setShowCcBcc(!!defaultCc);
      fetchSignatures();
      fetchEmailAccounts();
    }
    onOpenChange(isOpen);
  };

  const fetchEmailAccounts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_accounts")
      .select("id, email_address, display_name, status, error_message, is_default")
      .eq("is_active", true)
      .order("is_default", { ascending: false });
    if (data) {
      const accounts = data as EmailAccountOption[];
      setEmailAccounts(accounts);
      const def = accounts.find(a => a.is_default);
      if (def) setFromAccount(def.id);
      else if (accounts.length > 0) setFromAccount(accounts[0].id);
    }
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

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const handleSuggestReply = async (tone: string) => {
    if (!subject && !body) {
      toast.error("Necesitas un asunto o contenido para generar una sugerencia");
      return;
    }
    setSuggestingReply(true);
    try {
      const bodyText = stripHtml(body);
      const { data, error } = await supabase.functions.invoke("suggest-reply", {
        body: {
          subject,
          body_text: bodyText,
          to_email: to,
          tone,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBody(data.suggestion);
      toast.success("Borrador generado con éxito");
    } catch (err: any) {
      console.error("suggest-reply error:", err);
      toast.error(err?.message || "Error al generar la respuesta");
    } finally {
      setSuggestingReply(false);
    }
  };

  const send = async () => {
    if (!to || !subject || !user) {
      toast.error("Destinatario y asunto son obligatorios");
      return;
    }
    setSending(true);
    try {
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

      let signatureImageUrl: string | null = null;
      if (selectedSignatureId && selectedSignatureId !== "none") {
        const sig = signatures.find((s) => s.id === selectedSignatureId);
        if (sig) {
          const { data: publicData } = supabase.storage
            .from("email-signatures")
            .getPublicUrl(sig.image_path);
          if (publicData?.publicUrl) signatureImageUrl = publicData.publicUrl;
        }
      }

      let htmlBody = `<div style="font-family: sans-serif; line-height: 1.6;">${body}</div>`;
      if (signatureImageUrl) {
        htmlBody += `<br/><div style="margin-top: 16px;"><img src="${signatureImageUrl}" alt="Firma" style="max-width: 400px; height: auto;" /></div>`;
      }

      const plainText = body.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to,
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          subject,
          html: htmlBody,
          text: plainText,
          contact_id: contactId,
          organization_id: organizationId,
          project_id: projectId,
          account_id: fromAccount || undefined,
          attachments: uploadedAttachments.map((a) => ({
            filename: a.file_name,
            path: a.path,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (contactId) {
        const { data: currentContact } = await supabase
          .from("contacts")
          .select("status")
          .eq("id", contactId)
          .single();
        if (currentContact && currentContact.status === "new_lead") {
          await supabase
            .from("contacts")
            .update({ status: "contacted" as const })
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
  const [sigPreviewUrl, setSigPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSig) {
      const { data } = supabase.storage
        .from("email-signatures")
        .getPublicUrl(selectedSig.image_path);
      setSigPreviewUrl(data?.publicUrl || null);
    } else {
      setSigPreviewUrl(null);
    }
  }, [selectedSignatureId, signatures]);

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-[600px] flex flex-col [&>button]:hidden">
          {/* HEADER FIJO */}
          <div className="shrink-0 border-b border-border">
            <SheetHeader className="px-4 py-3">
              <SheetTitle className="text-base">Redactar email</SheetTitle>
            </SheetHeader>

            <div className="px-4 pb-3 space-y-2">
              {/* Para + CC/BCC toggle */}
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-muted-foreground w-10">Para</Label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-8 text-sm"
                />
                {!showCcBcc && (
                  <button
                    onClick={() => setShowCcBcc(true)}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    + CC/BCC
                  </button>
                )}
              </div>

              {/* Enviar desde */}
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-muted-foreground w-10">De</Label>
                <Select value={fromAccount} onValueChange={setFromAccount}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        <span className="flex items-center gap-2">
                          <AccountStatusDot status={acc.status} errorMessage={acc.error_message} />
                          {acc.display_name ? `${acc.display_name} (${acc.email_address})` : acc.email_address}
                        </span>
                      </SelectItem>
                    ))}
                    {emailAccounts.length === 0 && (
                      <SelectItem value="__none" disabled>No hay cuentas configuradas</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* CC/BCC colapsables */}
              {showCcBcc && (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="shrink-0 text-xs text-muted-foreground w-10">CC</Label>
                    <Input
                      type="text"
                      placeholder="email1@ejemplo.com, email2@ejemplo.com"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="shrink-0 text-xs text-muted-foreground w-10">BCC</Label>
                    <Input
                      type="text"
                      placeholder="email1@ejemplo.com, email2@ejemplo.com"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              )}

              {/* Asunto */}
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-xs text-muted-foreground w-10">Asunto</Label>
                <Input
                  placeholder="Asunto del email"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* CUERPO CON SCROLL */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Editor */}
            {user && (
              <RichTextEditor
                content={body}
                onChange={setBody}
                userId={user.id}
                placeholder="Escribe tu mensaje aquí... (puedes pegar imágenes con Ctrl+V)"
              />
            )}

            {/* Firma colapsable */}
            {selectedSig && sigPreviewUrl && (
              <Collapsible open={sigPreviewOpen} onOpenChange={setSigPreviewOpen}>
                <div className="border border-dashed border-border rounded-lg bg-muted/20">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <div className="flex items-center gap-2">
                        <PenLine className="w-3 h-3" />
                        <span className="font-medium uppercase tracking-wide">Firma:</span>
                        <span className="truncate max-w-[200px]">{selectedSig.name}</span>
                      </div>
                      {sigPreviewOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      <div className="opacity-80 scale-95 origin-top-left">
                        <img src={sigPreviewUrl} alt="Firma" className="max-h-24 w-auto" />
                      </div>
                      <button
                        onClick={() => setSigManagerOpen(true)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Settings2 className="w-3 h-3" /> Gestionar firmas
                      </button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Adjuntos */}
            {attachments.length > 0 && (
              <div className="space-y-1">
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

          {/* FOOTER FIJO */}
          <div className="shrink-0 border-t border-border bg-background px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Lado izquierdo: adjuntar + firma */}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer" title="Adjuntar archivos">
                  <Paperclip className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAttachFiles}
                    disabled={attachments.length >= MAX_FILES}
                  />
                </label>
                {attachments.length > 0 && (
                  <span className="text-xs text-muted-foreground">{attachments.length}/{MAX_FILES}</span>
                )}

                <div className="w-px h-4 bg-border mx-1" />

                <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                  <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-none bg-transparent shadow-none px-1">
                    <SelectValue placeholder="Firma" />
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

                <button
                  onClick={() => setSigManagerOpen(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Gestionar firmas"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lado derecho: IA + Enviar */}
              <div className="flex items-center gap-2">
                {/* Selector de tono IA */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={suggestingReply}
                      className="h-8 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {suggestingReply ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span className="ml-1 hidden sm:inline text-xs">
                        {suggestingReply ? "Redactando..." : "IA"}
                      </span>
                      {!suggestingReply && <ChevronDown className="w-3 h-3 ml-0.5" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    {tones.map((tone) => (
                      <DropdownMenuItem
                        key={tone.id}
                        onClick={() => handleSuggestReply(tone.id)}
                        className="cursor-pointer"
                      >
                        <span className="mr-2">{tone.icon}</span>
                        {tone.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Botón Enviar */}
                <Button onClick={send} disabled={sending || !to || !subject} size="sm" className="h-8">
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Enviar
                      <Send className="w-3.5 h-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SignatureManager
        open={sigManagerOpen}
        onOpenChange={setSigManagerOpen}
        onSignaturesChange={fetchSignatures}
      />
    </>
  );
}
