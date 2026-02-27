import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageCircle, Globe, Search, Mail, Sparkles, Settings2, Loader2, ExternalLink } from "lucide-react";
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

  const testConnector = async (connectorId: string) => {
    if (connectorId === "email") {
      navigate("/email-settings");
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
    </div>
  );
}
