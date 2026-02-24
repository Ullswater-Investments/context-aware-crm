import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Users, Search, Mail, Phone, Briefcase, Send, Clock } from "lucide-react";
import ComposeEmail from "@/components/email/ComposeEmail";

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  organization_id: string | null;
  organizations?: { name: string } | null;
}

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", position: "", organization_id: "" });

  // Email compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Email history state
  const [emailsContact, setEmailsContact] = useState<Contact | null>(null);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [emailsOpen, setEmailsOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*, organizations(name)")
      .order("created_at", { ascending: false });
    if (data) setContacts(data);
  };

  useEffect(() => {
    load();
    supabase.from("organizations").select("id, name").order("name").then(({ data }) => { if (data) setOrgs(data); });
  }, []);

  const create = async () => {
    const insert: any = { full_name: form.full_name, email: form.email || null, phone: form.phone || null, position: form.position || null, created_by: user!.id };
    if (form.organization_id) insert.organization_id = form.organization_id;
    const { error } = await supabase.from("contacts").insert(insert);
    if (error) { toast.error(error.message); return; }
    toast.success("Contacto creado");
    setForm({ full_name: "", email: "", phone: "", position: "", organization_id: "" });
    setOpen(false);
    load();
  };

  const openCompose = (contact: Contact) => {
    setSelectedContact(contact);
    setComposeOpen(true);
  };

  const openEmails = async (contact: Contact) => {
    setEmailsContact(contact);
    setEmailsOpen(true);
    const { data } = await supabase
      .from("email_logs")
      .select("id, to_email, subject, status, sent_at, created_at")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false });
    setEmails((data as EmailLog[]) || []);
  };

  const filtered = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Contactos</h1>
          <p className="text-muted-foreground">Gestiona personas y comunicaciones</p>
        </div>
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
              <Button onClick={create} disabled={!form.full_name} className="w-full">Crear contacto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar contactos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{c.full_name}</CardTitle>
                  {c.organizations?.name && <p className="text-sm text-muted-foreground">{c.organizations.name}</p>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {c.position && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Briefcase className="w-3.5 h-3.5" />{c.position}</div>}
              {c.email && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{c.email}</div>}
              {c.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{c.phone}</div>}
              <div className="flex gap-2 pt-2">
                {c.email && (
                  <Button size="sm" variant="outline" onClick={() => openCompose(c)}>
                    <Send className="w-3.5 h-3.5 mr-1" />Email
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEmails(c)}>
                  <Clock className="w-3.5 h-3.5 mr-1" />Historial
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay contactos todavía</p>
        </div>
      )}

      {/* Compose Email Modal */}
      <ComposeEmail
        open={composeOpen}
        onOpenChange={setComposeOpen}
        defaultTo={selectedContact?.email || ""}
        contactId={selectedContact?.id}
        organizationId={selectedContact?.organization_id || undefined}
        onSent={() => {
          if (emailsContact?.id === selectedContact?.id) openEmails(selectedContact!);
        }}
      />

      {/* Email History Dialog */}
      <Dialog open={emailsOpen} onOpenChange={setEmailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Emails enviados a {emailsContact?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {emails.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay emails enviados a este contacto</p>
            ) : (
              emails.map((e) => (
                <div key={e.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{e.subject}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {e.status === "sent" ? "Enviado" : "Fallido"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.sent_at || e.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
