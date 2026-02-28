import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Plus, Inbox, Send, RefreshCw, Loader2, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type EmailAccount = {
  id: string;
  email_address: string;
  display_name: string | null;
};

type FolderCounts = {
  [accountId: string]: { inbox: number; sent: number; trash: number };
};

type UnreadCounts = {
  [accountId: string]: number;
};

interface EmailSidebarProps {
  accounts: EmailAccount[];
  selectedAccountId: string;
  selectedFolder: string;
  folderCounts: FolderCounts;
  unreadCounts: UnreadCounts;
  syncing: boolean;
  onFolderSelect: (accountId: string, folder: string) => void;
  onCompose: () => void;
  onSync: (accountId?: string) => void;
  onEmptyTrash?: (accountId: string) => void;
}

const ACCOUNT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
];

export function getAccountColor(index: number) {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

export function getAccountLabel(account: EmailAccount): string {
  if (account.display_name) {
    return account.display_name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);
  }
  const local = account.email_address.split("@")[1]?.split(".")[0] || "";
  return local.slice(0, 4).toUpperCase();
}

export default function EmailSidebar({
  accounts,
  selectedAccountId,
  selectedFolder,
  folderCounts,
  unreadCounts,
  syncing,
  onFolderSelect,
  onCompose,
  onSync,
  onEmptyTrash,
}: EmailSidebarProps) {
  return (
    <div className="w-56 shrink-0 border-r border-border p-4 space-y-4 hidden md:flex flex-col">
      <Button onClick={onCompose} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Redactar
      </Button>

      {accounts.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={syncing} className="w-full">
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sincronizar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {accounts.map((acc) => (
              <DropdownMenuItem key={acc.id} onClick={() => onSync(acc.id)}>
                {acc.display_name || acc.email_address}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          onClick={() => toast.info("Configura una cuenta de email en Ajustes Email para sincronizar.")}
          disabled={syncing}
          className="w-full"
        >
          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Sincronizar
        </Button>
      )}

      {/* Per-account folders */}
      {accounts.length > 0 && (
        <Accordion
          type="multiple"
          defaultValue={accounts.map((a) => a.id)}
          className="space-y-0"
        >
          {accounts.map((acc, idx) => {
            const counts = folderCounts[acc.id] || { inbox: 0, sent: 0, trash: 0 };
            const unread = unreadCounts[acc.id] || 0;
            const colorDot = ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length];

            return (
              <AccordionItem key={acc.id} value={acc.id} className="border-b-0">
                <AccordionTrigger className="py-2 px-2 text-sm hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", colorDot)} />
                    <span className="truncate">{acc.display_name || acc.email_address}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-1 pt-0">
                  <div className="space-y-0.5 pl-2">
                    <button
                      onClick={() => onFolderSelect(acc.id, "inbox")}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors",
                        selectedAccountId === acc.id && selectedFolder === "inbox"
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      Inbox
                      <span className="ml-auto flex items-center gap-1.5">
                        {unread > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                        <span className="text-xs opacity-70">{counts.inbox}</span>
                      </span>
                    </button>
                    <button
                      onClick={() => onFolderSelect(acc.id, "sent")}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors",
                        selectedAccountId === acc.id && selectedFolder === "sent"
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviados
                      <span className="ml-auto text-xs opacity-70">{counts.sent}</span>
                    </button>
                    <button
                      onClick={() => onFolderSelect(acc.id, "trash")}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors",
                        selectedAccountId === acc.id && selectedFolder === "trash"
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Papelera
                      {counts.trash > 0 && (
                        <span className="ml-auto text-xs opacity-70">{counts.trash}</span>
                      )}
                    </button>

                    {/* Empty trash button */}
                    {selectedAccountId === acc.id && selectedFolder === "trash" && counts.trash > 0 && onEmptyTrash && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors mt-1">
                            <Trash2 className="w-3 h-3" />
                            Vaciar papelera
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Vaciar papelera?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminarán permanentemente {counts.trash} email(s) de esta cuenta. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onEmptyTrash(acc.id)}
                            >
                              Eliminar todo
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
