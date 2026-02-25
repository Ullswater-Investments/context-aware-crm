import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Star, Upload, Loader2 } from "lucide-react";

export interface Signature {
  id: string;
  name: string;
  image_path: string;
  is_default: boolean;
  created_at: string;
}

interface SignatureManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignaturesChange?: () => void;
}

export default function SignatureManager({ open, onOpenChange, onSignaturesChange }: SignatureManagerProps) {
  const { user } = useAuth();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fetchSignatures = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("email_signatures")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSignatures(data as Signature[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchSignatures();
  }, [open, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("La imagen no puede superar 2MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const upload = async () => {
    if (!user || !file || !name.trim()) {
      toast.error("Nombre e imagen son obligatorios");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("email-signatures")
        .upload(path, file);
      if (storageErr) throw storageErr;

      const isFirst = signatures.length === 0;
      const { error: dbErr } = await supabase.from("email_signatures").insert({
        created_by: user.id,
        name: name.trim(),
        image_path: path,
        is_default: isFirst,
      });
      if (dbErr) throw dbErr;

      toast.success("Firma guardada");
      setName("");
      setFile(null);
      setPreview(null);
      fetchSignatures();
      onSignaturesChange?.();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar firma");
    } finally {
      setUploading(false);
    }
  };

  const setDefault = async (id: string) => {
    if (!user) return;
    await supabase
      .from("email_signatures")
      .update({ is_default: false })
      .eq("created_by", user.id);
    await supabase
      .from("email_signatures")
      .update({ is_default: true })
      .eq("id", id);
    fetchSignatures();
    onSignaturesChange?.();
  };

  const remove = async (sig: Signature) => {
    await supabase.storage.from("email-signatures").remove([sig.image_path]);
    await supabase.from("email_signatures").delete().eq("id", sig.id);
    toast.success("Firma eliminada");
    fetchSignatures();
    onSignaturesChange?.();
  };

  const getPublicUrl = (imagePath: string) => {
    const { data } = supabase.storage
      .from("email-signatures")
      .getPublicUrl(imagePath);
    return data?.publicUrl || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar firmas</DialogTitle>
        </DialogHeader>

        {/* Upload new */}
        <div className="space-y-3 border-b border-border pb-4">
          <div>
            <Label>Nombre de la firma</Label>
            <Input
              placeholder="Ej: Firma principal"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Imagen de firma</Label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent file:text-accent-foreground hover:file:bg-accent/80 mt-1"
            />
          </div>
          {preview && (
            <div className="border border-border rounded-md p-2 bg-muted/30">
              <img src={preview} alt="Preview" className="max-h-24 mx-auto" />
            </div>
          )}
          <Button onClick={upload} disabled={uploading || !file || !name.trim()} size="sm" className="w-full">
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            Guardar firma
          </Button>
        </div>

        {/* Existing signatures */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : signatures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No tienes firmas guardadas</p>
          ) : (
            signatures.map((sig) => (
              <div key={sig.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                <img
                  src={getPublicUrl(sig.image_path)}
                  alt={sig.name}
                  className="h-10 w-auto max-w-[120px] object-contain"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sig.name}</p>
                  {sig.is_default && (
                    <span className="text-[10px] text-primary font-medium">Predeterminada</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!sig.is_default && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDefault(sig.id)} title="Marcar como predeterminada">
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(sig)} title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
