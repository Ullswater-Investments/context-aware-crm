import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Building2, Search, Globe, Tag } from "lucide-react";

interface Org {
  id: string;
  name: string;
  sector: string | null;
  country: string | null;
  org_type: string | null;
  website: string | null;
  notes: string | null;
}

export default function Organizations() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sector: "", country: "", org_type: "partner", website: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
    if (data) setOrgs(data);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const { error } = await supabase.from("organizations").insert({ ...form, created_by: user!.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Empresa creada");
    setForm({ name: "", sector: "", country: "", org_type: "partner", website: "", notes: "" });
    setOpen(false);
    load();
  };

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.sector?.toLowerCase().includes(search.toLowerCase()) ||
    o.country?.toLowerCase().includes(search.toLowerCase())
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
            <div className="space-y-4">
              <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Sector</Label><Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} /></div>
              <div><Label>País</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.org_type} onValueChange={(v) => setForm({ ...form, org_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner">Socio</SelectItem>
                    <SelectItem value="institution">Institución</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Web</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
              <Button onClick={create} disabled={!form.name} className="w-full">Crear empresa</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar empresas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((o) => (
          <Card key={o.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{o.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{o.country}</p>
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
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">{o.org_type}</span>
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
    </div>
  );
}
