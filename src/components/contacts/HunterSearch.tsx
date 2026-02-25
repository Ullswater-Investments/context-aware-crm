import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, Download, Wand2, Loader2, Mail, Globe } from "lucide-react";

interface HunterEmail {
  email: string;
  type: string;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
}

interface HunterResult {
  domain: string;
  pattern: string | null;
  organization: string | null;
  emails: HunterEmail[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDomain?: string;
  organizationId?: string;
  onImported?: () => void;
}

function confidenceBadge(score: number) {
  if (score >= 80) return <Badge className="bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/20">{score}%</Badge>;
  if (score >= 50) return <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/20">{score}%</Badge>;
  return <Badge className="bg-red-500/15 text-red-700 border-red-500/30 hover:bg-red-500/20">{score}%</Badge>;
}

function applyPattern(pattern: string | null, firstName: string, lastName: string, domain: string): string | null {
  if (!pattern || !firstName || !lastName) return null;
  const f = firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const l = lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const email = pattern
    .replace("{first}", f)
    .replace("{last}", l)
    .replace("{f}", f[0] || "")
    .replace("{l}", l[0] || "");
  return `${email}@${domain}`;
}

export default function HunterSearch({ open, onOpenChange, defaultDomain = "", organizationId, onImported }: Props) {
  const { user } = useAuth();
  const [domain, setDomain] = useState(defaultDomain);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HunterResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  // Manual email generator
  const [manualFirst, setManualFirst] = useState("");
  const [manualLast, setManualLast] = useState("");

  const cleanDomain = (d: string) => d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();

  const search = async () => {
    const clean = cleanDomain(domain);
    if (!clean) { toast.error("Introduce un dominio"); return; }
    setLoading(true);
    setResult(null);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("hunter-domain-search", {
        body: { domain: clean },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setResult(data);
      if (data.emails?.length === 0) toast.info("No se encontraron emails para este dominio");
    } catch (e: any) {
      toast.error(e.message || "Error al buscar");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    if (!result) return;
    if (selected.size === result.emails.length) setSelected(new Set());
    else setSelected(new Set(result.emails.map((_, i) => i)));
  };

  const importSelected = async () => {
    if (!result || selected.size === 0) return;
    setImporting(true);
    try {
      const contacts = Array.from(selected).map((idx) => {
        const e = result.emails[idx];
        return {
          full_name: [e.first_name, e.last_name].filter(Boolean).join(" ") || e.email,
          email: e.email,
          position: e.position || null,
          company_domain: result.domain,
          organization_id: organizationId || null,
          created_by: user!.id,
          status: "new_lead" as const,
        };
      });
      const { error } = await supabase.from("contacts").insert(contacts);
      if (error) throw error;
      toast.success(`${contacts.length} contacto(s) importados`);
      setSelected(new Set());
      onImported?.();
    } catch (e: any) {
      toast.error(e.message || "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  const generatedEmail = result?.pattern ? applyPattern(result.pattern, manualFirst, manualLast, result.domain) : null;

  const importManual = async () => {
    if (!generatedEmail || !result) return;
    setImporting(true);
    try {
      const { error } = await supabase.from("contacts").insert({
        full_name: `${manualFirst} ${manualLast}`.trim(),
        email: generatedEmail,
        company_domain: result.domain,
        organization_id: organizationId || null,
        created_by: user!.id,
        status: "new_lead" as const,
      });
      if (error) throw error;
      toast.success("Contacto importado");
      setManualFirst("");
      setManualLast("");
      onImported?.();
    } catch (e: any) {
      toast.error(e.message || "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Buscar emails con Hunter.io
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Introduce un dominio (ej: vitaldent.com)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="flex-1"
          />
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </Button>
        </div>

        {result && (
          <div className="space-y-4 mt-2">
            {/* Pattern */}
            {result.pattern && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs text-muted-foreground mb-1">Patrón de correo detectado</p>
                <p className="font-mono text-sm font-medium text-primary">
                  {result.pattern}@{result.domain}
                </p>
                {result.organization && (
                  <p className="text-xs text-muted-foreground mt-1">{result.organization}</p>
                )}
              </div>
            )}

            {/* Email list */}
            {result.emails.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{result.emails.length} email(s) encontrados</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAll}>
                      {selected.size === result.emails.length ? "Deseleccionar" : "Seleccionar"} todos
                    </Button>
                    {selected.size > 0 && (
                      <Button size="sm" onClick={importSelected} disabled={importing}>
                        {importing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                        Importar {selected.size}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {result.emails.map((e, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleSelect(idx)}
                    >
                      <Checkbox checked={selected.has(idx)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {[e.first_name, e.last_name].filter(Boolean).join(" ") || "—"}
                          </span>
                          {confidenceBadge(e.confidence)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{e.email}</span>
                          {e.position && <span className="truncate">· {e.position}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual email generator */}
            {result.pattern && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Generar email manualmente</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  ¿No encuentras a tu contacto? Escribe su nombre y generaremos el email usando el patrón detectado.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Nombre</Label>
                    <Input value={manualFirst} onChange={(e) => setManualFirst(e.target.value)} placeholder="Ana" />
                  </div>
                  <div>
                    <Label className="text-xs">Apellido</Label>
                    <Input value={manualLast} onChange={(e) => setManualLast(e.target.value)} placeholder="López" />
                  </div>
                </div>
                {generatedEmail && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">{generatedEmail}</div>
                    <Button size="sm" onClick={importManual} disabled={importing}>
                      {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      Importar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
