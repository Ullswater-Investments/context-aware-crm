import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface ContactImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface ParsedRow {
  full_name: string;
  email?: string;
  phone?: string;
  position?: string;
  company?: string;
  sector?: string;
}

// Try to map common column names to our fields
function mapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lower = headers.map((h) => h.toLowerCase().trim());

  const namePatterns = ["nombre completo", "full_name", "fullname", "name", "nombre"];
  const emailPatterns = ["email", "correo", "e-mail", "mail"];
  const phonePatterns = ["teléfono", "telefono", "phone", "tel", "móvil", "movil", "mobile"];
  const positionPatterns = ["cargo", "position", "puesto", "título", "titulo", "job title", "role"];
  const companyPatterns = ["empresa", "company", "organización", "organizacion", "org", "compañía", "compania"];
  const sectorPatterns = ["sector", "industria", "industry", "tipo", "industry_tags", "etiqueta", "tag"];

  const find = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = lower.findIndex((h) => h.includes(p));
      if (idx >= 0) return headers[idx];
    }
    return null;
  };

  // Also handle "Nombre" + "Apellido" separately
  const firstName = lower.findIndex((h) => h === "nombre" || h === "first name" || h === "first_name");
  const lastName = lower.findIndex((h) => h === "apellido" || h === "apellidos" || h === "last name" || h === "last_name" || h === "surname");

  if (firstName >= 0 && lastName >= 0) {
    mapping["_first_name"] = headers[firstName];
    mapping["_last_name"] = headers[lastName];
  } else {
    const n = find(namePatterns);
    if (n) mapping["full_name"] = n;
  }

  const e = find(emailPatterns);
  if (e) mapping["email"] = e;
  const p = find(phonePatterns);
  if (p) mapping["phone"] = p;
  const pos = find(positionPatterns);
  if (pos) mapping["position"] = pos;
  const comp = find(companyPatterns);
  if (comp) mapping["company"] = comp;
  const sec = find(sectorPatterns);
  if (sec) mapping["sector"] = sec;

  return mapping;
}

function parseRows(data: Record<string, any>[], headers: string[]): ParsedRow[] {
  const mapping = mapColumns(headers);
  return data
    .map((row) => {
      let full_name = "";
      if (mapping["_first_name"] && mapping["_last_name"]) {
        const first = (row[mapping["_first_name"]] || "").toString().trim();
        const last = (row[mapping["_last_name"]] || "").toString().trim();
        full_name = `${first} ${last}`.trim();
      } else if (mapping["full_name"]) {
        full_name = (row[mapping["full_name"]] || "").toString().trim();
      }
      if (!full_name) return null;

      return {
        full_name,
        email: mapping["email"] ? (row[mapping["email"]] || "").toString().trim() || undefined : undefined,
        phone: mapping["phone"] ? (row[mapping["phone"]] || "").toString().trim() || undefined : undefined,
        position: mapping["position"] ? (row[mapping["position"]] || "").toString().trim() || undefined : undefined,
        company: mapping["company"] ? (row[mapping["company"]] || "").toString().trim() || undefined : undefined,
        sector: mapping["sector"] ? (row[mapping["sector"]] || "").toString().trim() || undefined : undefined,
      } as ParsedRow;
    })
    .filter(Boolean) as ParsedRow[];
}

export default function ContactImporter({ open, onOpenChange, onComplete }: ContactImporterProps) {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setImporting(true);
      setProgress(0);
      setResult(null);

      let rows: ParsedRow[] = [];

      try {
        if (file.name.endsWith(".csv") || file.type === "text/csv") {
          const text = await file.text();
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          rows = parseRows(parsed.data as Record<string, any>[], parsed.meta.fields || []);
        } else if (/\.xlsx?$/i.test(file.name)) {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          const headers = Object.keys((data[0] as any) || {});
          rows = parseRows(data as Record<string, any>[], headers);
        } else {
          toast.error("Formato no soportado. Usa CSV o Excel (.xlsx)");
          setImporting(false);
          return;
        }
      } catch {
        toast.error("Error al leer el archivo");
        setImporting(false);
        return;
      }

      if (rows.length === 0) {
        toast.error("No se encontraron contactos válidos en el archivo");
        setImporting(false);
        return;
      }

      // Cache orgs to avoid duplicates
      const orgCache = new Map<string, string>();
      const { data: existingOrgs } = await supabase.from("organizations").select("id, name");
      existingOrgs?.forEach((o) => orgCache.set(o.name.toLowerCase(), o.id));

      let success = 0;
      let errors = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          let orgId: string | null = null;
          if (row.company) {
            const key = row.company.toLowerCase();
            if (orgCache.has(key)) {
              orgId = orgCache.get(key)!;
            } else {
              const { data: newOrg } = await supabase
                .from("organizations")
                .insert({ name: row.company, created_by: user!.id })
                .select("id")
                .single();
              if (newOrg) {
                orgId = newOrg.id;
                orgCache.set(key, newOrg.id);
              }
            }
          }

          const tags = row.sector ? [row.sector] : [];

          const { error } = await supabase.from("contacts").insert({
            full_name: row.full_name,
            email: row.email || null,
            phone: row.phone || null,
            position: row.position || null,
            organization_id: orgId,
            tags,
            created_by: user!.id,
          });

          if (error) errors++;
          else success++;
        } catch {
          errors++;
        }

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      setResult({ success, errors });
      setImporting(false);
      if (success > 0) onComplete();
    },
    [user, onComplete]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const reset = () => {
    setResult(null);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!importing) {
          onOpenChange(v);
          if (!v) reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar contactos
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <div>
              <p className="text-lg font-semibold">{result.success} contactos importados</p>
              {result.errors > 0 && (
                <p className="text-sm text-destructive mt-1">{result.errors} filas con error</p>
              )}
            </div>
            <Button onClick={() => { onOpenChange(false); reset(); }}>Cerrar</Button>
          </div>
        ) : importing ? (
          <div className="py-8 space-y-4">
            <p className="text-sm text-center text-muted-foreground">Importando contactos...</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">{progress}%</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arrastra un archivo CSV o Excel aquí</p>
              <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Columnas esperadas
              </p>
              <p className="text-xs text-muted-foreground">
                Nombre, Apellido (o Nombre completo), Email, Teléfono, Cargo, Empresa, Sector
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
