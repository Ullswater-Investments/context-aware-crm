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
  postal_address?: string;
  linkedin_url?: string;
  work_email?: string;
  personal_email?: string;
  mobile_phone?: string;
  work_phone?: string;
  company_domain?: string;
  company_website?: string;
  company_description?: string;
  sub_sector?: string;
}

function mapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lower = headers.map((h) => h.toLowerCase().trim());

  const patterns: Record<string, string[]> = {
    full_name: ["nombre completo", "full_name", "fullname", "contact name"],
    email: ["email", "correo", "e-mail", "mail"],
    phone: ["teléfono", "telefono", "phone", "tel"],
    position: ["cargo", "position", "puesto", "título", "titulo", "job title", "role"],
    company: ["empresa", "company name", "company", "organización", "organizacion", "org", "compañía", "compania"],
    sector: ["sector", "industria", "industry", "company main industry", "industry_tags", "etiqueta", "tag"],
    postal_address: ["dirección", "direccion", "address", "postal", "sede", "dirección postal", "postal_address"],
    linkedin_url: ["contact li", "linkedin url", "linkedin", "li url"],
    work_email: ["work email", "work_email"],
    personal_email: ["private email", "direct email", "personal email", "additional email 1"],
    mobile_phone: ["mobile", "móvil"],
    work_phone: ["direct phone", "work phone"],
    company_domain: ["company domain", "domain", "dominio"],
    company_website: ["company website"],
    company_description: ["company description"],
    sub_sector: ["sub industry", "company sub industry", "sub sector"],
  };

  const find = (pats: string[]) => {
    for (const p of pats) {
      const idx = lower.findIndex((h) => h === p || h.includes(p));
      if (idx >= 0) return headers[idx];
    }
    return null;
  };

  // Handle First Name + Last Name split
  const firstName = lower.findIndex((h) => h === "nombre" || h === "first name" || h === "first_name");
  const lastName = lower.findIndex((h) => h === "apellido" || h === "apellidos" || h === "last name" || h === "last_name" || h === "surname");

  if (firstName >= 0 && lastName >= 0) {
    mapping["_first_name"] = headers[firstName];
    mapping["_last_name"] = headers[lastName];
  } else {
    const n = find(patterns.full_name);
    if (n) mapping["full_name"] = n;
  }

  for (const [field, pats] of Object.entries(patterns)) {
    if (field === "full_name") continue;
    const found = find(pats);
    if (found) mapping[field] = found;
  }

  // Handle Phone 1 (mobile) / Phone 1 (direct) from Apollo format
  const phone1Idx = lower.findIndex((h) => h === "phone 1");
  const phone1TypeIdx = lower.findIndex((h) => h === "phone 1 type");
  const phone2Idx = lower.findIndex((h) => h === "phone 2");
  if (phone1Idx >= 0) mapping["_phone1"] = headers[phone1Idx];
  if (phone1TypeIdx >= 0) mapping["_phone1_type"] = headers[phone1TypeIdx];
  if (phone2Idx >= 0) mapping["_phone2"] = headers[phone2Idx];

  // Work email 2 from Lusha → personal_email fallback
  const we2 = lower.findIndex((h) => h === "work email 2");
  if (we2 >= 0 && !mapping["personal_email"]) mapping["personal_email"] = headers[we2];

  // Mobile 2 from Lusha → phone fallback
  const m2 = lower.findIndex((h) => h === "mobile 2");
  if (m2 >= 0) mapping["_mobile2"] = headers[m2];

  return mapping;
}

function val(row: Record<string, any>, key: string | undefined): string | undefined {
  if (!key) return undefined;
  const v = (row[key] || "").toString().trim();
  return v || undefined;
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

      // Determine mobile/work phone from Apollo's Phone 1 + type
      let mobile_phone = val(row, mapping["mobile_phone"]);
      let work_phone = val(row, mapping["work_phone"]);
      if (mapping["_phone1"] && mapping["_phone1_type"]) {
        const p1 = val(row, mapping["_phone1"]);
        const p1type = val(row, mapping["_phone1_type"])?.toLowerCase();
        if (p1) {
          if (p1type === "mobile") mobile_phone = mobile_phone || p1;
          else if (p1type === "direct" || p1type === "work") work_phone = work_phone || p1;
          else mobile_phone = mobile_phone || p1;
        }
      }

      const work_email = val(row, mapping["work_email"]);
      const personal_email = val(row, mapping["personal_email"]);
      const phone2 = val(row, mapping["_phone2"]) || val(row, mapping["_mobile2"]);

      const tags: string[] = [];
      const sector = val(row, mapping["sector"]);
      const subSector = val(row, mapping["sub_sector"]);
      if (sector) tags.push(sector);
      if (subSector && subSector !== sector) tags.push(subSector);

      return {
        full_name,
        email: work_email || val(row, mapping["email"]),
        phone: phone2 || val(row, mapping["phone"]),
        position: val(row, mapping["position"]),
        company: val(row, mapping["company"]),
        sector: tags.length > 0 ? tags.join(", ") : undefined,
        postal_address: val(row, mapping["postal_address"]),
        linkedin_url: val(row, mapping["linkedin_url"]),
        work_email,
        personal_email,
        mobile_phone,
        work_phone,
        company_domain: val(row, mapping["company_domain"]),
        company_website: val(row, mapping["company_website"]),
        company_description: val(row, mapping["company_description"]),
        sub_sector: subSector,
      } as ParsedRow;
    })
    .filter(Boolean) as ParsedRow[];
}

export default function ContactImporter({ open, onOpenChange, onComplete }: ContactImporterProps) {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: number; updated: number } | null>(null);
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

      // Cache orgs
      const orgCache = new Map<string, string>();
      const { data: existingOrgs } = await supabase.from("organizations").select("id, name");
      existingOrgs?.forEach((o) => orgCache.set(o.name.toLowerCase(), o.id));

      // Cache existing contacts for upsert
      const { data: existingContacts } = await supabase.from("contacts").select("id, full_name");
      const contactCache = new Map<string, string>();
      existingContacts?.forEach((c) => contactCache.set(c.full_name.toLowerCase(), c.id));

      let success = 0;
      let errors = 0;
      let updated = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          // Resolve or create organization
          let orgId: string | null = null;
          if (row.company) {
            const key = row.company.toLowerCase();
            if (orgCache.has(key)) {
              orgId = orgCache.get(key)!;
              // Update org with richer data if available
              const orgUpdates: any = {};
              if (row.company_website) orgUpdates.website = row.company_website;
              if (row.sector) orgUpdates.sector = row.sector.split(", ")[0];
              if (row.company_description) orgUpdates.notes = row.company_description;
              if (row.company_domain) {
                const website = row.company_website || `https://${row.company_domain}`;
                orgUpdates.website = orgUpdates.website || website;
              }
              if (Object.keys(orgUpdates).length > 0) {
                await supabase.from("organizations").update(orgUpdates).eq("id", orgId);
              }
            } else {
              const orgInsert: { name: string; created_by: string; website?: string; sector?: string; notes?: string } = { name: row.company, created_by: user!.id };
              if (row.company_website) orgInsert.website = row.company_website;
              else if (row.company_domain) orgInsert.website = `https://${row.company_domain}`;
              if (row.sector) orgInsert.sector = row.sector.split(", ")[0];
              if (row.company_description) orgInsert.notes = row.company_description;
              const { data: newOrg } = await supabase
                .from("organizations")
                .insert(orgInsert)
                .select("id")
                .single();
              if (newOrg) {
                orgId = newOrg.id;
                orgCache.set(key, newOrg.id);
              }
            }
          }

          const tags = row.sector ? row.sector.split(", ") : [];
          const existingId = contactCache.get(row.full_name.toLowerCase());

          if (existingId) {
            // Upsert: update only null/empty fields
            const updates: Record<string, any> = {};
            const setIfEmpty = (field: string, value: any) => {
              if (value) updates[field] = value;
            };
            setIfEmpty("email", row.email);
            setIfEmpty("phone", row.phone);
            setIfEmpty("position", row.position);
            setIfEmpty("linkedin_url", row.linkedin_url);
            setIfEmpty("work_email", row.work_email);
            setIfEmpty("personal_email", row.personal_email);
            setIfEmpty("mobile_phone", row.mobile_phone);
            setIfEmpty("work_phone", row.work_phone);
            setIfEmpty("company_domain", row.company_domain);
            setIfEmpty("postal_address", row.postal_address);
            if (orgId) updates.organization_id = orgId;
            if (tags.length > 0) updates.tags = tags;

            if (Object.keys(updates).length > 0) {
              // Only update fields that are currently null in the DB
              const { data: current } = await supabase
                .from("contacts")
                .select("email, phone, position, linkedin_url, work_email, personal_email, mobile_phone, work_phone, company_domain, postal_address, organization_id, tags")
                .eq("id", existingId)
                .single();

              if (current) {
                const finalUpdates: Record<string, any> = {};
                for (const [k, v] of Object.entries(updates)) {
                  if (k === "tags") {
                    if (!current.tags || current.tags.length === 0) finalUpdates.tags = v;
                  } else if (!(current as any)[k]) {
                    finalUpdates[k] = v;
                  }
                }
                if (Object.keys(finalUpdates).length > 0) {
                  await supabase.from("contacts").update(finalUpdates).eq("id", existingId);
                  updated++;
                }
              }
            }
          } else {
            const { error } = await supabase.from("contacts").insert({
              full_name: row.full_name,
              email: row.email || null,
              phone: row.phone || null,
              position: row.position || null,
              organization_id: orgId,
              tags,
              postal_address: row.postal_address || null,
              linkedin_url: row.linkedin_url || null,
              work_email: row.work_email || null,
              personal_email: row.personal_email || null,
              mobile_phone: row.mobile_phone || null,
              work_phone: row.work_phone || null,
              company_domain: row.company_domain || null,
              created_by: user!.id,
            });

            if (error) errors++;
            else {
              success++;
              contactCache.set(row.full_name.toLowerCase(), "inserted");
            }
          }
        } catch {
          errors++;
        }

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      setResult({ success, errors, updated });
      setImporting(false);
      if (success > 0 || updated > 0) onComplete();
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
              {result.updated > 0 && (
                <p className="text-sm text-muted-foreground mt-1">{result.updated} contactos actualizados</p>
              )}
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
                Formatos soportados
              </p>
              <p className="text-xs text-muted-foreground">
                CSV de Apollo, Lusha o genérico. Columnas: Nombre, Email, Teléfono, Cargo, Empresa, LinkedIn, Sector, Dominio.
                Los contactos duplicados se actualizan automáticamente.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
