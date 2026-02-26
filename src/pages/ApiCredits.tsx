import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Globe, Sparkles, Mail, Search } from "lucide-react";
import { toast } from "sonner";

interface ProviderData {
  provider: string;
  status: string;
  error?: string;
  credits?: { used: number; remaining: number; total: number };
  searches?: { used: number; available: number };
  verifications?: { used: number; available: number };
  plan?: string;
  reset_date?: string;
  note?: string;
}

const providerMeta: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  hunter: { label: "Hunter.io", icon: Globe, color: "text-orange-500" },
  apollo: { label: "Apollo.io", icon: Search, color: "text-blue-500" },
  findymail: { label: "Findymail", icon: Mail, color: "text-emerald-500" },
  lusha: { label: "Lusha", icon: Sparkles, color: "text-purple-500" },
};

function getProgressColor(percent: number) {
  if (percent <= 5) return "bg-destructive";
  if (percent <= 20) return "bg-warning";
  return "bg-primary";
}

function ProviderCard({ data }: { data: ProviderData }) {
  const meta = providerMeta[data.provider] || { label: data.provider, icon: Globe, color: "text-muted-foreground" };
  const Icon = meta.icon;

  const isConnected = data.status === "connected";
  const isError = data.status === "error";
  const notConfigured = data.status === "not_configured";

  // Calculate credits
  let used = 0, total = 0, remaining = 0;
  if (data.provider === "hunter" && data.searches) {
    used = data.searches.used;
    total = data.searches.used + data.searches.available;
    remaining = data.searches.available;
  } else if (data.credits) {
    used = data.credits.used;
    total = data.credits.total;
    remaining = data.credits.remaining;
  }

  const percent = total > 0 ? Math.round((remaining / total) * 100) : 0;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-muted ${meta.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base">{meta.label}</CardTitle>
            {data.plan && <p className="text-xs text-muted-foreground mt-0.5">{data.plan}</p>}
          </div>
        </div>
        <Badge variant={isConnected ? "default" : isError ? "destructive" : "secondary"} className="text-[10px]">
          {isConnected ? "Conectado" : isError ? "Error" : notConfigured ? "No configurado" : data.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isConnected && total > 0 ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Créditos restantes</span>
              <span className="font-semibold">{remaining.toLocaleString()} / {total.toLocaleString()}</span>
            </div>
            <Progress value={percent} className={`h-3 [&>div]:${getProgressColor(percent)}`} />
            {percent <= 20 && (
              <p className="text-xs font-medium text-orange-500">
                {percent <= 5 ? "⚠️ ¡Créditos casi agotados!" : "⚡ Créditos bajos"}
              </p>
            )}
          </>
        ) : isConnected ? (
          <p className="text-sm text-muted-foreground">{data.note || "Conectado correctamente"}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{data.error || "Error de conexión"}</p>
        ) : (
          <p className="text-sm text-muted-foreground">API Key no configurada</p>
        )}

        {data.provider === "hunter" && data.verifications && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Verificaciones</span>
              <span>{data.verifications.available.toLocaleString()} disponibles</span>
            </div>
          </div>
        )}

        {data.reset_date && (
          <p className="text-xs text-muted-foreground">Renovación: {new Date(data.reset_date).toLocaleDateString("es-ES")}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApiCredits() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["api-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-api-usage");
      if (error) throw error;
      return data as { providers: ProviderData[]; fetched_at: string };
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    toast.info("Actualizando créditos...");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Créditos y APIs</h1>
          <p className="text-sm text-muted-foreground">
            Monitoriza el estado y créditos de tus herramientas de prospección
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isFetching} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refrescar todo
        </Button>
      </div>

      {data?.fetched_at && (
        <p className="text-xs text-muted-foreground">
          Última consulta: {new Date(data.fetched_at).toLocaleString("es-ES")}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-40 animate-pulse bg-muted" />
            ))
          : (data?.providers || []).map((p) => <ProviderCard key={p.provider} data={p} />)}
      </div>
    </div>
  );
}
