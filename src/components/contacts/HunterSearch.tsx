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
import { Search, Download, Wand2, Loader2, Mail, Globe, ShieldCheck, ShieldX, ShieldQuestion } from "lucide-react";

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

  // Email verification
  const [verifications, setVerifications] = useState<Record<string, { status: string; score: number | null; loading: boolean }>>({});

  const verifyEmail = async (email: string) => {
    setVerifications((prev) => ({ ...prev, [email]: { status: "loading", score: null, loading: true } }));
    try {
      const { data, error } = await supabase.functions.invoke("hunter-domain-search", {
        body: { domain: "x", action: "email-verifier", email },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setVerifications((prev) => ({
        ...prev,
        [email]: { status: data.result || data.status || "unknown", score: data.score, loading: false },
      }));
    } catch (e: any) {
      setVerifications((prev) => ({ ...prev, [email]: { status: "error", score: null, loading: false } }));
      toast.error(e.message || "Error al verificar");
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
  const [finderResult, setFinderResult] = useState<{ email: string; confidence: number } | null>(null);
  const [finding, setFinding] = useState(false);

  const findEmail = async () => {
    if (!result || !manualFirst || !manualLast) return;
    setFinding(true);
    setFinderResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("hunter-domain-search", {
        body: { domain: result.domain, action: "email-finder", first_name: manualFirst, last_name: manualLast },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.email) {
        setFinderResult({ email: data.email, confidence: data.confidence });
      } else {
        toast.info("No se encontró un email verificado. Puedes usar el patrón estimado.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error al buscar");
    } finally {
      setFinding(false);
    }
  };

  const finalEmail = finderResult?.email || generatedEmail;

  const importManual = async () => {
    if (!finalEmail || !result) return;
    setImporting(true);
    try {
      const { error } = await supabase.from("contacts").insert({
        full_name: `${manualFirst} ${manualLast}`.trim(),
        email: finalEmail,
        company_domain: result.domain,
        organization_id: organizationId || null,
        created_by: user!.id,
        status: "new_lead" as const,
      });
      if (error) throw error;
      toast.success("Contacto importado");
      setManualFirst("");
      setManualLast("");
      setFinderResult(null);
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
                  {result.emails.map((e, idx) => {
                    const v = verifications[e.email];
                    return (
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
                            {v && !v.loading && (
                              v.status === "deliverable" ? (
                                <Badge className="bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/20 gap-1"><ShieldCheck className="w-3 h-3" />Válido</Badge>
                              ) : v.status === "risky" ? (
                                <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/20 gap-1"><ShieldQuestion className="w-3 h-3" />Riesgo</Badge>
                              ) : (
                                <Badge className="bg-red-500/15 text-red-700 border-red-500/30 hover:bg-red-500/20 gap-1"><ShieldX className="w-3 h-3" />Inválido</Badge>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">{e.email}</span>
                            {e.position && <span className="truncate">· {e.position}</span>}
                          </div>
                        </div>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); verifyEmail(e.email); }}
                          className="shrink-0 text-xs text-primary hover:underline flex items-center gap-1"
                          disabled={v?.loading}
                        >
                          {v?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                          {v && !v.loading ? "Re-verificar" : "Verificar"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual email finder */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Buscar email de una persona</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Escribe nombre y apellido. Verificaremos el email con Hunter.io{result.pattern ? " y usaremos el patrón como respaldo" : ""}.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <Input value={manualFirst} onChange={(e) => { setManualFirst(e.target.value); setFinderResult(null); }} placeholder="Ana" />
                </div>
                <div>
                  <Label className="text-xs">Apellido</Label>
                  <Input value={manualLast} onChange={(e) => { setManualLast(e.target.value); setFinderResult(null); }} placeholder="López" />
                </div>
              </div>
              {manualFirst && manualLast && (
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={findEmail} disabled={finding} className="w-full">
                    {finding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                    Verificar email con Hunter.io
                  </Button>
                  {finderResult && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm flex items-center gap-2">
                        {finderResult.email}
                        {confidenceBadge(finderResult.confidence)}
                      </div>
                      <Button size="sm" onClick={importManual} disabled={importing}>
                        {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        Importar
                      </Button>
                    </div>
                  )}
                  {!finderResult && generatedEmail && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-md bg-muted/50 px-3 py-2 font-mono text-sm text-muted-foreground">
                        {generatedEmail} <span className="text-xs">(estimado por patrón)</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={importManual} disabled={importing}>
                        {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        Importar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
