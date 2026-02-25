import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Mail, Loader2, ChevronLeft, ChevronRight, Forward,
  RefreshCw, ArrowDownLeft, ArrowUpRight, Inbox, Send, LayoutGrid,
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
};

const PAGE_SIZE = 20;

export default function Emails() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selected, setSelected] = useState<EmailLog | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [resendData, setResendData] = useState<{ to: string; cc: string; subject: string; body: string } | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [folderCounts, setFolderCounts] = useState<Record<string, { inbox: number; sent: number }>>({});
  const [unifiedCount, setUnifiedCount] = useState(0);

  // Fetch accounts
  useEffect(() => {
    if (!user) return;
    supabase
      .from("email_accounts")
      .select("id, email_address, display_name")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setAccounts(data as EmailAccount[]);
      });
  }, [user]);

  // Fetch folder counts when accounts change
  useEffect(() => {
    if (!user || accounts.length === 0) return;

    const fetchCounts = async () => {
      const newCounts: Record<string, { inbox: number; sent: number }> = {};
      let totalInbox = 0;

      await Promise.all(
        accounts.map(async (acc) => {
          const [inboxRes, sentRes] = await Promise.all([
            supabase
              .from("email_logs")
              .select("*", { count: "exact", head: true })
              .eq("direction", "inbound")
              .ilike("to_email", `%${acc.email_address}%`),
            supabase
              .from("email_logs")
              .select("*", { count: "exact", head: true })
              .eq("direction", "outbound")
              .ilike("from_email", `%${acc.email_address}%`),
          ]);
          const inbox = inboxRes.count ?? 0;
          const sent = sentRes.count ?? 0;
          newCounts[acc.id] = { inbox, sent };
          totalInbox += inbox;
        })
      );

      setFolderCounts(newCounts);
      setUnifiedCount(totalInbox);
    };

    fetchCounts();
  }, [user, accounts]);

  const fetchEmails = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("email_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (selectedAccountId === "all") {
      // Unified inbox: all inbound
      query = query.eq("direction", "inbound");
    } else {
      // Specific account
      const acc = accounts.find((a) => a.id === selectedAccountId);
      if (acc) {
        if (selectedFolder === "inbox") {
          query = query
            .eq("direction", "inbound")
            .ilike("to_email", `%${acc.email_address}%`);
        } else {
          query = query
            .eq("direction", "outbound")
            .ilike("from_email", `%${acc.email_address}%`);
        }
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

  // Identify which account an email belongs to
  const getEmailAccountIndex = (email: EmailLog): number => {
    return accounts.findIndex((acc) => {
      if (email.direction === "inbound") {
        return email.to_email?.toLowerCase().includes(acc.email_address.toLowerCase());
      }
      return email.from_email?.toLowerCase().includes(acc.email_address.toLowerCase());
    });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Mobile folder label
  const getMobileFolderLabel = () => {
    if (selectedAccountId === "all") return "Unificada";
    const acc = accounts.find((a) => a.id === selectedAccountId);
    const label = acc ? getAccountLabel(acc) : "";
    return `${label} · ${selectedFolder === "inbox" ? "Inbox" : "Sent"}`;
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <EmailSidebar
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        selectedFolder={selectedFolder}
        folderCounts={folderCounts}
        unifiedCount={unifiedCount}
        syncing={syncing}
        onFolderSelect={handleFolderSelect}
        onCompose={() => setComposeOpen(true)}
        onSync={handleSync}
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
            <button
              onClick={() => handleFolderSelect("all", "inbox")}
              className={cn(
                "text-xs px-2 py-1 rounded-md transition-colors",
                selectedAccountId === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              Unificada ({unifiedCount})
            </button>
            {accounts.map((acc, idx) => (
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
                    "text-xs px-2 py-1 rounded-r-md transition-colors",
                    selectedAccountId === acc.id && selectedFolder === "sent"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  Sent
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
              <p className="text-sm">No se encontraron emails</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {emails.map((email) => {
                const accIdx = getEmailAccountIndex(email);
                const isUnified = selectedAccountId === "all";

                return (
                  <button
                    key={email.id}
                    onClick={() => setSelected(email)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors",
                      selected?.id === email.id && "bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {email.direction === "inbound" ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      )}
                      {/* Account badge in unified view */}
                      {isUnified && accIdx >= 0 && (
                        <span
                          className={cn(
                            "text-[10px] font-bold text-white px-1.5 py-0.5 rounded shrink-0",
                            getAccountColor(accIdx)
                          )}
                        >
                          {getAccountLabel(accounts[accIdx])}
                        </span>
                      )}
                      <span className="text-sm font-medium truncate flex-1">
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
                );
              })}
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
