

## Revision del Sistema de Email: Errores y Mejoras

### BUG 1: CC/BCC no incluidos en la evaluacion de borrador (Alta)

**Problema:** Si el usuario solo rellena los campos CC o BCC sin modificar nada mas, al cerrar el compositor no se mostrara el dialogo de descarte. El contenido de CC/BCC se perdera silenciosamente.

**Archivo:** `src/components/email/ComposeEmail.tsx`, linea 112

**Solucion:** Anadir `cc` y `bcc` a la evaluacion de `hasDraft`:

```typescript
const hasDraft =
  (to.trim() !== "" && to !== defaultTo) ||
  (cc.trim() !== "" && cc !== defaultCc) ||
  (bcc.trim() !== "") ||
  (subject.trim() !== "" && subject !== defaultSubject) ||
  (body.replace(/<[^>]+>/g, "").trim() !== "" && body !== defaultBody) ||
  attachments.length > 0;
```

---

### BUG 2: Closure obsoleta de `fetchEmails` en el canal realtime (Media)

**Problema:** En `src/pages/Emails.tsx`, el `useEffect` del canal realtime (linea 117-135) referencia `fetchEmails` en el callback, pero `fetchEmails` no esta en el array de dependencias. Esto significa que cuando cambia la cuenta seleccionada, la carpeta o la pagina, el callback del canal seguira ejecutando la version antigua de `fetchEmails`, mostrando datos desactualizados.

**Archivo:** `src/pages/Emails.tsx`, linea 135

**Solucion:** Anadir `fetchEmails` al array de dependencias del useEffect:

```typescript
}, [user, accounts, fetchCounts, fetchEmails]);
```

---

### BUG 3: Boton "Vista Previa" con tamano inconsistente en el footer (Baja)

**Problema:** El componente `EmailPreviewModal` renderiza su boton trigger con clase `h-8`, mientras que todos los demas botones del footer usan `h-7`. Esto causa una desalineacion visual sutil.

**Archivo:** `src/components/email/EmailPreviewModal.tsx`, linea 41

**Solucion:** Pasar un trigger personalizado desde ComposeEmail con `h-7` en vez de depender del trigger por defecto, o cambiar la altura del trigger por defecto a `h-7`:

```tsx
<EmailPreviewModal
  subject={subject}
  body={body}
  signatureHtml={getSignatureHtml()}
  recipient={to}
  trigger={
    <Button variant="outline" size="sm" className="h-7 text-xs shrink-0">
      <Eye className="w-3.5 h-3.5" />
    </Button>
  }
/>
```

Esto requiere importar `Eye` de lucide-react en ComposeEmail.

---

### MEJORA 1: Boton "Responder" ademas de "Reenviar" (Alta)

**Problema:** En la vista de detalle de email (panel derecho de `Emails.tsx`), solo existe el boton "Reenviar". No hay boton de "Responder", que es la accion mas comun al leer un email entrante.

**Archivo:** `src/pages/Emails.tsx`, lineas 371-386

**Solucion:** Anadir un boton "Responder" junto al de "Reenviar" que abra el compositor con:
- `defaultTo` = `from_email` del email seleccionado (para responder al remitente)
- `defaultSubject` = `"Re: " + subject` (si no empieza ya con "Re:")
- `defaultBody` = cita del email original con formato `<blockquote>`

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    const reSubject = selected.subject.startsWith("Re:") 
      ? selected.subject 
      : `Re: ${selected.subject}`;
    const quotedBody = `<br/><br/><blockquote style="border-left: 2px solid #ccc; padding-left: 12px; color: #666;">${selected.body_html || selected.body_text || ""}</blockquote>`;
    setResendData({
      to: selected.from_email,
      cc: "",
      subject: reSubject,
      body: quotedBody,
    });
    setComposeOpen(true);
  }}
>
  <ArrowDownLeft className="w-3.5 h-3.5 mr-1" />
  Responder
</Button>
```

---

### MEJORA 2: Indicador visual de emails no leidos en la lista (Media)

**Problema:** La lista de emails no distingue visualmente entre emails leidos y no leidos. El campo `is_read` existe en la base de datos y se actualiza al seleccionar, pero el estilo de la lista no cambia.

**Archivo:** `src/pages/Emails.tsx`, lineas 281-318

**Solucion:** Aplicar estilo diferenciado a emails no leidos (solo inbox/inbound):

```tsx
<button
  key={email.id}
  onClick={...}
  className={cn(
    "w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors",
    selected?.id === email.id && "bg-accent/50",
    email.direction === "inbound" && !(email as any).is_read && "bg-primary/5 font-semibold"
  )}
>
```

Tambien aplicar el font-weight al asunto para que los no leidos destaquen con texto en negrita.

---

### Resumen de cambios

| Tipo | Descripcion | Archivo | Prioridad |
|---|---|---|---|
| Bug | CC/BCC no evaluados en hasDraft | ComposeEmail.tsx | Alta |
| Bug | Closure obsoleta de fetchEmails en realtime | Emails.tsx | Media |
| Bug | Boton Vista Previa con tamano h-8 vs h-7 | ComposeEmail.tsx | Baja |
| Mejora | Boton "Responder" en detalle de email | Emails.tsx | Alta |
| Mejora | Indicador visual de emails no leidos | Emails.tsx | Media |

