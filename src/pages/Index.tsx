import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { streamChat, type ChatAttachment } from "@/lib/chat-stream";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Send, Bot, User, Loader2, Plus, UserPlus, X, Paperclip, FileText, Image as ImageIcon } from "lucide-react";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TEXT_TYPES = ["text/plain", "text/csv", "text/markdown", "application/json", "application/xml", "text/xml"];

function isImageFile(file: File) {
  return IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
}

function isTextFile(file: File) {
  return TEXT_TYPES.includes(file.type) || /\.(txt|csv|json|xml|md|yaml|yml|log)$/i.test(file.name);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

type Msg = { role: "user" | "assistant"; content: string };

interface DetectedContact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface PendingContact extends DetectedContact {
  messageIndex: number;
  status: "pending" | "saved" | "skipped";
}

// Extract emails and phones from text
function extractContactInfo(text: string): DetectedContact | null {
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,4}[\s.-]?)?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}/);
  
  // Try to extract name: look for patterns like "nombre: X", "se llama X", or capitalized words near email
  let name: string | null = null;
  const namePatterns = [
    /(?:se\s+llama|nombre(?:\s+es)?|contacto(?:\s+es)?)[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]+){0,3})/i,
    /([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})(?=\s*[,.]?\s*(?:su\s+email|email|correo|teléfono|tel))/i,
  ];
  for (const pattern of namePatterns) {
    const m = text.match(pattern);
    if (m?.[1]) { name = m[1].trim(); break; }
  }

  if (!emailMatch && !phoneMatch) return null;

  const email = emailMatch?.[0] || null;
  const phone = phoneMatch?.[0]?.trim() || null;
  
  // Filter out very short phone matches that are likely not phones
  const validPhone = phone && phone.replace(/\D/g, "").length >= 7 ? phone : null;

  if (!email && !validPhone) return null;

  return { name, email, phone: validPhone };
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [pendingContacts, setPendingContacts] = useState<PendingContact[]>([]);
  const [savingContact, setSavingContact] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingContacts]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20);
    if (data) setConversations(data);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Msg[]);
    setConversationId(convId);
    setPendingContacts([]);
  };

  const newConversation = () => {
    setMessages([]);
    setConversationId(null);
    setPendingContacts([]);
    setAttachedFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const totalAfter = attachedFiles.length + files.length;
    if (totalAfter > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos. Ya tienes ${attachedFiles.length}.`);
      return;
    }
    
    const validFiles: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" excede 20MB`);
        continue;
      }
      validFiles.push(f);
    }
    
    setAttachedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processAttachments = async (files: File[]): Promise<ChatAttachment[]> => {
    const attachments: ChatAttachment[] = [];
    for (const file of files) {
      if (isImageFile(file)) {
        const base64 = await readFileAsBase64(file);
        attachments.push({ name: file.name, type: file.type || "image/png", content: base64 });
      } else if (isTextFile(file)) {
        const text = await readFileAsText(file);
        attachments.push({ name: file.name, type: file.type || "text/plain", content: text });
      } else {
        // For PDFs and other binary files, just reference by name
        attachments.push({ name: file.name, type: file.type || "application/octet-stream", content: `[Archivo binario: ${file.name} (${formatFileSize(file.size)})]` });
      }
    }
    return attachments;
  };

  const uploadFilesToStorage = async (files: File[], convId: string) => {
    for (const file of files) {
      const path = `${user!.id}/chat/${convId}/${Date.now()}_${file.name}`;
      await supabase.storage.from("knowledge").upload(path, file);
      await supabase.from("knowledge_items").insert({
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
        source_type: "chat_upload",
        conversation_id: convId,
        created_by: user!.id,
      });
    }
  };

  // Check if contact already exists by email or phone
  const checkExistingContact = async (info: DetectedContact): Promise<boolean> => {
    if (info.email) {
      const { data } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", info.email)
        .limit(1);
      if (data && data.length > 0) return true;
    }
    if (info.phone) {
      const { data } = await supabase
        .from("contacts")
        .select("id")
        .eq("phone", info.phone)
        .limit(1);
      if (data && data.length > 0) return true;
    }
    return false;
  };

  const saveDetectedContact = async (pending: PendingContact) => {
    setSavingContact(true);
    try {
      const { error } = await supabase.from("contacts").insert({
        full_name: pending.name || pending.email || "Sin nombre",
        email: pending.email,
        phone: pending.phone,
        created_by: user!.id,
      });
      if (error) throw error;
      
      setPendingContacts((prev) =>
        prev.map((p) => p.messageIndex === pending.messageIndex ? { ...p, status: "saved" } : p)
      );
      toast.success(`Contacto "${pending.name || pending.email}" guardado correctamente`);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar contacto");
    } finally {
      setSavingContact(false);
    }
  };

  const skipContact = (messageIndex: number) => {
    setPendingContacts((prev) =>
      prev.map((p) => p.messageIndex === messageIndex ? { ...p, status: "skipped" } : p)
    );
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || isLoading) return;
    setInput("");
    const filesToSend = [...attachedFiles];
    setAttachedFiles([]);

    // Build display content with file names
    const fileNames = filesToSend.map(f => f.name);
    const displayContent = fileNames.length > 0
      ? `${text}\n\n📎 ${fileNames.join(", ")}`
      : text;

    const userMsg: Msg = { role: "user", content: displayContent };
    const currentMsgIndex = messages.length;
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const contactInfo = extractContactInfo(text);

    let convId = conversationId;
    if (!convId) {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user!.id, title: text.slice(0, 60) || fileNames[0] || "Archivos" })
        .select("id")
        .single();
      if (data) {
        convId = data.id;
        setConversationId(convId);
        loadConversations();
      }
    }

    if (convId) {
      await supabase.from("chat_messages").insert({
        conversation_id: convId,
        role: "user",
        content: displayContent,
      });

      // Upload files to storage in background
      if (filesToSend.length > 0) {
        uploadFilesToStorage(filesToSend, convId).catch(console.error);
      }
    }

    if (contactInfo) {
      checkExistingContact(contactInfo).then((exists) => {
        if (!exists) {
          setPendingContacts((prev) => [
            ...prev,
            { ...contactInfo, messageIndex: currentMsgIndex + 1, status: "pending" },
          ]);
        }
      });
    }

    // Process file attachments for the AI
    let attachments: ChatAttachment[] | undefined;
    if (filesToSend.length > 0) {
      try {
        attachments = await processAttachments(filesToSend);
      } catch (err) {
        console.error("Error processing attachments:", err);
        toast.error("Error al procesar archivos adjuntos");
      }
    }

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      // Send text-only content to the AI (without the file badge line)
      const aiMsg: Msg = { role: "user", content: text || "Analiza los archivos adjuntos." };
      await streamChat({
        messages: [...messages, aiMsg],
        attachments,
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsLoading(false);
          if (convId && assistantSoFar) {
            await supabase.from("chat_messages").insert({
              conversation_id: convId,
              role: "assistant",
              content: assistantSoFar,
            });
          }
        },
      });
    } catch (e: any) {
      toast.error(e.message || "Error del asistente IA");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const getPendingForIndex = (index: number) =>
    pendingContacts.find((p) => p.messageIndex === index);

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-muted/30">
        <div className="p-3">
          <Button variant="outline" size="sm" className="w-full" onClick={newConversation}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva conversación
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => loadMessages(c.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                  conversationId === c.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-lg">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold">Asistente IA EuroCRM</h2>
              <p className="text-muted-foreground leading-relaxed">
                Pregúntame sobre tus contactos, proyectos europeos, o pídeme que redacte emails.
                Puedo ayudarte a gestionar tu base de conocimiento.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "¿Qué proyectos tenemos activos?",
                  "Redáctame un email formal",
                  "Resumen de contactos recientes",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); }}
                    className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((m, i) => {
                const pending = getPendingForIndex(i);
                return (
                  <div key={i}>
                    <div className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                      {m.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          m.content
                        )}
                      </div>
                      {m.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                          <User className="w-4 h-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Contact detection banner */}
                    {pending && pending.status === "pending" && (
                      <div className="ml-11 mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4 max-w-[80%]">
                        <div className="flex items-start gap-3">
                          <UserPlus className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div className="space-y-2 flex-1">
                            <p className="text-sm font-medium">
                              He identificado que este usuario no está guardado en contactos. ¿Quieres que guarde este nuevo contacto?
                            </p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                              {pending.name && <p>Nombre: {pending.name}</p>}
                              {pending.email && <p>Email: {pending.email}</p>}
                              {pending.phone && <p>Tel: {pending.phone}</p>}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveDetectedContact(pending)}
                                disabled={savingContact}
                              >
                                {savingContact ? (
                                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                ) : (
                                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                                )}
                                Sí, guardar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => skipContact(pending.messageIndex)}
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                No, continuar sin guardar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {pending && pending.status === "saved" && (
                      <div className="ml-11 mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 max-w-[80%]">
                        <p className="text-sm text-primary flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          Contacto guardado correctamente ✓
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="border-t border-border px-4 pt-3 bg-background">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {attachedFiles.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1.5 pr-1 py-1">
                  {isImageFile(f) ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                  <span className="max-w-[120px] truncate text-xs">{f.name}</span>
                  <span className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</span>
                  <button onClick={() => removeFile(i)} className="ml-0.5 p-0.5 rounded hover:bg-muted">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border p-4 bg-background">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.csv,.json,.xml,.md,.yaml,.yml,.log,.docx,.xlsx,.pptx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || attachedFiles.length >= MAX_FILES}
              title={`Adjuntar archivos (${attachedFiles.length}/${MAX_FILES})`}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={attachedFiles.length > 0 ? "Describe qué quieres hacer con los archivos..." : "Escribe tu mensaje..."}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
            />
            <Button onClick={send} disabled={isLoading || (!input.trim() && attachedFiles.length === 0)} size="icon" className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
