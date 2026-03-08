

## Revision: Errores y Mejoras pendientes tras integracion Findymail

### BUG 1: Bulk Enrich no incluye Findymail (Alta)

**Problema:** En `src/pages/Contacts.tsx` linea 258, el boton "Enriquecer todos" solo envia `["hunter", "apollo", "lusha"]` como servicios. Findymail queda excluido del enriquecimiento masivo a pesar de estar integrado en la Edge Function.

**Solucion:** Cambiar el array a `["hunter", "apollo", "lusha", "findymail"]`.

### BUG 2: `findymail_status` accedido con cast `as any` (Media)

**Problema:** En `src/components/contacts/ContactProfile.tsx` linea 380, se usa `(contact as any).findymail_status` a pesar de que el tipo `Contact` ya tiene el campo `findymail_status`. Esto indica que el codigo se escribio antes de actualizar el tipo, o no se actualizo tras anadirlo.

**Solucion:** Cambiar a `contact.findymail_status` sin cast.

### BUG 3: Sin filtro Findymail en pagina de Contactos (Media)

**Problema:** La pagina de Contactos tiene filtros Select para Lusha, Hunter y Apollo, pero no para Findymail. Los contactos enriquecidos con Findymail no se pueden filtrar.

**Solucion:** Anadir un cuarto Select de filtro para estado Findymail (`findymailFilter`), junto a los tres existentes. Actualizar la logica de filtrado en la funcion `filtered` y el boton "Limpiar".

### BUG 4: Sin boton Findymail en tarjetas Kanban (Media)

**Problema:** Las tarjetas del Kanban muestran botones de enriquecimiento rapido para Hunter, Apollo y Lusha, pero no para Findymail. El usuario no puede enriquecer con Findymail desde la vista Kanban.

**Solucion:** Anadir un boton "Findymail" en las tarjetas Kanban (similar a los otros tres), visible cuando `company_domain` existe y `findymail_status` es `pending` o `not_found`. Requiere anadir estado `enrichingFindymailId` y funcion `enrichWithFindymailFromCard`.

### BUG 5: Sin icono de estado Findymail en tarjetas Kanban (Baja)

**Problema:** Las tarjetas Kanban muestran iconos de estado para Lusha (Sparkles verde), Hunter (Globe verde/naranja) y Apollo (Sparkles azul/naranja), pero no para Findymail.

**Solucion:** Anadir icono de estado Findymail (por ejemplo, `Mail` en verde/naranja) junto a los otros indicadores.

### Resumen de cambios

| Archivo | Cambio | Prioridad |
|---|---|---|
| `src/pages/Contacts.tsx` | Anadir `"findymail"` al array de bulk enrich | Alta |
| `src/pages/Contacts.tsx` | Anadir filtro Select para Findymail | Media |
| `src/pages/Contacts.tsx` | Anadir boton + icono Findymail en tarjetas Kanban | Media |
| `src/components/contacts/ContactProfile.tsx` | Quitar cast `as any` en `findymail_status` | Media |

### Detalle tecnico

**Contacts.tsx - Nuevos estados:**
```typescript
const [findymailFilter, setFindymailFilter] = useState("");
const [enrichingFindymailId, setEnrichingFindymailId] = useState<string | null>(null);
```

**Contacts.tsx - Nueva funcion:**
```typescript
const enrichWithFindymailFromCard = async (c: Contact) => {
  if (!c.company_domain) return;
  setEnrichingFindymailId(c.id);
  try {
    const { data, error } = await supabase.functions.invoke("enrich-findymail-contact", {
      body: { contact_id: c.id, full_name: c.full_name, domain: c.company_domain },
    });
    if (error) throw error;
    if (data?.status === "enriched") toast.success("Email encontrado con Findymail");
    else toast.info("Findymail no encontro datos");
    load();
  } catch (err: any) {
    toast.error(err.message || "Error con Findymail");
  } finally {
    setEnrichingFindymailId(null);
  }
};
```

**Contacts.tsx - Filtro actualizado:**
```typescript
const matchesFindymail = !findymailFilter || findymailFilter === "all" || c.findymail_status === findymailFilter;
return matchesSearch && matchesLusha && matchesHunter && matchesApollo && matchesFindymail;
```

**Contacts.tsx - Bulk enrich corregido:**
```typescript
body: { last_id: lastId, services: ["hunter", "apollo", "lusha", "findymail"] },
```

