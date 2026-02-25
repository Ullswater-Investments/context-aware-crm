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
import { Send, Bot, User, Loader2, Plus, X, Paperclip, FileText, Image as ImageIcon, UserCheck, Tag, Building2, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
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
      resolve(result.split(",")[1]);
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

interface CreatedContact {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  tags?: string[] | null;
  company?: string | null;
}

// Extract [CONTACT_CREATED:uuid] markers from text and fetch contact data
function extractContactIds(text: string): string[] {
  const matches = text.matchAll(/\[CONTACT_CREATED:([a-f0-9-]+)\]/gi);
  return [...matches].map((m) => m[1]);
}

// Remove markers from display text
function cleanMarkers(text: string): string {
  return text.replace(/\[CONTACT_CREATED:[a-f0-9-]+\]/gi, "").trim();
}

function ContactCard({ contact }: { contact: CreatedContact }) {
  const navigate = useNavigate();
  return (
    <div
      className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4 max-w-sm cursor-pointer hover:bg-primary/10 transition-colors"
      onClick={() => navigate("/contacts")}
    >
      <div className="flex items-center gap-2 mb-2">
        <UserCheck className="w-5 h-5 text-primary" />
        <span className="text-sm font-semibold text-primary">Contacto creado</span>
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-medium">{contact.full_name}</p>
        {contact.email && (
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {contact.email}
          </p>
        )}
        {contact.phone && (
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> {contact.phone}
          </p>
        )}
        {contact.position && (
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> {contact.position}
          </p>
        )}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1">
                <Tag className="w-3 h-3" /> {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [createdContacts, setCreatedContacts] = useState<Record<string, CreatedContact>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch contact data when we detect new CONTACT_CREATED markers
  const fetchCreatedContacts = async (text: string) => {
    const ids = extractContactIds(text);
    for (const id of ids) {
      if (createdContacts[id]) continue;
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, email, phone, position, tags, organizations(name)")
        .eq("id", id)
        .single();
      if (data) {
        setCreatedContacts((prev) => ({
          ...prev,
          [id]: {
            id: data.id,
            full_name: data.full_name,
            email: data.email,
            phone: data.phone,
            position: data.position,
            tags: data.tags,
            company: (data as any).organizations?.name || null,
          },
        }));
      }
    }
  };

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
    if (data) {
      const msgs = data as Msg[];
      setMessages(msgs);
      // Fetch any contact cards from loaded messages
      for (const m of msgs) {
        if (m.role === "assistant") fetchCreatedContacts(m.content);
      }
    }
    setConversationId(convId);
  };

  const newConversation = () => {
    setMessages([]);
    setConversationId(null);
    setAttachedFiles([]);
    setCreatedContacts({});
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
    setAttachedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
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
        attachments.push({ name: file.name, type: file.type || "application/octet-stream", content: `[Archivo binario: ${file.name} (${formatFileSize(file.size)})]` });
      }
    }
    return attachments;
  };

  const uploadFilesToStorage = async (files: File[], convId: string) => {
    for (const file of files) {
      const ts = Date.now();
      // 1. Upload to knowledge bucket (existing)
      const knowledgePath = `${user!.id}/chat/${convId}/${ts}_${file.name}`;
      await supabase.storage.from("knowledge").upload(knowledgePath, file);
      await supabase.from("knowledge_items").insert({
        file_name: file.name,
        file_path: knowledgePath,
        file_type: file.type,
        file_size: file.size,
        source_type: "chat_upload",
        conversation_id: convId,
        created_by: user!.id,
      });

      // 2. Also upload to documents bucket so it appears in Documents section
      const docPath = `${user!.id}/chat_${ts}_${file.name}`;
      await supabase.storage.from("documents").upload(docPath, file);
      await supabase.from("documents").insert({
        name: file.name,
        file_path: docPath,
        file_type: file.type,
        file_size: file.size,
        created_by: user!.id,
        conversation_id: convId,
      } as any);
    }
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || isLoading) return;
    setInput("");
    const filesToSend = [...attachedFiles];
    setAttachedFiles([]);

    const fileNames = filesToSend.map((f) => f.name);
    const displayContent = fileNames.length > 0 ? `${text}\n\n📎 ${fileNames.join(", ")}` : text;

    const userMsg: Msg = { role: "user", content: displayContent };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

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
      if (filesToSend.length > 0) {
        uploadFilesToStorage(filesToSend, convId).catch(console.error);
      }
    }

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
      const aiMsg: Msg = { role: "user", content: text || "Analiza los archivos adjuntos." };
      await streamChat({
        messages: [...messages, aiMsg],
        attachments,
        onDelta: upsertAssistant,
        onDone: async () => {
          setIsLoading(false);
          // Fetch any created contacts from the response
          if (assistantSoFar) {
            fetchCreatedContacts(assistantSoFar);
          }
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
                También puedo crear contactos directamente: solo dime los datos y las etiquetas.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "Guarda a Juan Pérez, email juan@dental.com, sector dental",
                  "¿Qué contactos tengo del sector tech?",
                  "Redáctame un email formal",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
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
                const contactIds = m.role === "assistant" ? extractContactIds(m.content) : [];
                const cleanContent = m.role === "assistant" ? cleanMarkers(m.content) : m.content;

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
                            <ReactMarkdown>{cleanContent}</ReactMarkdown>
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

                    {/* Inline contact cards */}
                    {contactIds.map((cid) => {
                      const contact = createdContacts[cid];
                      return contact ? (
                        <div key={cid} className="ml-11">
                          <ContactCard contact={contact} />
                        </div>
                      ) : null;
                    })}
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
