import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Globe, Sparkles, Loader2, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ProspectResult {
  name: string;
  position: string;
  company: string;
  domain: string;
  email: string;
  confidence: number;
  source: string;
  linkedin_url?: string;
  phone?: string;
  already_in_crm?: boolean;
}

const providers = [
  { id: "apollo", label: "Apollo", icon: Search, color: "text-blue-500" },
  { id: "hunter", label: "Hunter", icon: Globe, color: "text-orange-500" },
  { id: "lusha", label: "Lusha", icon: Sparkles, color: "text-purple-500" },
];

export default function Prospector() {
  const { user } = useAuth();
  const [provider, setProvider] = useState("apollo");
  const [filters, setFilters] = useState({ job_title: "", company: "", domain: "", location: "", industry: "", company_size: "" });
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const updateFilter = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const handleSearch = async () => {
    const hasFilter = Object.values(filters).some((v) => v.trim());
    if (!hasFilter) { toast.error("Introduce al menos un filtro"); return; }
    if (provider === "hunter" && !filters.domain) { toast.error("Hunter requiere un dominio"); return; }

    setLoading(true);
    setResults([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("prospector-search", {
        body: { provider, filters },
      });
      if (error) throw error;
      setResults(data.results || []);
      if ((data.results || []).length === 0) toast.info("No se encontraron resultados");
    } catch (e: any) {
      toast.error(e.message || "Error en la búsqueda");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    const importable = results.map((r, i) => (!r.already_in_crm ? i : -1)).filter((i) => i >= 0);
    if (selected.size === importable.length) setSelected(new Set());
    else setSelected(new Set(importable));
  };

  const handleImport = async () => {
    if (selected.size === 0) { toast.error("Selecciona al menos un contacto"); return; }
    setImporting(true);
    let imported = 0, skipped = 0;
    try {
      for (const idx of selected) {
        const r = results[idx];
        if (r.already_in_crm) { skipped++; continue; }

        const { error } = await supabase.from("contacts").insert({
          full_name: r.name,
          position: r.position || null,
          email: r.email || null,
          company_domain: r.domain || null,
          linkedin_url: r.linkedin_url || null,
          phone: r.phone || null,
          created_by: user?.id,
          status: "new_lead" as const,
          notes: `Importado desde ${r.source} (confianza: ${r.confidence}%)`,
        });
        if (error) { console.error(error); skipped++; } else { imported++; }
      }
      toast.success(`${imported} contacto(s) importado(s)${skipped > 0 ? `, ${skipped} omitido(s)` : ""}`);
      // Mark imported as already_in_crm
      setResults((prev) =>
        prev.map((r, i) => (selected.has(i) && !r.already_in_crm ? { ...r, already_in_crm: true } : r))
      );
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e.message || "Error importando");
    } finally {
      setImporting(false);
    }
  };

  const confidenceColor = (c: number) => (c >= 80 ? "text-emerald-600" : c >= 50 ? "text-orange-500" : "text-destructive");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Prospector Pro</h1>
      <p className="text-sm text-muted-foreground mb-6">Busca y cualifica leads desde Apollo, Hunter y Lusha</p>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Filters */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros de búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider selector */}
            <div className="space-y-2">
              <Label>Fuente</Label>
              <div className="flex gap-1">
                {providers.map((p) => (
                  <Button
                    key={p.id}
                    variant={provider === p.id ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setProvider(p.id)}
                  >
                    <p.icon className={`w-3.5 h-3.5 mr-1 ${provider === p.id ? "" : p.color}`} />
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input placeholder="CEO, CTO, Director..." value={filters.job_title} onChange={(e) => updateFilter("job_title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input placeholder="Nombre de empresa" value={filters.company} onChange={(e) => updateFilter("company", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dominio</Label>
              <Input placeholder="empresa.com" value={filters.domain} onChange={(e) => updateFilter("domain", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input placeholder="Madrid, España" value={filters.location} onChange={(e) => updateFilter("location", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Industria</Label>
              <Input placeholder="TIC, Fintech..." value={filters.industry} onChange={(e) => updateFilter("industry", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tamaño empresa</Label>
              <Input placeholder="10-50, 51-200..." value={filters.company_size} onChange={(e) => updateFilter("company_size", e.target.value)} />
            </div>

            <Button onClick={handleSearch} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Buscar
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              Resultados {results.length > 0 && <span className="text-muted-foreground font-normal">({results.length})</span>}
            </CardTitle>
            {selected.size > 0 && (
              <Button onClick={handleImport} disabled={importing} size="sm">
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Importar {selected.size} al CRM
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {results.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">Define filtros y pulsa "Buscar" para encontrar leads</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selected.size > 0 && selected.size === results.filter((r) => !r.already_in_crm).length} onCheckedChange={toggleAll} />
                      </TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-20">Conf.</TableHead>
                      <TableHead className="w-28">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, idx) => (
                      <TableRow key={idx} className={r.already_in_crm ? "opacity-60" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(idx)}
                            onCheckedChange={() => toggleSelect(idx)}
                            disabled={r.already_in_crm}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.position}</TableCell>
                        <TableCell className="text-sm">{r.company}</TableCell>
                        <TableCell className="text-sm font-mono">{r.email || "—"}</TableCell>
                        <TableCell>
                          <span className={`text-sm font-semibold ${confidenceColor(r.confidence)}`}>{r.confidence}%</span>
                        </TableCell>
                        <TableCell>
                          {r.already_in_crm ? (
                            <Badge variant="secondary" className="text-[10px]">
                              <AlertCircle className="w-3 h-3 mr-1" /> Ya en CRM
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Nuevo</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
