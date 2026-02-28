import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Mail, Loader2, ChevronLeft, ChevronRight, Forward,
  RefreshCw, ArrowDownLeft, ArrowUpRight, Inbox, Send, Trash2, RotateCcw, XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import ComposeEmail from "@/components/email/ComposeEmail";
import EmailSidebar, {
  type EmailAccount,
  getAccountColor,
  getAccountLabel,
} from "@/components/email/EmailSidebar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type EmailLog = {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  cc_emails: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  contact_id: string | null;
  organization_id: string | null;
  project_id: string | null;
  direction?: string;
  is_trashed?: boolean;
  is_read?: boolean;
};

const PAGE_SIZE = 20;

export default function Emails() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selected, setSelected] = useState<EmailLog | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [resendData, setResendData] = useState<{ to: string; cc: string; subject: string; body: string } | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, { inbox: number; sent: number; trash: number }>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Fetch accounts
  useEffect(() => {
    if (!user) return;
    supabase
      .from("email_accounts")
      .select("id, email_address, display_name")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) {
          setAccounts(data as EmailAccount[]);
          if (!selectedAccountId && data.length > 0) {
            setSelectedAccountId(data[0].id);
          }
        }
      });
  }, [user]);

  const fetchCounts = useCallback(async () => {
    if (!user || accounts.length === 0) return;

    const newCounts: Record<string, { inbox: number; sent: number; trash: number }> = {};
    const newUnread: Record<string, number> = {};

    await Promise.all(
      accounts.map(async (acc) => {
        const [inboxRes, sentRes, unreadRes, trashRes] = await Promise.all([
          supabase
            .from("email_logs")
            .select("*", { count: "exact", head: true })
            .eq("direction", "inbound")
            .eq("is_trashed", false)
            .ilike("to_email", `%${acc.email_address}%`),
          supabase
            .from("email_logs")
            .select("*", { count: "exact", head: true })
            .eq("direction", "outbound")
            .eq("is_trashed", false)
            .ilike("from_email", `%${acc.email_address}%`),
          supabase
            .from("email_logs")
            .select("*", { count: "exact", head: true })
            .eq("direction", "inbound")
            .eq("is_read", false)
            .eq("is_trashed", false)
            .ilike("to_email", `%${acc.email_address}%`),
          supabase
            .from("email_logs")
            .select("*", { count: "exact", head: true })
            .eq("is_trashed", true)
            .or(`to_email.ilike.%${acc.email_address}%,from_email.ilike.%${acc.email_address}%`),
        ]);
        newCounts[acc.id] = {
          inbox: inboxRes.count ?? 0,
          sent: sentRes.count ?? 0,
          trash: trashRes.count ?? 0,
        };
        newUnread[acc.id] = unreadRes.count ?? 0;
      })
    );

    setFolderCounts(newCounts);
    setUnreadCounts(newUnread);
  }, [user, accounts]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const fetchEmails = useCallback(async () => {
    if (!user || !selectedAccountId) return;
    setLoading(true);

    let query = supabase
      .from("email_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const acc = accounts.find((a) => a.id === selectedAccountId);
    if (acc) {
      if (selectedFolder === "trash") {
        query = query
          .eq("is_trashed", true)
          .or(`to_email.ilike.%${acc.email_address}%,from_email.ilike.%${acc.email_address}%`);
      } else if (selectedFolder === "inbox") {
        query = query
          .eq("direction", "inbound")
          .eq("is_trashed", false)
          .ilike("to_email", `%${acc.email_address}%`);
      } else {
        query = query
          .eq("direction", "outbound")
          .eq("is_trashed", false)
          .ilike("from_email", `%${acc.email_address}%`);
      }
    }

    if (search.trim()) {
      const escaped = search.trim().replace(/[%_\\]/g, "\\$&");
      query = query.or(
        `to_email.ilike.%${escaped}%,from_email.ilike.%${escaped}%,subject.ilike.%${escaped}%`
      );
    }

    const { data, count, error } = await query;
    if (!error && data) {
      setEmails(data as EmailLog[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [user, selectedAccountId, selectedFolder, search, page, accounts]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Realtime
  useEffect(() => {
    if (!user || accounts.length === 0) return;
    const channel = supabase
      .channel("email-unread-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "email_logs" }, () => {
        fetchCounts();
        fetchEmails();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, accounts, fetchCounts, fetchEmails]);

  // --- Trash actions ---
  const moveToTrash = async (emailId: string) => {
    const { error } = await supabase
      .from("email_logs")
      .update({ is_trashed: true, trashed_at: new Date().toISOString() })
      .eq("id", emailId);
    if (error) { toast.error("Error al mover a papelera"); return; }
    toast.success("Movido a papelera");
    if (selected?.id === emailId) setSelected(null);
    fetchEmails();
    fetchCounts();
  };

  const restoreFromTrash = async (emailId: string) => {
    const { error } = await supabase
      .from("email_logs")
      .update({ is_trashed: false, trashed_at: null })
      .eq("id", emailId);
    if (error) { toast.error("Error al restaurar"); return; }
    toast.success("Email restaurado");
    if (selected?.id === emailId) setSelected(null);
    fetchEmails();
    fetchCounts();
  };

  const permanentDelete = async (emailId: string) => {
    const { error } = await supabase.from("email_logs").delete().eq("id", emailId);
    if (error) { toast.error("Error al eliminar"); return; }
    toast.success("Email eliminado permanentemente");
    if (selected?.id === emailId) setSelected(null);
    fetchEmails();
    fetchCounts();
  };

  const emptyTrash = async (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const { error } = await supabase
      .from("email_logs")
      .delete()
      .eq("is_trashed", true)
      .or(`to_email.ilike.%${acc.email_address}%,from_email.ilike.%${acc.email_address}%`);
    if (error) { toast.error("Error al vaciar papelera"); return; }
    toast.success("Papelera vaciada");
    setSelected(null);
    fetchEmails();
    fetchCounts();
  };

  const handleSync = async (accountId?: string) => {
    setSyncing(true);
    try {
      const body: Record<string, unknown> = { max_emails: 50 };
      if (accountId) body.account_id = accountId;
      const { data, error } = await supabase.functions.invoke("sync-emails", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "Sincronización completada");
      fetchEmails();
    } catch (err: any) {
      console.error("Sync error:", err);
      toast.error(err?.message || "Error al sincronizar emails");
    } finally {
      setSyncing(false);
    }
  };

  const handleFolderSelect = (accountId: string, folder: string) => {
    setSelectedAccountId(accountId);
    setSelectedFolder(folder);
    setPage(0);
    setSelected(null);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const isTrashFolder = selectedFolder === "trash";

  return (
    <div className="flex h-full">
      <EmailSidebar
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        selectedFolder={selectedFolder}
        folderCounts={folderCounts}
        unreadCounts={unreadCounts}
        syncing={syncing}
        onFolderSelect={handleFolderSelect}
        onCompose={() => setComposeOpen(true)}
        onSync={handleSync}
        onEmptyTrash={emptyTrash}
      />

      {/* Center - email list */}
      <div className={cn("flex-1 flex flex-col min-w-0", selected && "hidden lg:flex")}>
        {/* Mobile controls */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2 md:hidden flex-wrap">
            <Button onClick={() => setComposeOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Redactar
            </Button>
            {accounts.map((acc) => (
              <div key={acc.id} className="flex gap-0.5">
                <button
                  onClick={() => handleFolderSelect(acc.id, "inbox")}
                  className={cn(
                    "text-xs px-2 py-1 rounded-l-md transition-colors",
                    selectedAccountId === acc.id && selectedFolder === "inbox"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {getAccountLabel(acc)} In
                </button>
                <button
                  onClick={() => handleFolderSelect(acc.id, "sent")}
                  className={cn(
                    "text-xs px-2 py-1 transition-colors",
                    selectedAccountId === acc.id && selectedFolder === "sent"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  Sent
                </button>
                <button
                  onClick={() => handleFolderSelect(acc.id, "trash")}
                  className={cn(
                    "text-xs px-2 py-1 rounded-r-md transition-colors",
                    selectedAccountId === acc.id && selectedFolder === "trash"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <Trash2 className="w-3 h-3 inline" />
                </button>
              </div>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por remitente, destinatario o asunto..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Mail className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">
                {isTrashFolder ? "La papelera está vacía" : "No se encontraron emails"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className={cn(
                    "group relative flex items-stretch hover:bg-accent/30 transition-colors",
                    selected?.id === email.id && "bg-accent/50",
                    !isTrashFolder && email.direction === "inbound" && !email.is_read && "bg-primary/5"
                  )}
                >
                  <button
                    onClick={async () => {
                      setSelected(email);
                      if (email.direction === "inbound" && !email.is_read) {
                        await supabase.from("email_logs").update({ is_read: true } as any).eq("id", email.id);
                      }
                    }}
                    className="flex-1 text-left px-4 py-3 min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {email.direction === "inbound" ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      )}
                      <span className={cn("text-sm truncate flex-1", email.direction === "inbound" && !email.is_read ? "font-semibold" : "font-medium")}>
                        {email.direction === "inbound" ? email.from_email : email.to_email}
                      </span>
                      <Badge
                        variant={email.status === "sent" ? "default" : email.status === "received" ? "secondary" : "destructive"}
                        className="text-[10px] shrink-0"
                      >
                        {email.status === "sent" ? "Enviado" : email.status === "received" ? "Recibido" : "Fallido"}
                      </Badge>
                    </div>
                    <p className="text-sm truncate text-foreground/80">{email.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(email.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </button>

                  {/* Hover actions */}
                  <div className="flex items-center gap-1 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isTrashFolder ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); restoreFromTrash(email.id); }}
                          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Restaurar"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Eliminar definitivamente"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Este email se eliminará de forma permanente. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => permanentDelete(email.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); moveToTrash(email.id); }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Mover a papelera"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-sm text-muted-foreground">
            <span>
              {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel - preview */}
      <div className={cn(
        "w-full lg:w-[420px] shrink-0 border-l border-border flex flex-col",
        !selected ? "hidden lg:flex" : "flex"
      )}>
        {selected ? (
          <>
            <div className="p-4 border-b border-border space-y-2">
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground hover:text-foreground lg:hidden mb-2 flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Volver
              </button>
              <h2 className="text-base font-semibold leading-tight">{selected.subject}</h2>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p><span className="font-medium text-foreground">De:</span> {selected.from_email}</p>
                <p><span className="font-medium text-foreground">Para:</span> {selected.to_email}</p>
                {selected.cc_emails && (
                  <p><span className="font-medium text-foreground">CC:</span> {selected.cc_emails}</p>
                )}
                <p>
                  <span className="font-medium text-foreground">Fecha:</span>{" "}
                  {format(new Date(selected.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={selected.status === "sent" ? "default" : "destructive"}>
                  {selected.status === "sent" ? "Enviado" : "Fallido"}
                </Badge>

                {selected.is_trashed ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => restoreFromTrash(selected.id)}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Restaurar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Este email se eliminará de forma permanente. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => permanentDelete(selected.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const reSubject = selected.subject.startsWith("Re:")
                          ? selected.subject
                          : `Re: ${selected.subject}`;
                        const quotedBody = `<br/><br/><blockquote style="border-left: 2px solid #ccc; padding-left: 12px; color: #666;">${selected.body_html || selected.body_text || ""}</blockquote>`;
                        setResendData({
                          to: selected.from_email,
                          cc: "",
                          subject: reSubject,
                          body: quotedBody,
                        });
                        setComposeOpen(true);
                      }}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
                      Responder
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResendData({
                          to: selected.to_email,
                          cc: selected.cc_emails || "",
                          subject: selected.subject,
                          body: selected.body_html || selected.body_text || "",
                        });
                        setComposeOpen(true);
                      }}
                    >
                      <Forward className="w-3.5 h-3.5 mr-1" />
                      Reenviar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => moveToTrash(selected.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Borrar
                    </Button>
                  </>
                )}
              </div>
              {selected.error_message && (
                <p className="text-xs text-destructive mt-1">{selected.error_message}</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selected.body_html ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selected.body_html }}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap text-foreground/80">
                  {selected.body_text || "(Sin contenido)"}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Mail className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Selecciona un email para ver los detalles</p>
          </div>
        )}
      </div>

      {/* Compose dialog */}
      <ComposeEmail
        open={composeOpen}
        onOpenChange={(open) => {
          setComposeOpen(open);
          if (!open) setResendData(null);
        }}
        defaultTo={resendData?.to}
        defaultCc={resendData?.cc}
        defaultSubject={resendData?.subject}
        defaultBody={resendData?.body}
        onSent={() => { fetchEmails(); }}
      />
    </div>
  );
}
