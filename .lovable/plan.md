

## Revision de Errores y Mejoras Pendientes

---

### BUG 1: `as any` casts innecesarios en operaciones de Supabase (Media)

**Problema:** En varios archivos se usa `as any` para castear datos en updates/inserts de Supabase, a pesar de que los campos (`is_trashed`, `trashed_at`, `is_read`, `status`) ya existen en la base de datos y en los tipos generados.

**Archivos afectados:**
- `src/pages/Emails.tsx` lineas 198, 210, 372
- `src/pages/Contacts.tsx` lineas 133, 140, 315
- `src/components/contacts/ContactProfile.tsx` lineas 138, 241, 264, 294

**Solucion:** Eliminar los casts `as any` innecesarios. Si los tipos generados (`types.ts`) ya incluyen estos campos, el cast no es necesario. Si no los incluyen, hay que verificar que `types.ts` se regenere correctamente.

---

### BUG 2: `detect-bounces` y otras funciones no registradas en `config.toml` (Alta)

**Problema:** Las funciones `detect-bounces`, `sync-emails`, `test-connector`, `test-email-connection`, `prospector-search`, `get-api-usage` y `suggest-reply` existen en el directorio de funciones pero NO estan registradas en `supabase/config.toml` con `verify_jwt = false`. Esto puede causar fallos 401 al invocarlas desde el frontend.

**Solucion:** Anadir las entradas faltantes a `supabase/config.toml`:
```text
[functions.detect-bounces]
verify_jwt = false

[functions.sync-emails]
verify_jwt = false

[functions.test-connector]
verify_jwt = false

[functions.test-email-connection]
verify_jwt = false

[functions.prospector-search]
verify_jwt = false

[functions.get-api-usage]
verify_jwt = false

[functions.suggest-reply]
verify_jwt = false
```

---

### BUG 3: Email detail badge no muestra estado "received" correctamente (Baja)

**Problema:** En `Emails.tsx` linea 500-502, el Badge del panel de detalle solo distingue "sent" vs "destructive" (fallido). Los emails con `status === "received"` se muestran como "Fallido" en rojo cuando deberian mostrarse como "Recibido".

**Solucion:** Anadir la condicion para `status === "received"` igual que en la lista de emails (linea 387-390).

---

### BUG 4: `isToInvalid` evaluado como expresion sin efecto secundario (Baja)

**Problema:** En `ComposeEmail.tsx` linea 104, `isToInvalid` se calcula con `&&` lo que puede devolver un string vacio (`""`) en vez de `false` cuando `to` esta vacio.

**Solucion:** Envolver en `Boolean()` o usar comparacion explicita: `const isToInvalid = to.trim() !== "" && invalidEmails.has(to.trim().toLowerCase());`

---

### BUG 5: `loadInvalidEmails` duplicado en 3 componentes (Media - Mejora)

**Problema:** La logica para cargar emails invalidos se repite en `Contacts.tsx`, `ContactProfile.tsx` y `ComposeEmail.tsx`. Cada uno hace su propia query `.from("invalid_emails").select("email_address").limit(5000)`.

**Solucion:** Extraer en un hook compartido `useInvalidEmails()` que retorne `{ invalidEmails, isEmailInvalid, loadInvalidEmails, reactivateEmail }`.

---

### BUG 6: `Contacts.tsx` - 865 lineas, archivo muy grande (Mejora)

**Problema:** El archivo `Contacts.tsx` tiene 865 lineas con logica de enriquecimiento, papelera, filtrado, kanban, lista y bounce detection mezclados. Es dificil de mantener.

**Solucion (a futuro):** Extraer hooks como `useContactEnrichment()`, `useContactTrash()`, `useInvalidEmails()`, y componentes como `ContactKanbanCard`, `ContactListCard`, `ContactTrashView`.

---

### Resumen de cambios

| Archivo | Cambio | Prioridad |
|---|---|---|
| `supabase/config.toml` | Registrar 7 funciones faltantes | Alta |
| `src/pages/Emails.tsx` | Corregir badge detalle para "received", eliminar `as any` | Media |
| `src/pages/Contacts.tsx` | Eliminar `as any` innecesarios | Media |
| `src/components/contacts/ContactProfile.tsx` | Eliminar `as any` innecesarios | Media |
| `src/components/email/ComposeEmail.tsx` | Corregir evaluacion de `isToInvalid` | Baja |
| Nuevo: `src/hooks/useInvalidEmails.ts` | Extraer logica duplicada de invalid emails | Media |

---

### Detalle tecnico

**config.toml - Funciones faltantes:**
Anadir 7 bloques `[functions.X]` con `verify_jwt = false` para las funciones que ya existen pero no estan registradas.

**Emails.tsx - Badge corregido:**
```typescript
// Cambiar de:
<Badge variant={selected.status === "sent" ? "default" : "destructive"}>
  {selected.status === "sent" ? "Enviado" : "Fallido"}
</Badge>

// A:
<Badge variant={selected.status === "sent" ? "default" : selected.status === "received" ? "secondary" : "destructive"}>
  {selected.status === "sent" ? "Enviado" : selected.status === "received" ? "Recibido" : "Fallido"}
</Badge>
```

**Hook useInvalidEmails:**
```typescript
export function useInvalidEmails() {
  const [invalidEmails, setInvalidEmails] = useState<Set<string>>(new Set());
  
  const load = useCallback(async () => {
    const { data } = await supabase.from("invalid_emails").select("email_address").limit(5000);
    if (data) setInvalidEmails(new Set(data.map(d => d.email_address.toLowerCase())));
  }, []);

  const isInvalid = useCallback((email: string | null | undefined) => {
    return email ? invalidEmails.has(email.toLowerCase()) : false;
  }, [invalidEmails]);

  const reactivate = useCallback(async (email: string) => {
    const { error } = await supabase.from("invalid_emails").delete().eq("email_address", email.toLowerCase());
    if (error) { toast.error(error.message); return; }
    toast.success(`Email ${email} reactivado`);
    load();
  }, [load]);

  return { invalidEmails, loadInvalidEmails: load, isEmailInvalid: isInvalid, reactivateEmail: reactivate };
}
```

