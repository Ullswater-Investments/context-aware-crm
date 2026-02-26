import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, Loader2, Check, CheckCheck, Clock, MessageSquare } from "lucide-react";
import { Contact } from "@/types/contact";

interface WhatsAppMessage {
  id: string;
  contact_id: string | null;
  phone_number: string;
  direction: string;
  content: string;
  status: string;
  whapi_message_id: string | null;
  created_by: string | null;
  created_at: string;
}

interface WhatsAppChatProps {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VARIABLE_OPTIONS = [
  { label: "Nombre", value: "{{first_name}}" },
  { label: "Apellido", value: "{{last_name}}" },
  { label: "Nombre completo", value: "{{full_name}}" },
  { label: "Empresa", value: "{{company}}" },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return <Check className="w-3 h-3 text-muted-foreground" />;
    case "delivered":
      return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    case "read":
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case "failed":
      return <span className="text-[10px] text-destructive">Error</span>;
    default:
      return <Clock className="w-3 h-3 text-muted-foreground" />;
  }
}

export default function WhatsAppChat({ contact, open, onOpenChange }: WhatsAppChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const phone = contact.phone || contact.mobile_phone || contact.work_phone || "";

  const loadMessages = useCallback(async () => {
    if (!contact.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as WhatsAppMessage[]) || []);
    setLoading(false);
  }, [contact.id]);

  useEffect(() => {
    if (open && contact.id) {
      loadMessages();
    }
  }, [open, contact.id, loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!open || !contact.id) return;

    const channel = supabase
      .channel(`whatsapp-${contact.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `contact_id=eq.${contact.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === (payload.new as WhatsAppMessage).id);
            if (exists) return prev;
            return [...prev, payload.new as WhatsAppMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, contact.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !phone) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          contact_id: contact.id,
          phone,
          message: newMessage,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNewMessage("");
      toast.success("Mensaje enviado por WhatsApp");
      // Reload to catch the new message if realtime doesn't fire immediately
      loadMessages();
    } catch (err: any) {
      toast.error(err.message || "Error al enviar mensaje");
    } finally {
      setSending(false);
    }
  };

  const insertVariable = (variable: string) => {
    setNewMessage((prev) => prev + variable);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: WhatsAppMessage[] }[] = [];
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ date, messages: [msg] });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b bg-[#075e54] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              {contact.full_name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-white text-base truncate">{contact.full_name}</SheetTitle>
              <p className="text-xs text-white/70 truncate">{phone || "Sin teléfono"}</p>
            </div>
          </div>
        </SheetHeader>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 py-2 space-y-1"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5ddd5' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            backgroundColor: "hsl(var(--background))",
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <MessageSquare className="w-10 h-10" />
              <p className="text-sm">No hay mensajes aún</p>
              {phone ? (
                <p className="text-xs">Envía el primer mensaje a {contact.full_name}</p>
              ) : (
                <p className="text-xs text-destructive">Este contacto no tiene teléfono</p>
              )}
            </div>
          ) : (
            groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex justify-center my-2">
                  <span className="text-[11px] bg-muted/80 text-muted-foreground px-3 py-0.5 rounded-full">
                    {group.date}
                  </span>
                </div>
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex mb-1 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm shadow-sm ${
                        msg.direction === "outbound"
                          ? "bg-[#dcf8c6] dark:bg-green-900/40 text-foreground rounded-tr-none"
                          : "bg-card text-foreground rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                        {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Variables bar */}
        <div className="px-3 py-1 border-t flex gap-1 flex-wrap">
          {VARIABLE_OPTIONS.map((v) => (
            <Badge
              key={v.value}
              variant="outline"
              className="cursor-pointer text-[10px] hover:bg-muted"
              onClick={() => insertVariable(v.value)}
            >
              {v.label}
            </Badge>
          ))}
        </div>

        {/* Input area */}
        <div className="px-3 py-2 border-t flex gap-2 items-end">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={phone ? "Escribe un mensaje..." : "Sin teléfono disponible"}
            disabled={!phone || sending}
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!newMessage.trim() || !phone || sending}
            className="bg-[#25d366] hover:bg-[#1da851] text-white shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
