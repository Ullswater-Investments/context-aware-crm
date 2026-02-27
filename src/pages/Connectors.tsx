import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageCircle, Globe, Search, Mail, Sparkles, Settings2, Loader2, ExternalLink, RefreshCw, CheckCircle2, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ConnectorStatus = "idle" | "testing" | "connected" | "error" | "not_configured";

interface Connector {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  externalLink?: string;
  redirectTo?: string;
}

const connectors: Connector[] = [
  { id: "whatsapp", name: "WhatsApp (Whapi)", description: "Mensajería bidireccional con contactos vía Whapi.cloud", icon: MessageCircle, color: "text-green-500", externalLink: "https://panel.whapi.cloud/" },
  { id: "hunter", name: "Hunter.io", description: "Búsqueda y verificación de emails profesionales", icon: Globe, color: "text-orange-500", externalLink: "https://hunter.io/api-keys" },
  { id: "apollo", name: "Apollo.io", description: "Prospección y enriquecimiento de leads B2B", icon: Search, color: "text-blue-500", externalLink: "https://app.apollo.io/#/settings/integrations/api" },
  { id: "findymail", name: "Findymail", description: "Búsqueda avanzada de emails corporativos", icon: Mail, color: "text-purple-500", externalLink: "https://app.findymail.com/dashboard" },
  { id: "lusha", name: "Lusha", description: "Datos de contacto directo (teléfonos y emails)", icon: Sparkles, color: "text-pink-500", externalLink: "https://dashboard.lusha.com/api" },
  { id: "email", name: "Email SMTP/IMAP", description: "Cuentas de correo para envío y recepción", icon: Settings2, color: "text-muted-foreground", redirectTo: "/email-settings" },
];

export default function Connectors() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Record<string, ConnectorStatus>>({});
  const [details, setDetails] = useState<Record<string, Record<string, unknown>>>({});
  const [testingAll, setTestingAll] = useState(false);

  // WhatsApp QR state
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [channelStatus, setChannelStatus] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Auto-test all connectors on mount
  const hasTestedRef = useRef(false);
  useEffect(() => {
    if (!hasTestedRef.current) {
      hasTestedRef.current = true;
      testAll();
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const checkWhatsAppHealth = async (): Promise<{ status_text: string; status_code: number } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-qr", {
        body: { action: "health" },
      });
      if (error) throw error;
      return { status_text: data?.status?.text || "unknown", status_code: data?.status?.code || 0 };
    } catch {
      return null;
    }
  };

  const fetchQrCode = async () => {
    setLoadingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-qr", {
        body: { action: "qr" },
      });
      if (error) throw error;
      // Whapi returns { qr: "base64string" } or { image: "base64string" }
      const qr = data?.qr || data?.image || null;
      if (qr) {
        setQrBase64(qr);
      } else {
        toast.error("No se pudo obtener el código QR");
      }
    } catch (err: unknown) {
      toast.error(`Error obteniendo QR: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setLoadingQr(false);
    }
  };

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      const health = await checkWhatsAppHealth();
      if (!health) return;
      setChannelStatus(health.status_text);
      // code 5 = AUTH (connected)
      if (health.status_text === "AUTH" || health.status_code === 5) {
        stopPolling();
        setStatuses((prev) => ({ ...prev, whatsapp: "connected" }));
        toast.success("WhatsApp conectado correctamente");
        setTimeout(() => setShowQrModal(false), 1500);
      }
    }, 5000);
  }, [stopPolling]);

  const testWhatsApp = async () => {
    setStatuses((prev) => ({ ...prev, whatsapp: "testing" }));
    const health = await checkWhatsAppHealth();

    if (!health) {
      setStatuses((prev) => ({ ...prev, whatsapp: "error" }));
      toast.error("No se pudo verificar el estado de WhatsApp");
      return;
    }

    setChannelStatus(health.status_text);

    if (health.status_text === "AUTH" || health.status_code === 5) {
      setStatuses((prev) => ({ ...prev, whatsapp: "connected" }));
      toast.success("WhatsApp ya está conectado");
      return;
    }

    // Needs QR auth
    setStatuses((prev) => ({ ...prev, whatsapp: "not_configured" }));
    setShowQrModal(true);
    await fetchQrCode();
    startPolling();
  };

  const handleCloseQrModal = (open: boolean) => {
    if (!open) {
      stopPolling();
      setShowQrModal(false);
      setQrBase64(null);
    }
  };

  const refreshQr = async () => {
    setQrBase64(null);
    await fetchQrCode();
  };

  const testConnector = async (connectorId: string) => {
    if (connectorId === "email") {
      navigate("/email-settings");
      return;
    }

    if (connectorId === "whatsapp") {
      await testWhatsApp();
      return;
    }

    setStatuses((prev) => ({ ...prev, [connectorId]: "testing" }));
    try {
      const { data, error } = await supabase.functions.invoke("test-connector", {
        body: { connector: connectorId },
      });
      if (error) throw error;
      setStatuses((prev) => ({ ...prev, [connectorId]: data.status as ConnectorStatus }));
      setDetails((prev) => ({ ...prev, [connectorId]: data.details || {} }));

      if (data.status === "connected") toast.success(`${connectorId} conectado correctamente`);
      else if (data.status === "not_configured") toast.warning(`${connectorId}: credenciales no configuradas`);
      else toast.error(`${connectorId}: error de conexión`);
    } catch (err: unknown) {
      setStatuses((prev) => ({ ...prev, [connectorId]: "error" }));
      toast.error(`Error probando ${connectorId}: ${err instanceof Error ? err.message : "desconocido"}`);
    }
  };

  const testAll = async () => {
    setTestingAll(true);
    const testable = connectors.filter((c) => c.id !== "email");
    await Promise.all(testable.map((c) => testConnector(c.id)));
    setTestingAll(false);
  };

  const getBadge = (connectorId: string) => {
    const status = statuses[connectorId];
    if (!status || status === "idle")
      return <Badge variant="outline" className="text-muted-foreground">Sin probar</Badge>;
    if (status === "testing")
      return <Badge variant="outline" className="text-muted-foreground"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Probando</Badge>;
    if (status === "connected")
      return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">Conectado</Badge>;
    if (status === "not_configured")
      return <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10">No configurado</Badge>;
    return <Badge variant="destructive">Error</Badge>;
  };

  const getDetailText = (connectorId: string) => {
    const d = details[connectorId];
    if (!d) return null;
    const entries = Object.entries(d).filter(([, v]) => v != null && v !== "");
    if (entries.length === 0) return null;
    return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conectores</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona las conexiones con servicios externos del CRM</p>
        </div>
        <Button onClick={testAll} disabled={testingAll} variant="outline">
          {testingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Probar todos
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connectors.map((c) => (
          <Card key={c.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <c.icon className={`w-6 h-6 ${c.color}`} />
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </div>
                {getBadge(c.id)}
              </div>
              <CardDescription className="mt-2">{c.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              {getDetailText(c.id) && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 truncate">{getDetailText(c.id)}</p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={statuses[c.id] === "testing"}
                  onClick={() => testConnector(c.id)}
                >
                  {statuses[c.id] === "testing" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  {c.redirectTo ? "Configurar" : "Probar conexión"}
                </Button>
                {c.externalLink && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={c.externalLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* WhatsApp QR Modal */}
      <Dialog open={showQrModal} onOpenChange={handleCloseQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escanea este código QR con tu teléfono para vincular WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2 text-sm">
              {channelStatus === "AUTH" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-medium">¡Conectado!</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {channelStatus ? `Estado: ${channelStatus}` : "Esperando escaneo..."}
                  </span>
                </>
              )}
            </div>

            {/* QR Code */}
            <div className="w-64 h-64 flex items-center justify-center rounded-lg border bg-white">
              {loadingQr ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : qrBase64 ? (
                <img
                  src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                  alt="WhatsApp QR Code"
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center px-4">
                  No se pudo cargar el QR. Pulsa "Refrescar" para intentarlo de nuevo.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={refreshQr} disabled={loadingQr}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loadingQr ? "animate-spin" : ""}`} />
                Refrescar QR
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              El QR expira en ~60 segundos. Usa "Refrescar QR" si caduca.
              <br />
              El estado se comprueba automáticamente cada 5 segundos.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
