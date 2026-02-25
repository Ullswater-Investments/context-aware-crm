import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Search, Mail, Phone, Briefcase, LayoutGrid, List, GripVertical, Sparkles, FilterX, FileSpreadsheet, AlertTriangle, Tag } from "lucide-react";
import ContactProfile from "@/components/contacts/ContactProfile";
import ContactImporter from "@/components/contacts/ContactImporter";

const PIPELINE_COLUMNS = [
  { key: "new_lead", label: "Nuevo Lead", color: "bg-blue-500/10 border-blue-500/30" },
  { key: "contacted", label: "Contactado", color: "bg-yellow-500/10 border-yellow-500/30" },
  { key: "proposal_sent", label: "Propuesta Enviada", color: "bg-purple-500/10 border-purple-500/30" },
  { key: "client", label: "Cliente", color: "bg-green-500/10 border-green-500/30" },
  { key: "lost", label: "Perdido", color: "bg-red-500/10 border-red-500/30" },
];

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  organization_id: string | null;
  organizations?: { name: string } | null;
  status: string;
  tags: string[] | null;
  notes: string | null;
  linkedin_url?: string | null;
  company_domain?: string | null;
  work_email?: string | null;
  personal_email?: string | null;
  mobile_phone?: string | null;
  work_phone?: string | null;
  lusha_status?: string | null;
  last_enriched_at?: string | null;
}

function hasMissingData(c: Contact): boolean {
  const hasEmail = !!(c.email || c.work_email || c.personal_email);
  const hasPhone = !!(c.phone || c.mobile_phone || c.work_phone);
  return !hasEmail || !hasPhone;
}

function MissingDataAlert() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Faltan datos de contacto</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [lushaFilter, setLushaFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", position: "", organization_id: "", linkedin_url: "", company_domain: "" });
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*, organizations(name)")
      .order("created_at", { ascending: false });
    if (data) setContacts(data as Contact[]);
  }, []);

  useEffect(() => {
    load();
    supabase.from("organizations").select("id, name").order("name").then(({ data }) => { if (data) setOrgs(data); });
  }, [load]);

  const create = async () => {
    const insert: any = {
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      position: form.position || null,
      linkedin_url: form.linkedin_url || null,
      company_domain: form.company_domain || null,
      created_by: user!.id,
    };
    if (form.organization_id) insert.organization_id = form.organization_id;
    const { error } = await supabase.from("contacts").insert(insert);
    if (error) { toast.error(error.message); return; }
    toast.success("Contacto creado");
    setForm({ full_name: "", email: "", phone: "", position: "", organization_id: "", linkedin_url: "", company_domain: "" });
    setOpen(false);
    load();
  };

  const updateStatus = async (contactId: string, newStatus: string) => {
    const { error } = await supabase
      .from("contacts")
      .update({ status: newStatus } as any)
      .eq("id", contactId);
    if (error) toast.error(error.message);
    else load();
  };

  const openProfile = (contact: Contact) => {
    setSelectedContact(contact);
    setProfileOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    setDraggedId(contactId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggedId) {
      updateStatus(draggedId, status);
      setDraggedId(null);
    }
  };

  const filtered = contacts.filter((c) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      c.full_name.toLowerCase().includes(searchLower) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.position?.toLowerCase().includes(searchLower) ||
      c.organizations?.name?.toLowerCase().includes(searchLower) ||
      (c.tags || []).some((t) => t.toLowerCase().includes(searchLower));
    const matchesLusha = !lushaFilter || lushaFilter === "all" || c.lusha_status === lushaFilter;
    const matchesPosition = !positionFilter || c.position?.toLowerCase().includes(positionFilter.toLowerCase());
    return matchesSearch && matchesLusha && matchesPosition;
  });

  const getColumnContacts = (status: string) =>
    filtered
      .filter((c) => c.status === status)
      .sort((a, b) => {
        const score = (c: Contact) => {
          const hasEmail = !!(c.email || c.work_email || c.personal_email);
          const hasPhone = !!(c.phone || c.mobile_phone || c.work_phone);
          if (hasEmail && hasPhone) return 0;
          if (hasEmail) return 1;
          return 2;
        };
        return score(a) - score(b);
      });

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Contactos</h1>
          <p className="text-muted-foreground">Gestiona personas y embudo de ventas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="border rounded-lg flex">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-sm rounded-l-lg transition-colors ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm rounded-r-lg transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" onClick={() => setImporterOpen(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nuevo contacto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo contacto</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nombre *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Cargo</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
                <div>
                  <Label>Empresa</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })}>
                    <option value="">Sin empresa</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div><Label>LinkedIn URL</Label><Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
                <div><Label>Dominio empresa</Label><Input value={form.company_domain} onChange={(e) => setForm({ ...form, company_domain: e.target.value })} placeholder="empresa.com" /></div>
                <Button onClick={create} disabled={!form.full_name} className="w-full">Crear contacto</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, email, cargo, etiqueta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={lushaFilter} onValueChange={setLushaFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Estado Lusha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="enriched">Enriquecido</SelectItem>
            <SelectItem value="not_found">No encontrado</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Filtrar por cargo..." value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="pl-10" />
        </div>
        {(search || lushaFilter || positionFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setLushaFilter(""); setPositionFilter(""); }}>
            <FilterX className="w-4 h-4 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {view === "kanban" ? (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => {
            const columnContacts = getColumnContacts(col.key);
            return (
              <div
                key={col.key}
                className={`flex-shrink-0 w-72 rounded-xl border p-3 min-h-[400px] ${col.color}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">
                    {columnContacts.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {columnContacts.map((c) => {
                    const missing = hasMissingData(c);
                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, c.id)}
                        onClick={() => openProfile(c)}
                        className={`bg-background rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow ${
                          draggedId === c.id ? "opacity-50" : ""
                        } ${missing ? "border-destructive/50 ring-1 ring-destructive/20" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5 cursor-grab" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-sm truncate">{c.full_name}</p>
                              {(c as any).lusha_status === "enriched" && <Sparkles className="w-3 h-3 text-green-500 shrink-0" />}
                              {missing && <MissingDataAlert />}
                            </div>
                            {c.organizations?.name && (
                              <p className="text-xs text-muted-foreground truncate">{c.organizations.name}</p>
                            )}
                            {c.position && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                <Briefcase className="w-3 h-3" />{c.position}
                              </p>
                            )}
                            {c.email && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />{c.email}
                              </p>
                            )}
                            {(c.phone || c.mobile_phone || c.work_phone) && (
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />{c.phone || c.mobile_phone || c.work_phone}
                              </p>
                            )}
                            {(c.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(c.tags || []).slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                                    <Tag className="w-2.5 h-2.5" />{tag}
                                  </Badge>
                                ))}
                                {(c.tags || []).length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">+{(c.tags || []).length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const missing = hasMissingData(c);
            return (
              <Card
                key={c.id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  missing ? "border-destructive/50 ring-1 ring-destructive/20" : ""
                }`}
                onClick={() => openProfile(c)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-base truncate">{c.full_name}</CardTitle>
                        {missing && <MissingDataAlert />}
                      </div>
                      {c.organizations?.name && <p className="text-sm text-muted-foreground">{c.organizations.name}</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {c.position && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Briefcase className="w-3.5 h-3.5" />{c.position}</div>}
                  {c.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{c.email}</div>}
                  {(c.phone || c.mobile_phone || c.work_phone) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />{c.phone || c.mobile_phone || c.work_phone}
                    </div>
                  )}
                  {(c.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(c.tags || []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs gap-1">
                          <Tag className="w-3 h-3" />{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay contactos todavía</p>
        </div>
      )}

      {/* Contact Importer */}
      <ContactImporter
        open={importerOpen}
        onOpenChange={setImporterOpen}
        onComplete={load}
      />

      {/* Contact Profile Dialog */}
      <ContactProfile
        contact={selectedContact}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onUpdate={() => { load(); if (selectedContact) {
          supabase.from("contacts").select("*, organizations(name)").eq("id", selectedContact.id).single().then(({ data }) => {
            if (data) setSelectedContact(data as Contact);
          });
        }}}
      />
    </div>
  );
}
