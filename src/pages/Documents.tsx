import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, FileText, Search, Download } from "lucide-react";

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (data) setDocs(data);
  };

  useEffect(() => { load(); }, []);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${user!.id}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
    if (uploadErr) { toast.error("Error al subir archivo"); setUploading(false); return; }
    const { error: dbErr } = await supabase.from("documents").insert({
      name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
      created_by: user!.id,
    });
    if (dbErr) { toast.error(dbErr.message); } else { toast.success("Documento subido"); }
    setUploading(false);
    load();
  };

  const download = async (doc: any) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl);
  };

  const filtered = docs.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Documentos</h1>
          <p className="text-muted-foreground">Almacena y gestiona archivos del equipo</p>
        </div>
        <label>
          <Button asChild disabled={uploading}>
            <span className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Subiendo..." : "Subir documento"}
            </span>
          </Button>
          <input type="file" className="hidden" onChange={upload} />
        </label>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar documentos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => (
          <Card key={d.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => download(d)}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{d.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{d.file_size ? formatSize(d.file_size) : ""}</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString("es")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay documentos todavía</p>
        </div>
      )}
    </div>
  );
}
