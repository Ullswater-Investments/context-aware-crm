import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

interface ComposeEmailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string;
  contactId?: string;
  organizationId?: string;
  projectId?: string;
  onSent?: () => void;
}

export default function ComposeEmail({
  open,
  onOpenChange,
  defaultTo = "",
  contactId,
  organizationId,
  projectId,
  onSent,
}: ComposeEmailProps) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Reset form when dialog opens with new defaults
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTo(defaultTo);
      setSubject("");
      setBody("");
    }
    onOpenChange(isOpen);
  };

  const send = async () => {
    if (!to || !subject) {
      toast.error("Destinatario y asunto son obligatorios");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to,
          subject,
          html: `<div style="font-family: sans-serif; line-height: 1.6;">${body.replace(/\n/g, "<br/>")}</div>`,
          text: body,
          contact_id: contactId,
          organization_id: organizationId,
          project_id: projectId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update contact status to "contacted" if applicable
      if (contactId) {
        const { data: currentContact } = await supabase
          .from("contacts")
          .select("status")
          .eq("id", contactId)
          .single();
        
        // Only update if status is "new_lead" (don't downgrade more advanced statuses)
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

  return (
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
              className="min-h-[180px]"
            />
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
  );
}
