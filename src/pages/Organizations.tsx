import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Building2, Search, Globe, Tag, Pencil, Trash2, Users } from "lucide-react";

interface Org {
  id: string;
  name: string;
  sector: string | null;
  country: string | null;
  org_type: string | null;
  website: string | null;
  notes: string | null;
}

const emptyForm = { name: "", sector: "", country: "", org_type: "partner", website: "", notes: "" };

export default function Organizations() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editOrg, setEditOrg] = useState<Org | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOrg, setDeleteOrg] = useState<Org | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
    if (data) {
      setOrgs(data);
      // Load contact counts
      const { data: contacts } = await supabase.from("contacts").select("organization_id");
      if (contacts) {
        const counts: Record<string, number> = {};
        contacts.forEach((c: any) => { if (c.organization_id) counts[c.organization_id] = (counts[c.organization_id] || 0) + 1; });
        setContactCounts(counts);
      }
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const { error } = await supabase.from("organizations").insert({ ...form, created_by: user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Empresa creada");
    setForm(emptyForm);
    setOpen(false);
    load();
  };

  const openEdit = (o: Org) => {
    setEditOrg(o);
    setEditForm({ name: o.name, sector: o.sector || "", country: o.country || "", org_type: o.org_type || "partner", website: o.website || "", notes: o.notes || "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editOrg) return;
    const { error } = await supabase.from("organizations").update({
      name: editForm.name,
      sector: editForm.sector || null,
      country: editForm.country || null,
      org_type: editForm.org_type,
      website: editForm.website || null,
      notes: editForm.notes || null,
    }).eq("id", editOrg.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Empresa actualizada");
    setEditOpen(false);
    load();
  };

  const confirmDelete = async () => {
    if (!deleteOrg) return;
    const { error } = await supabase.from("organizations").delete().eq("id", deleteOrg.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Empresa eliminada");
    setDeleteOrg(null);
    load();
  };

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.sector?.toLowerCase().includes(search.toLowerCase()) ||
    o.country?.toLowerCase().includes(search.toLowerCase())
  );

  const OrgForm = ({ f, setF, onSave, disabled, label }: { f: typeof emptyForm; setF: (v: typeof emptyForm) => void; onSave: () => void; disabled: boolean; label: string }) => (
    <div className="space-y-4">
      <div><Label>Nombre *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>Sector</Label><Input value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} /></div>
      <div><Label>País</Label><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
      <div>
        <Label>Tipo</Label>
        <Select value={f.org_type} onValueChange={(v) => setF({ ...f, org_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="partner">Socio</SelectItem>
            <SelectItem value="institution">Institución</SelectItem>
            <SelectItem value="client">Cliente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Web</Label><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} /></div>
      <Button onClick={onSave} disabled={disabled} className="w-full">{label}</Button>
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Empresas</h1>
          <p className="text-muted-foreground">Gestiona organizaciones y socios</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nueva empresa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva empresa</DialogTitle></DialogHeader>
            <OrgForm f={form} setF={setForm} onSave={create} disabled={!form.name} label="Crear empresa" />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar empresas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((o) => (
          <Card key={o.id} className="hover:shadow-md transition-shadow group">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{o.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{o.country}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(o)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteOrg(o)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {o.sector && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="w-3.5 h-3.5" />{o.sector}
                </div>
              )}
              {o.website && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" /><a href={o.website} target="_blank" rel="noreferrer" className="hover:text-primary truncate">{o.website}</a>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">{o.org_type}</span>
                {(contactCounts[o.id] || 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3 h-3" />{contactCounts[o.id]}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay empresas todavía</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar empresa</DialogTitle></DialogHeader>
          <OrgForm f={editForm} setF={setEditForm} onSave={saveEdit} disabled={!editForm.name} label="Guardar cambios" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOrg} onOpenChange={(v) => !v && setDeleteOrg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará "{deleteOrg?.name}" permanentemente. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
