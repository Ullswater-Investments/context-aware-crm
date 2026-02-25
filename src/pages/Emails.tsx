import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Mail, MailCheck, MailX, Inbox,
  Loader2, ChevronLeft, ChevronRight, Forward
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import ComposeEmail from "@/components/email/ComposeEmail";

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
};

type StatusFilter = "all" | "sent" | "failed";

const PAGE_SIZE = 20;

export default function Emails() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<EmailLog | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [resendData, setResendData] = useState<{ to: string; cc: string; subject: string; body: string } | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [counts, setCounts] = useState({ all: 0, sent: 0, failed: 0 });

  const fetchEmails = async () => {
    if (!user) return;
    setLoading(true);

    // Count queries (lightweight, head-only)
    const [allRes, sentRes, failedRes] = await Promise.all([
      supabase.from("email_logs").select("*", { count: "exact", head: true }),
      supabase.from("email_logs").select("*", { count: "exact", head: true }).eq("status", "sent"),
      supabase.from("email_logs").select("*", { count: "exact", head: true }).eq("status", "failed"),
    ]);
    setCounts({
      all: allRes.count ?? 0,
      sent: sentRes.count ?? 0,
      failed: failedRes.count ?? 0,
    });

    // Main query
    let query = supabase
      .from("email_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (search.trim()) {
      const escaped = search.trim().replace(/[%_\\]/g, '\\$&');
      query = query.or(
        `to_email.ilike.%${escaped}%,subject.ilike.%${escaped}%`
      );
    }

    const { data, count, error } = await query;
    if (!error && data) {
      setEmails(data as EmailLog[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmails();
  }, [user, statusFilter, search, page]);

  const filters: { key: StatusFilter; label: string; icon: React.ElementType; count: number }[] = [
    { key: "all", label: "Todos", icon: Inbox, count: counts.all },
    { key: "sent", label: "Enviados", icon: MailCheck, count: counts.sent },
    { key: "failed", label: "Fallidos", icon: MailX, count: counts.failed },
  ];

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex h-full">
      {/* Left sidebar - filters */}
      <div className="w-56 shrink-0 border-r border-border p-4 space-y-4 hidden md:block">
        <Button onClick={() => setComposeOpen(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Redactar
        </Button>

        <div className="space-y-1 pt-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Filtros
          </p>
          {filters.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(0); setSelected(null); }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                statusFilter === key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className="ml-auto text-xs opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Center - email list */}
      <div className={cn("flex-1 flex flex-col min-w-0", selected && "hidden lg:flex")}>
        {/* Mobile compose + search bar */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2 md:hidden">
            <Button onClick={() => setComposeOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Redactar
            </Button>
            {filters.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => { setStatusFilter(key); setPage(0); }}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  statusFilter === key ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por destinatario o asunto..."
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
              {emails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelected(email)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors",
                    selected?.id === email.id && "bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate flex-1">
                      {email.to_email}
                    </span>
                    <Badge
                      variant={email.status === "sent" ? "default" : "destructive"}
                      className="text-[10px] shrink-0"
                    >
                      {email.status === "sent" ? "Enviado" : "Fallido"}
                    </Badge>
                  </div>
                  <p className="text-sm truncate text-foreground/80">{email.subject}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(email.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                  </p>
                </button>
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
                <p><span className="font-medium text-foreground">Para:</span> {selected.to_email}</p>
                {selected.cc_emails && (
                  <p><span className="font-medium text-foreground">CC:</span> {selected.cc_emails}</p>
                )}
                <p><span className="font-medium text-foreground">De:</span> {selected.from_email}</p>
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
