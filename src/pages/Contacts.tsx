import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Search, Mail, Phone, Briefcase, LayoutGrid, List, GripVertical, Sparkles, FilterX, FileSpreadsheet, AlertTriangle, Tag, Globe, Linkedin, Loader2, MapPin, Zap, MessageSquare, Trash2, RotateCcw, XCircle, AlertCircle, ShieldAlert } from "lucide-react";
import ContactProfile from "@/components/contacts/ContactProfile";
import ContactImporter from "@/components/contacts/ContactImporter";
import HunterSearch from "@/components/contacts/HunterSearch";
import ComposeEmail from "@/components/email/ComposeEmail";
import WhatsAppChat from "@/components/whatsapp/WhatsAppChat";
import { Progress } from "@/components/ui/progress";
import { Contact } from "@/types/contact";

const PIPELINE_COLUMNS = [
  { key: "new_lead", label: "Nuevo Lead", color: "bg-blue-500/10 border-blue-500/30" },
  { key: "contacted", label: "Contactado", color: "bg-yellow-500/10 border-yellow-500/30" },
  { key: "proposal_sent", label: "Propuesta Enviada", color: "bg-purple-500/10 border-purple-500/30" },
  { key: "client", label: "Cliente", color: "bg-green-500/10 border-green-500/30" },
  { key: "lost", label: "Perdido", color: "bg-red-500/10 border-red-500/30" },
];

const VALID_DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;

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
  const [hunterFilter, setHunterFilter] = useState("");
  const [apolloFilter, setApolloFilter] = useState("");
  const [findymailFilter, setFindymailFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [importerOpen, setImporterOpen] = useState(false);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", position: "", organization_id: "", linkedin_url: "", company_domain: "", postal_address: "", work_email: "", personal_email: "", mobile_phone: "", work_phone: "" });
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hunterOpen, setHunterOpen] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichingApolloId, setEnrichingApolloId] = useState<string | null>(null);
  const [enrichingLushaId, setEnrichingLushaId] = useState<string | null>(null);
  const [enrichingFindymailId, setEnrichingFindymailId] = useState<string | null>(null);
  const [emailContact, setEmailContact] = useState<{ id: string; email: string } | null>(null);
  const [whatsappContact, setWhatsappContact] = useState<Contact | null>(null);
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ processed: 0, total: 0 });
  const [showTrash, setShowTrash] = useState(false);
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());
  const [detectingBounces, setDetectingBounces] = useState(false);

  const loadInvalidEmails = useCallback(async () => {
    const { data } = await supabase.from("invalid_emails").select("email_address").limit(5000);
    if (data) setInvalidEmails(new Set(data.map((d: any) => d.email_address.toLowerCase())));
  }, []);

  const isEmailInvalid = (contact: Contact): boolean => {
    const emails = [contact.email, contact.work_email, contact.personal_email].filter(Boolean).map(e => e!.toLowerCase());
    return emails.some(e => invalidEmails.has(e));
  };

  const detectBounces = async () => {
    setDetectingBounces(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-bounces");
      if (error) throw error;
      if (data?.inserted > 0) {
        toast.success(`${data.inserted} emails inválidos detectados`);
        loadInvalidEmails();
      } else {
        toast.info("No se detectaron nuevos emails inválidos");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al detectar bounces");
    } finally {
      setDetectingBounces(false);
    }
  };

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*, organizations(name)")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (data) {
      setContacts(data as Contact[]);
      if (data.length === 2000) {
        toast.warning("Mostrando los primeros 2000 contactos. Usa los filtros para acotar la búsqueda.");
      }
    }
  }, []);

  useEffect(() => {
    load();
    loadInvalidEmails();
    supabase.from("organizations").select("id, name").order("name").then(({ data }) => { if (data) setOrgs(data); });
  }, [load, loadInvalidEmails]);

  // --- Trash functions ---
  const moveToTrash = async (contactId: string) => {
    const { error } = await supabase.from("contacts").update({ status: "trash" as any, trashed_at: new Date().toISOString() } as any).eq("id", contactId);
    if (error) { toast.error(error.message); return; }
    toast.success("Contacto movido a la papelera");
    load();
  };

  const restoreFromTrash = async (contactId: string) => {
    const { error } = await supabase.from("contacts").update({ status: "new_lead" as any, trashed_at: null } as any).eq("id", contactId);
    if (error) { toast.error(error.message); return; }
    toast.success("Contacto restaurado");
    load();
  };

  const permanentDelete = async (contactId: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", contactId);
    if (error) { toast.error(error.message); return; }
    toast.success("Contacto eliminado permanentemente");
    load();
  };

  const emptyTrash = async () => {
    const trashIds = contacts.filter(c => c.status === "trash").map(c => c.id);
    if (trashIds.length === 0) return;
    const { error } = await supabase.from("contacts").delete().in("id", trashIds);
    if (error) { toast.error(error.message); return; }
    toast.success(`${trashIds.length} contactos eliminados permanentemente`);
    load();
  };

  const enrichWithLusha = async (c: Contact) => {
    setEnrichingLushaId(c.id);
    try {
      const nameParts = c.full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const { data, error } = await supabase.functions.invoke("enrich-lusha-contact", {
        body: { contact_id: c.id, first_name: firstName, last_name: lastName, company_name: c.organizations?.name || "", linkedin_url: c.linkedin_url || "" },
      });
      if (error) throw error;
      if (data?.status === "enriched") toast.success("Contacto enriquecido con Lusha");
      else toast.info("Lusha no encontró datos adicionales");
      load();
    } catch (err: any) {
      toast.error(err.message || "Error al enriquecer con Lusha");
    } finally {
      setEnrichingLushaId(null);
    }
  };

  const enrichWithApollo = async (contactId: string, fullName: string, companyDomain?: string | null, email?: string | null, linkedinUrl?: string | null) => {
    setEnrichingApolloId(contactId);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-apollo-contact", {
        body: { contact_id: contactId, full_name: fullName, company_domain: companyDomain || undefined, email: email || undefined, linkedin_url: linkedinUrl || undefined },
      });
      if (error) throw error;
      if (data?.status === "enriched") toast.success("Contacto enriquecido con Apollo.io");
      else toast.info("Apollo.io no encontró datos adicionales");
      load();
    } catch (err: any) {
      toast.error(err.message || "Error al enriquecer con Apollo.io");
    } finally {
      setEnrichingApolloId(null);
    }
  };

  const enrichWithHunter = async (contactId: string, fullName: string, companyDomain: string) => {
    const cleanDomain = companyDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!VALID_DOMAIN_REGEX.test(cleanDomain)) {
      toast.error("El dominio no tiene un formato válido (ej: empresa.com)");
      return;
    }
    setEnrichingId(contactId);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-hunter-contact", {
        body: { contact_id: contactId, domain: cleanDomain, full_name: fullName },
      });
      if (error) throw error;
      if (data?.status === "enriched") toast.success("Contacto enriquecido con Hunter.io");
      else toast.info("No se encontraron datos adicionales");
      load();
    } catch (err: any) {
      toast.error(err.message || "Error al enriquecer con Hunter.io");
    } finally {
      setEnrichingId(null);
    }
  };

  const quickFixEmail = async (c: Contact) => {
    const postalEmail = c.postal_address && EMAIL_REGEX.test(c.postal_address.trim()) ? c.postal_address.trim() : null;
    const fallback = c.work_email || c.personal_email || postalEmail;
    if (!fallback) return;
    const updates: Record<string, any> = { email: fallback };
    if (!c.company_domain && fallback.includes("@")) {
      updates.company_domain = fallback.split("@")[1];
    }
    if (postalEmail && fallback === postalEmail) {
      updates.postal_address = null;
    }
    const { error } = await supabase.from("contacts").update(updates).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Email corregido: ${fallback}`);
    load();
  };

  const bulkFixEmails = async () => {
    const fixable = contacts.filter(c => {
      if (c.email) return false;
      const postalEmail = c.postal_address && EMAIL_REGEX.test(c.postal_address.trim()) ? c.postal_address.trim() : null;
      return !!(c.work_email || c.personal_email || postalEmail);
    });
    if (fixable.length === 0) return;
    let fixed = 0;
    for (const c of fixable) {
      const postalEmail = c.postal_address && EMAIL_REGEX.test(c.postal_address.trim()) ? c.postal_address.trim() : null;
      const fallback = c.work_email || c.personal_email || postalEmail;
      const updates: Record<string, any> = { email: fallback };
      if (!c.company_domain && fallback && fallback.includes("@")) {
        updates.company_domain = fallback.split("@")[1];
      }
      if (postalEmail && fallback === postalEmail) {
        updates.postal_address = null;
      }
      const { error } = await supabase.from("contacts").update(updates).eq("id", c.id);
      if (!error) fixed++;
    }
    toast.success(`${fixed} emails corregidos de ${fixable.length}`);
    load();
  };

  const enrichWithFindymailFromCard = async (c: Contact) => {
    if (!c.company_domain) return;
    setEnrichingFindymailId(c.id);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-findymail-contact", {
        body: { contact_id: c.id, full_name: c.full_name, domain: c.company_domain },
      });
      if (error) throw error;
      if (data?.error_code) {
        toast.error(data.message || `Error Findymail: ${data.error_code}`);
      } else if (data?.status === "enriched") {
        toast.success(`Email encontrado con Findymail: ${data.email}`);
      } else if (data?.status === "not_found") {
        toast.info("Findymail no encontró datos para este contacto");
      } else {
        toast.info("Findymail no encontró datos");
      }
      load();
    } catch (err: any) {
      toast.error(err.message || "Error de conexión con Findymail");
    } finally {
      setEnrichingFindymailId(null);
    }
  };

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const create = async () => {
    if (form.email && !EMAIL_REGEX.test(form.email)) {
      toast.error("El formato del email principal no es válido");
      return;
    }
    const emailValue = form.email || form.work_email || form.personal_email || null;
    const domainValue = form.company_domain || (emailValue && emailValue.includes("@") ? emailValue.split("@")[1] : null);
    const insert: any = {
      full_name: form.full_name, email: emailValue, phone: form.phone || null,
      position: form.position || null, linkedin_url: form.linkedin_url || null,
      company_domain: domainValue, postal_address: form.postal_address || null,
      work_email: form.work_email || null, personal_email: form.personal_email || null,
      mobile_phone: form.mobile_phone || null, work_phone: form.work_phone || null,
      created_by: user!.id,
    };
    if (form.organization_id) insert.organization_id = form.organization_id;
    const { error } = await supabase.from("contacts").insert(insert);
    if (error) { toast.error(error.message); return; }
    toast.success("Contacto creado");
    setForm({ full_name: "", email: "", phone: "", position: "", organization_id: "", linkedin_url: "", company_domain: "", postal_address: "", work_email: "", personal_email: "", mobile_phone: "", work_phone: "" });
    setOpen(false);
    load();
  };

  const updateStatus = async (contactId: string, newStatus: string) => {
    const { error } = await supabase.from("contacts").update({ status: newStatus } as any).eq("id", contactId);
    if (error) toast.error(error.message);
    else load();
  };

  const openProfile = (contact: Contact) => { setSelectedContact(contact); setProfileOpen(true); };

  const handleDragStart = (e: React.DragEvent, contactId: string) => { setDraggedId(contactId); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDrop = (e: React.DragEvent, status: string) => { e.preventDefault(); if (draggedId) { updateStatus(draggedId, status); setDraggedId(null); } };

  const trashCount = contacts.filter(c => c.status === "trash").length;

  const filtered = contacts.filter((c) => {
    // Separate trash from normal view
    if (showTrash) return c.status === "trash";
    if (c.status === "trash") return false;

    const searchLower = search.toLowerCase();
    const matchesSearch = !search || c.full_name.toLowerCase().includes(searchLower) || c.email?.toLowerCase().includes(searchLower) || c.position?.toLowerCase().includes(searchLower) || c.organizations?.name?.toLowerCase().includes(searchLower) || (c.tags || []).some((t) => t.toLowerCase().includes(searchLower));
    const matchesLusha = !lushaFilter || lushaFilter === "all" || c.lusha_status === lushaFilter;
    const matchesHunter = !hunterFilter || hunterFilter === "all" || c.hunter_status === hunterFilter;
    const matchesApollo = !apolloFilter || apolloFilter === "all" || c.apollo_status === apolloFilter;
    const matchesFindymail = !findymailFilter || findymailFilter === "all" || c.findymail_status === findymailFilter;
    return matchesSearch && matchesLusha && matchesHunter && matchesApollo && matchesFindymail;
  });

  const getColumnContacts = (status: string) =>
    filtered.filter((c) => c.status === status).sort((a, b) => {
      const score = (c: Contact) => {
        const hasEmail = !!(c.email || c.work_email || c.personal_email);
        const hasPhone = !!(c.phone || c.mobile_phone || c.work_phone);
        if (hasEmail && hasPhone) return 0;
        if (hasEmail) return 1;
        return 2;
      };
      return score(a) - score(b);
    });

  const pendingCount = contacts.filter(c => c.status !== "trash" && hasMissingData(c)).length;

  const bulkEnrichAll = async () => {
    setBulkEnriching(true);
    setBulkProgress({ processed: 0, total: pendingCount });
    let lastId = "";
    let totalProcessed = 0;
    try {
      while (true) {
        const { data, error } = await supabase.functions.invoke("bulk-enrich", {
          body: { last_id: lastId, services: ["hunter", "apollo", "lusha", "findymail"] },
        });
        if (error) throw error;
        totalProcessed += data.processed || 0;
        setBulkProgress({ processed: totalProcessed, total: pendingCount });
        if (data.done || !data.last_id) break;
        lastId = data.last_id;
        load();
      }
      toast.success(`Enriquecimiento completado: ${totalProcessed} contactos procesados`);
    } catch (err: any) {
      toast.error(err.message || "Error en enriquecimiento masivo");
    } finally {
      setBulkEnriching(false);
      load();
    }
  };

  // Render a trash action button for kanban/list cards
  const TrashCardButton = ({ contactId, className = "" }: { contactId: string; className?: string }) => (
    <button
      onClick={(e) => { e.stopPropagation(); moveToTrash(contactId); }}
      className={`p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all ${className}`}
      title="Enviar a la papelera"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold">Contactos</h1>
            <p className="text-muted-foreground">Gestiona personas y embudo de ventas</p>
          </div>
          {pendingCount > 0 && !showTrash && (
            <Badge variant="destructive" className="text-xs">{pendingCount} sin datos</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!showTrash && (
            <div className="border rounded-lg flex">
              <button onClick={() => setView("kanban")} className={`px-3 py-1.5 text-sm rounded-l-lg transition-colors ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm rounded-r-lg transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
          <Button
            variant={showTrash ? "default" : "outline"}
            size="sm"
            onClick={() => setShowTrash(!showTrash)}
            className={showTrash ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Papelera{trashCount > 0 && ` (${trashCount})`}
          </Button>
          {showTrash && trashCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <XCircle className="w-4 h-4 mr-1" />Vaciar papelera
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Vaciar papelera?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán permanentemente {trashCount} contacto(s). Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={emptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar todo</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!showTrash && (
            <>
              <Button variant="outline" onClick={() => setHunterOpen(true)}><Globe className="w-4 h-4 mr-2" />Hunter.io</Button>
              {pendingCount > 0 && (
                <Button variant="outline" onClick={bulkEnrichAll} disabled={bulkEnriching}>
                  {bulkEnriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Enriquecer todos
                </Button>
              )}
              {contacts.some(c => c.status !== "trash" && !c.email && (c.work_email || c.personal_email || (c.postal_address && EMAIL_REGEX.test(c.postal_address.trim())))) && (
                <Button variant="outline" onClick={bulkFixEmails} disabled={bulkEnriching}>
                  <Mail className="w-4 h-4 mr-2" />Corregir emails
                </Button>
              )}
              <Button variant="outline" onClick={() => setImporterOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-2" />Importar</Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Nuevo contacto</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader><DialogTitle>Nuevo contacto</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>Nombre *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                      <div><Label>Cargo</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
                    </div>
                    <div>
                      <Label>Empresa</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })}>
                        <option value="">Sin empresa</option>
                        {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>Email principal</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                      <div><Label>Email corporativo</Label><Input type="email" value={form.work_email} onChange={(e) => setForm({ ...form, work_email: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>Email personal</Label><Input type="email" value={form.personal_email} onChange={(e) => setForm({ ...form, personal_email: e.target.value })} /></div>
                      <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>Móvil</Label><Input value={form.mobile_phone} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} /></div>
                      <div><Label>Teléfono trabajo</Label><Input value={form.work_phone} onChange={(e) => setForm({ ...form, work_phone: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>LinkedIn URL</Label><Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>
                      <div><Label>Dominio empresa</Label><Input value={form.company_domain} onChange={(e) => setForm({ ...form, company_domain: e.target.value })} placeholder="empresa.com" /></div>
                    </div>
                    <div><Label>Dirección postal</Label><Input value={form.postal_address} onChange={(e) => {
                      const v = e.target.value;
                      if (v.includes("@") && EMAIL_REGEX.test(v.trim())) {
                        setForm({ ...form, email: form.email || v.trim(), postal_address: "" });
                        toast.info("Se detectó un email en Dirección postal. Movido a Email.");
                      } else {
                        setForm({ ...form, postal_address: v });
                      }
                    }} placeholder="C/ Ejemplo, 1, 28001 Madrid" /></div>
                    <Button onClick={create} disabled={!form.full_name} className="w-full">Crear contacto</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {!showTrash && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, email, cargo, etiqueta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={lushaFilter} onValueChange={setLushaFilter}>
            <SelectTrigger><SelectValue placeholder="Estado Lusha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="enriched">Enriquecido</SelectItem>
              <SelectItem value="not_found">No encontrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={hunterFilter} onValueChange={setHunterFilter}>
            <SelectTrigger><SelectValue placeholder="Estado Hunter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="enriched">Enriquecido</SelectItem>
              <SelectItem value="not_found">No encontrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={apolloFilter} onValueChange={setApolloFilter}>
            <SelectTrigger><SelectValue placeholder="Estado Apollo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="enriched">Enriquecido</SelectItem>
              <SelectItem value="not_found">No encontrado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={findymailFilter} onValueChange={setFindymailFilter}>
            <SelectTrigger><SelectValue placeholder="Estado Findymail" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="enriched">Enriquecido</SelectItem>
              <SelectItem value="not_found">No encontrado</SelectItem>
            </SelectContent>
          </Select>
          {(search || lushaFilter || hunterFilter || apolloFilter || findymailFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setLushaFilter(""); setHunterFilter(""); setApolloFilter(""); setFindymailFilter(""); }}>
              <FilterX className="w-4 h-4 mr-1" /> Limpiar
            </Button>
          )}
        </div>
      )}

      {bulkEnriching && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Enriqueciendo contactos...</span>
            <span>{bulkProgress.processed} / {bulkProgress.total}</span>
          </div>
          <Progress value={bulkProgress.total > 0 ? (bulkProgress.processed / bulkProgress.total) * 100 : 0} />
        </div>
      )}

      {/* TRASH VIEW */}
      {showTrash ? (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>La papelera está vacía</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-accent" /></div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{c.full_name}</CardTitle>
                        {c.organizations?.name && <p className="text-sm text-muted-foreground">{c.organizations.name}</p>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {c.position && <p className="text-sm text-muted-foreground mb-2">{c.position}</p>}
                    {c.email && <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</p>}
                    <div className="flex items-center gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => restoreFromTrash(c.id)}>
                        <RotateCcw className="w-4 h-4 mr-1" />Restaurar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <XCircle className="w-4 h-4 mr-1" />Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará "{c.full_name}" de forma permanente. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => permanentDelete(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => {
            const columnContacts = getColumnContacts(col.key);
            return (
              <div key={col.key} className={`flex-shrink-0 w-72 rounded-xl border p-3 min-h-[400px] ${col.color}`} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.key)}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5">{columnContacts.length}</span>
                </div>
                <div className="space-y-2">
                  {columnContacts.map((c) => {
                    const missing = hasMissingData(c);
                    return (
                      <div key={c.id} draggable onDragStart={(e) => handleDragStart(e, c.id)} onClick={() => openProfile(c)}
                        className={`group relative bg-background rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow ${draggedId === c.id ? "opacity-50" : ""} ${missing ? "border-destructive/50 ring-1 ring-destructive/20" : ""}`}>
                        <TrashCardButton contactId={c.id} className="absolute top-2 right-2" />
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5 cursor-grab" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-sm truncate">{c.full_name}</p>
                              {c.lusha_status === "enriched" && <Sparkles className="w-3 h-3 text-green-500 shrink-0" />}
                              {c.hunter_status === "enriched" && <Globe className="w-3 h-3 text-green-500 shrink-0" />}
                              {c.hunter_status === "not_found" && <Globe className="w-3 h-3 text-orange-500 shrink-0" />}
                              {c.apollo_status === "enriched" && <Sparkles className="w-3 h-3 text-blue-500 shrink-0" />}
                              {c.apollo_status === "not_found" && <Sparkles className="w-3 h-3 text-orange-500 shrink-0" />}
                              {c.findymail_status === "enriched" && <Mail className="w-3 h-3 text-green-500 shrink-0" />}
                              {c.findymail_status === "not_found" && <Mail className="w-3 h-3 text-orange-500 shrink-0" />}
                              {missing && <MissingDataAlert />}
                            </div>
                            {c.organizations?.name && <p className="text-xs text-muted-foreground truncate">{c.organizations.name}</p>}
                            {c.position && <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><Briefcase className="w-3 h-3" />{c.position}</p>}
                            {c.email ? (
                              <button onClick={(e) => { e.stopPropagation(); setEmailContact({ id: c.id, email: c.email! }); }}
                                className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5 hover:text-primary transition-colors">
                                <Mail className="w-3 h-3" />{c.email}
                              </button>
                            ) : (c.work_email || c.personal_email || (c.postal_address && EMAIL_REGEX.test(c.postal_address.trim()))) ? (
                              <button onClick={(e) => { e.stopPropagation(); quickFixEmail(c); }}
                                className="text-xs text-amber-600 truncate flex items-center gap-1 mt-0.5 hover:text-amber-700 transition-colors">
                                <Zap className="w-3 h-3" />Corregir email ({c.work_email || c.personal_email || c.postal_address})
                              </button>
                            ) : (
                              <p className="text-xs text-muted-foreground/50 truncate flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />Sin email</p>
                            )}
                            {(c.phone || c.mobile_phone || c.work_phone) ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone || c.mobile_phone || c.work_phone}</p>
                                <button onClick={(e) => { e.stopPropagation(); setWhatsappContact(c); }} className="p-1 rounded-md bg-[#25d366]/15 hover:bg-[#25d366]/25 text-[#25d366] transition-colors" title="WhatsApp">
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground/50 truncate flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />Sin teléfono</p>
                            )}
                            {c.postal_address && <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{c.postal_address}</p>}
                            {c.work_email && c.work_email !== c.email && <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />Corp: {c.work_email}</p>}
                            {c.mobile_phone && c.phone && c.mobile_phone !== c.phone && <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />Móvil: {c.mobile_phone}</p>}
                            {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5 hover:text-primary"><Linkedin className="w-3 h-3" />LinkedIn</a>}
                            {c.company_domain && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <a href={c.company_domain.startsWith('http') ? c.company_domain : `https://${c.company_domain}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-muted-foreground truncate flex items-center gap-1 hover:text-primary"><Globe className="w-3 h-3" />{c.company_domain}</a>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {c.company_domain && (c.hunter_status === "pending" || c.hunter_status === "not_found") && (
                                <button onClick={(e) => { e.stopPropagation(); enrichWithHunter(c.id, c.full_name, c.company_domain!); }} disabled={enrichingId === c.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-0.5 shrink-0">
                                  {enrichingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}Hunter
                                </button>
                              )}
                              {(c.company_domain || c.linkedin_url) && (c.apollo_status === "pending" || c.apollo_status === "not_found") && (
                                <button onClick={(e) => { e.stopPropagation(); enrichWithApollo(c.id, c.full_name, c.company_domain, c.email, c.linkedin_url); }} disabled={enrichingApolloId === c.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-0.5 shrink-0">
                                  {enrichingApolloId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Apollo
                                </button>
                              )}
                              {(c.lusha_status === "pending" || c.lusha_status === "not_found") && (
                                <button onClick={(e) => { e.stopPropagation(); enrichWithLusha(c); }} disabled={enrichingLushaId === c.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-0.5 shrink-0">
                                  {enrichingLushaId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Lusha
                                </button>
                              )}
                              {c.company_domain && (c.findymail_status === "pending" || c.findymail_status === "not_found") && (
                                <button onClick={(e) => { e.stopPropagation(); enrichWithFindymailFromCard(c); }} disabled={enrichingFindymailId === c.id}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-0.5 shrink-0">
                                  {enrichingFindymailId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}Findymail
                                </button>
                              )}
                              {(c.phone || c.mobile_phone || c.work_phone) && (
                                <button onClick={(e) => { e.stopPropagation(); setWhatsappContact(c); }}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#25d366]/15 text-[#25d366] hover:bg-[#25d366]/25 transition-colors flex items-center gap-0.5 shrink-0">
                                  <MessageSquare className="w-3 h-3" />WhatsApp
                                </button>
                              )}
                            </div>
                            {(c.tags || []).length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {(c.tags || []).slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5"><Tag className="w-2.5 h-2.5" />{tag}</Badge>
                                ))}
                                {(c.tags || []).length > 3 && <span className="text-[10px] text-muted-foreground">+{(c.tags || []).length - 3}</span>}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const missing = hasMissingData(c);
            return (
              <Card key={c.id} className={`group relative hover:shadow-md transition-shadow cursor-pointer ${missing ? "border-destructive/50 ring-1 ring-destructive/20" : ""}`} onClick={() => openProfile(c)}>
                <TrashCardButton contactId={c.id} className="absolute top-3 right-3 z-10" />
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-accent" /></div>
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
                  {c.email ? (
                    <button onClick={(e) => { e.stopPropagation(); setEmailContact({ id: c.id, email: c.email! }); }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Mail className="w-3.5 h-3.5" />{c.email}
                    </button>
                  ) : (c.work_email || c.personal_email || (c.postal_address && EMAIL_REGEX.test(c.postal_address.trim()))) ? (
                    <button onClick={(e) => { e.stopPropagation(); quickFixEmail(c); }}
                      className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 transition-colors">
                      <Zap className="w-3.5 h-3.5" />Corregir email ({c.work_email || c.personal_email || c.postal_address})
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground/50"><Mail className="w-3.5 h-3.5" />Sin email</div>
                  )}
                  {(c.phone || c.mobile_phone || c.work_phone) ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />{c.phone || c.mobile_phone || c.work_phone}
                      <button onClick={(e) => { e.stopPropagation(); setWhatsappContact(c); }} className="p-1 rounded-md bg-[#25d366]/15 hover:bg-[#25d366]/25 text-[#25d366] transition-colors" title="WhatsApp">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground/50"><Phone className="w-3.5 h-3.5" />Sin teléfono</div>
                  )}
                  {c.postal_address && <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{c.postal_address}</span></div>}
                  {c.work_email && c.work_email !== c.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />Corp: {c.work_email}</div>}
                  {c.mobile_phone && c.phone && c.mobile_phone !== c.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />Móvil: {c.mobile_phone}</div>}
                  {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><Linkedin className="w-3.5 h-3.5" />LinkedIn</a>}
                  {c.company_domain && <a href={c.company_domain.startsWith('http') ? c.company_domain : `https://${c.company_domain}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><Globe className="w-3.5 h-3.5" />{c.company_domain}</a>}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {c.company_domain && (c.hunter_status === "pending" || c.hunter_status === "not_found") && (
                      <button onClick={(e) => { e.stopPropagation(); enrichWithHunter(c.id, c.full_name, c.company_domain!); }} disabled={enrichingId === c.id}
                        className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0">
                        {enrichingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}Hunter
                      </button>
                    )}
                    {(c.company_domain || c.linkedin_url) && (c.apollo_status === "pending" || c.apollo_status === "not_found") && (
                      <button onClick={(e) => { e.stopPropagation(); enrichWithApollo(c.id, c.full_name, c.company_domain, c.email, c.linkedin_url); }} disabled={enrichingApolloId === c.id}
                        className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0">
                        {enrichingApolloId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Apollo
                      </button>
                    )}
                    {(c.lusha_status === "pending" || c.lusha_status === "not_found") && (
                      <button onClick={(e) => { e.stopPropagation(); enrichWithLusha(c); }} disabled={enrichingLushaId === c.id}
                        className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0">
                        {enrichingLushaId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Lusha
                      </button>
                    )}
                    {c.company_domain && (c.findymail_status === "pending" || c.findymail_status === "not_found") && (
                      <button onClick={(e) => { e.stopPropagation(); enrichWithFindymailFromCard(c); }} disabled={enrichingFindymailId === c.id}
                        className="text-xs px-2 py-0.5 rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0">
                        {enrichingFindymailId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}Findymail
                      </button>
                    )}
                    {(c.phone || c.mobile_phone || c.work_phone) && (
                      <button onClick={(e) => { e.stopPropagation(); setWhatsappContact(c); }}
                        className="text-xs px-2 py-0.5 rounded bg-[#25d366]/15 text-[#25d366] hover:bg-[#25d366]/25 transition-colors flex items-center gap-1 shrink-0">
                        <MessageSquare className="w-3 h-3" />WhatsApp
                      </button>
                    )}
                  </div>
                  {(c.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(c.tags || []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs gap-1"><Tag className="w-3 h-3" />{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && !showTrash && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay contactos todavía</p>
        </div>
      )}

      <ContactProfile contact={selectedContact} open={profileOpen} onOpenChange={setProfileOpen} onUpdate={() => { load(); if (selectedContact) { supabase.from("contacts").select("*, organizations(name)").eq("id", selectedContact.id).single().then(({ data }) => { if (data) setSelectedContact(data as Contact); }); } }} />
      <ContactImporter open={importerOpen} onOpenChange={setImporterOpen} onComplete={load} />
      <HunterSearch open={hunterOpen} onOpenChange={setHunterOpen} />
      {emailContact && <ComposeEmail open={!!emailContact} onOpenChange={(o) => { if (!o) setEmailContact(null); }} defaultTo={emailContact.email} contactId={emailContact.id} />}
      {whatsappContact && <WhatsAppChat contact={whatsappContact} open={!!whatsappContact} onOpenChange={(o) => { if (!o) setWhatsappContact(null); }} />}
    </div>
  );
}
