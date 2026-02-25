import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Smartphone, Monitor, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailPreviewModalProps {
  subject: string;
  body: string;
  signatureHtml: string | null;
  recipient: string;
  trigger?: React.ReactNode;
}

export default function EmailPreviewModal({
  subject,
  body,
  signatureHtml,
  recipient,
  trigger,
}: EmailPreviewModalProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  let fullHtml = `<div style="font-family: sans-serif; line-height: 1.6;">${body}</div>`;
  if (signatureHtml) {
    fullHtml += `<br/><div style="margin-top: 16px;">${signatureHtml}</div>`;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8">
            <Eye className="w-3.5 h-3.5" />
            <span className="ml-1 hidden sm:inline text-xs">Vista Previa</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-base">
                Previsualización Profesional
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Para: {recipient || "destinatario@ejemplo.com"}
              </p>
            </div>
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "desktop" | "mobile")}
              className="w-[220px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="desktop" className="text-xs gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  Escritorio
                </TabsTrigger>
                <TabsTrigger value="mobile" className="text-xs gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Móvil
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex items-start justify-center bg-muted/30 p-6">
          <div
            className={cn(
              "bg-background rounded-xl shadow-lg transition-all duration-500 flex flex-col h-full",
              viewMode === "mobile"
                ? "w-[375px] border-[8px] border-foreground/20 rounded-[2rem]"
                : "w-full border border-border"
            )}
          >
            {viewMode === "mobile" && (
              <div className="flex justify-center py-2 shrink-0">
                <div className="w-20 h-1.5 rounded-full bg-foreground/20" />
              </div>
            )}

            <div className="px-4 py-3 border-b border-border shrink-0">
              <p className="text-lg font-semibold text-foreground">
                {subject || "(Sin asunto)"}
              </p>
            </div>

            <ScrollArea className="flex-1">
              <div
                className="email-content-preview p-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: fullHtml }}
              />
            </ScrollArea>
          </div>
        </div>

        <div className="shrink-0 px-6 py-3 border-t border-border bg-background">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Los logos e imágenes se ajustan automáticamente al ancho de la pantalla.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
