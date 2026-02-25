import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Mail, Server, Trash2, Plus, AlertCircle, ShieldCheck, Loader2, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import AccountStatusDot from "@/components/email/AccountStatusDot";

type EmailAccount = {
  id: string;
  email_address: string;
  display_name: string | null;
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  imap_host: string | null;
  imap_port: number | null;
  imap_user: string | null;
  is_default: boolean;
  is_active: boolean;
  status: string;
  last_check: string | null;
  error_message: string | null;
  created_at: string;
};

const PROVIDER_PRESETS: Record<string, { smtp_host: string; smtp_port: number; smtp_secure: boolean; imap_host: string; imap_port: number }> = {
  hostinger: { smtp_host: "smtp.hostinger.com", smtp_port: 465, smtp_secure: true, imap_host: "imap.hostinger.com", imap_port: 993 },
  outlook: { smtp_host: "smtp.office365.com", smtp_port: 587, smtp_secure: false, imap_host: "outlook.office365.com", imap_port: 993 },
  gmail: { smtp_host: "smtp.gmail.com", smtp_port: 587, smtp_secure: false, imap_host: "imap.gmail.com", imap_port: 993 },
};

const emptyForm = {
  display_name: "",
  email_address: "",
  provider: "custom",
  smtp_host: "",
  smtp_port: 465,
  smtp_secure: true,
  smtp_user: "",
  smtp_pass: "",
  imap_host: "",
  imap_port: 993,
  imap_user: "",
  imap_pass: "",
  is_default: false,
};

export default function EmailSettings() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isNew, setIsNew] = useState(true);

  const fetchAccounts = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("email_accounts")
      .select("id, email_address, display_name, provider, smtp_host, smtp_port, smtp_secure, smtp_user, imap_host, imap_port, imap_user, is_default, is_active, status, last_check, error_message, created_at")
      .order("created_at", { ascending: true });
    if (data) setAccounts(data as EmailAccount[]);
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, [user]);

  // Auto-check all accounts on load
  useEffect(() => {
    if (accounts.length > 0) {
      accounts.filter(a => a.is_active).forEach(a => {
        supabase.functions.invoke("test-email-connection", { body: { account_id: a.id } })
          .then(() => fetchAccounts());
      });
    }
  }, [accounts.length]);

  const selectAccount = (acc: EmailAccount) => {
    setSelectedId(acc.id);
    setIsNew(false);
    setForm({
      display_name: acc.display_name || "",
      email_address: acc.email_address,
      provider: acc.provider || "custom",
      smtp_host: acc.smtp_host,
      smtp_port: acc.smtp_port,
      smtp_secure: acc.smtp_secure,
      smtp_user: acc.smtp_user,
      smtp_pass: "", // don't show encrypted password
      imap_host: acc.imap_host || "",
      imap_port: acc.imap_port || 993,
      imap_user: acc.imap_user || "",
      imap_pass: "",
      is_default: acc.is_default,
    });
  };

  const handleNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setForm(emptyForm);
  };

  const handleProviderChange = (val: string) => {
    const preset = PROVIDER_PRESETS[val];
    if (preset) {
      setForm(f => ({
        ...f,
        provider: val,
        smtp_host: preset.smtp_host,
        smtp_port: preset.smtp_port,
        smtp_secure: preset.smtp_secure,
        imap_host: preset.imap_host,
        imap_port: preset.imap_port,
      }));
    } else {
      setForm(f => ({ ...f, provider: val }));
    }
  };

  const handleSave = async () => {
    if (!user || !form.email_address || !form.smtp_host || !form.smtp_user || (!isNew && !form.smtp_pass && !selectedId)) {
      toast.error("Rellena todos los campos obligatorios");
      return;
    }
    if (isNew && !form.smtp_pass) {
      toast.error("La contraseña SMTP es obligatoria");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email_address: form.email_address,
        display_name: form.display_name || null,
        provider: form.provider,
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port,
        smtp_secure: form.smtp_secure,
        smtp_user: form.smtp_user,
        imap_host: form.imap_host || null,
        imap_port: form.imap_port,
        imap_user: form.imap_user || null,
        is_default: form.is_default,
      };

      // Passwords are encrypted via DB function
      if (form.smtp_pass) payload.smtp_pass = form.smtp_pass;
      if (form.imap_pass) payload.imap_pass = form.imap_pass;

      if (isNew) {
        payload.created_by = user.id;
        if (!form.smtp_pass) { toast.error("Contraseña SMTP obligatoria"); setSaving(false); return; }
        const { error } = await supabase.from("email_accounts").insert(payload as any);
        if (error) throw error;
        toast.success("Cuenta añadida correctamente");
      } else if (selectedId) {
        const { error } = await supabase.from("email_accounts").update(payload as any).eq("id", selectedId);
        if (error) throw error;
        toast.success("Cuenta actualizada");
      }

      // If set as default, unset others
      if (form.is_default) {
        await supabase.from("email_accounts")
          .update({ is_default: false } as any)
          .neq("id", selectedId || "")
          .eq("created_by", user.id);
      }

      await fetchAccounts();
      handleNew();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta cuenta de email?")) return;
    const { error } = await supabase.from("email_accounts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Cuenta eliminada");
      if (selectedId === id) handleNew();
      fetchAccounts();
    }
  };

  const handleTestConnection = async () => {
    if (!selectedId) { toast.error("Guarda la cuenta primero"); return; }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-email-connection", {
        body: { account_id: selectedId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Conexión SMTP verificada correctamente");
      } else {
        toast.error(`Error: ${data?.error || "No se pudo conectar"}`);
      }
      await fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Error al probar conexión");
    } finally {
      setTesting(false);
    }
  };

  const providerLabel = (p: string) => {
    const labels: Record<string, string> = { hostinger: "Hostinger", outlook: "Outlook / 365", gmail: "Gmail", custom: "Custom" };
    return labels[p] || p;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Ajustes de Email</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestiona tus cuentas de correo y configuraciones SMTP/IMAP.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Account list */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" /> Cuentas Conectadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay cuentas configuradas</p>
            ) : (
              accounts.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => selectAccount(acc)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === acc.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AccountStatusDot status={acc.status} errorMessage={acc.error_message} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{acc.display_name || acc.email_address}</p>
                      <p className="text-xs text-muted-foreground truncate">{acc.email_address}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {acc.is_default && <Badge variant="secondary" className="text-[10px]">Principal</Badge>}
                      <Badge variant="outline" className="text-[10px]">{providerLabel(acc.provider)}</Badge>
                    </div>
                  </div>
                </button>
              ))
            )}
            <Button onClick={handleNew} variant="outline" className="w-full mt-2">
              <Plus className="w-4 h-4 mr-2" /> Añadir nueva cuenta
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT: Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{isNew ? "Nueva Cuenta" : "Editar Cuenta"}</CardTitle>
            <CardDescription>Configura los parámetros de envío y recepción.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider + Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de la Cuenta</Label>
                <Input
                  placeholder="Ej: Mi Outlook"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select value={form.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outlook">Microsoft Outlook / 365</SelectItem>
                    <SelectItem value="hostinger">Hostinger</SelectItem>
                    <SelectItem value="gmail">Google Gmail</SelectItem>
                    <SelectItem value="custom">Servidor Propio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Dirección de Email</Label>
              <Input
                type="email"
                placeholder="tu@ejemplo.com"
                value={form.email_address}
                onChange={e => setForm(f => ({ ...f, email_address: e.target.value }))}
              />
            </div>

            <Separator />

            {/* SMTP Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Server className="w-4 h-4 text-muted-foreground" /> Servidor de Salida (SMTP)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs">Host SMTP</Label>
                  <Input value={form.smtp_host} onChange={e => setForm(f => ({ ...f, smtp_host: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Puerto</Label>
                  <Input type="number" value={form.smtp_port} onChange={e => setForm(f => ({ ...f, smtp_port: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Usuario SMTP</Label>
                  <Input value={form.smtp_user} onChange={e => setForm(f => ({ ...f, smtp_user: e.target.value }))} placeholder="tu@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contraseña SMTP</Label>
                  <Input type="password" value={form.smtp_pass} onChange={e => setForm(f => ({ ...f, smtp_pass: e.target.value }))} placeholder={isNew ? "" : "••••• (dejar vacío para no cambiar)"} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.smtp_secure} onCheckedChange={v => setForm(f => ({ ...f, smtp_secure: v }))} />
                <Label className="text-xs text-muted-foreground">SSL/TLS directo (desactivar para STARTTLS en puerto 587)</Label>
              </div>

              {(form.provider === "outlook" || form.provider === "gmail") && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.3)]">
                  <AlertCircle className="w-4 h-4 text-[hsl(var(--warning))] mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Contraseña de Aplicación requerida</p>
                    <p className="mt-0.5">
                      {form.provider === "outlook"
                        ? "Para Outlook/365 con 2FA activo, genera una 'Contraseña de aplicación' en tu cuenta de Microsoft → Seguridad → Opciones avanzadas."
                        : "Para Gmail con 2FA activo, genera una 'Contraseña de aplicación' en tu cuenta de Google → Seguridad → Contraseñas de aplicación."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* IMAP Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Servidor de Entrada (IMAP) — Opcional
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs">Host IMAP</Label>
                  <Input value={form.imap_host} onChange={e => setForm(f => ({ ...f, imap_host: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Puerto</Label>
                  <Input type="number" value={form.imap_port} onChange={e => setForm(f => ({ ...f, imap_port: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Usuario IMAP</Label>
                  <Input value={form.imap_user} onChange={e => setForm(f => ({ ...f, imap_user: e.target.value }))} placeholder="Igual que SMTP si se deja vacío" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Contraseña IMAP</Label>
                  <Input type="password" value={form.imap_pass} onChange={e => setForm(f => ({ ...f, imap_pass: e.target.value }))} placeholder={isNew ? "Igual que SMTP si se deja vacío" : "••••• (dejar vacío para no cambiar)"} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Default toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
              <Label className="text-sm">Cuenta por defecto al redactar</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2 flex-wrap">
            <div className="flex gap-2">
              {!isNew && selectedId && (
                <>
                  <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testing}>
                    {testing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Probar Conexión
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedId)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                  </Button>
                </>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {isNew ? "Guardar Cuenta" : "Actualizar Cuenta"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
