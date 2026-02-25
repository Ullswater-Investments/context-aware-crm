import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type AccountStatus = "connected" | "error" | "expired" | "checking";

const statusConfig: Record<AccountStatus, { color: string; animation: string; label: string }> = {
  connected: { color: "bg-[hsl(var(--success))]", animation: "", label: "Conectado" },
  error: { color: "bg-destructive", animation: "animate-pulse", label: "Error de conexión" },
  expired: { color: "bg-[hsl(var(--warning))]", animation: "animate-pulse", label: "Credenciales expiradas" },
  checking: { color: "bg-[hsl(var(--info))]", animation: "animate-bounce", label: "Verificando..." },
};

interface AccountStatusDotProps {
  status: string;
  errorMessage?: string | null;
  size?: "sm" | "md";
}

export default function AccountStatusDot({ status, errorMessage, size = "sm" }: AccountStatusDotProps) {
  const config = statusConfig[status as AccountStatus] || statusConfig.error;
  const dotSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-block rounded-full shrink-0", dotSize, config.color, config.animation)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px]">
          <p className="font-medium text-xs">{config.label}</p>
          {errorMessage && status !== "connected" && (
            <p className="text-xs text-muted-foreground mt-0.5 break-words">{errorMessage}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
