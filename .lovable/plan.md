

## Mejorar la funcion "Editar" para emails enviados (especialmente fallidos)

### Problema actual

El boton "Editar" en el panel de detalle carga correctamente el destinatario original, CC y contenido del email en el compositor. Sin embargo, tiene limitaciones importantes:

1. **No existe boton "Editar" en el hover de la lista** - Solo hay "Reenviar" y "Papelera". Para editar, el usuario debe abrir el detalle primero.
2. **No hay indicacion visual de emails fallidos** - Los emails con `status: "failed"` no se distinguen facilmente en la lista, dificultando identificar cuales necesitan re-envio.
3. **No se vincula con el email original** - Al editar y enviar, no queda registro de que el nuevo email es una correccion del fallido.
4. **El email fallido permanece en la lista** - Tras re-enviar exitosamente, el email fallido sigue visible sin contexto.

### Solucion propuesta

#### 1. Anadir boton "Editar" en hover de la lista (solo outbound)
Agregar un boton rapido con icono `Pencil` junto al boton "Reenviar" en el hover de emails salientes. Cargara los datos originales (to, cc, subject, body) directamente.

#### 2. Indicador visual para emails fallidos
Mostrar un badge o icono rojo (`XCircle`) junto al estado de emails con `status === "failed"`, tanto en la lista como en el detalle. Esto permite identificar rapidamente cuales necesitan atencion.

#### 3. Boton dedicado "Reintentar" para emails fallidos
En emails con `status === "failed"`, mostrar un boton destacado "Reintentar" (con icono `RotateCcw`) que abra el compositor con todos los datos originales pre-cargados. Este boton sera mas visible que "Editar" para comunicar la intencion de corregir y reenviar.

#### 4. Mover el email fallido a papelera tras reenvio exitoso (opcional)
Pasar el `email_log_id` original al compositor. Tras un envio exitoso, marcar automaticamente el email fallido como `is_trashed = true` para limpiar la bandeja.

### Cambios en `src/pages/Emails.tsx`

| Cambio | Detalle |
|---|---|
| Hover: boton "Editar" | Nuevo boton `Pencil` para emails outbound en la lista, carga to/cc/subject/body originales |
| Indicador fallido en lista | Badge rojo o icono `XCircle` cuando `email.status === "failed"` junto al asunto |
| Indicador fallido en detalle | Banner superior con el `error_message` del fallo SMTP |
| Boton "Reintentar" en detalle | Para emails fallidos, boton destacado que abre compositor con datos originales |
| Estado `retryEmailId` | Nuevo estado para rastrear el ID del email fallido que se esta reintentando |
| Callback `onSent` mejorado | Al reenviar un fallido, marcar el original como `is_trashed` automaticamente |

### Cambios en `src/components/email/ComposeEmail.tsx`

| Cambio | Detalle |
|---|---|
| Nueva prop `retryEmailId` | ID opcional del email fallido que se esta reintentando |
| Logica post-envio | Si `retryEmailId` existe y el envio es exitoso, actualizar el email original a `is_trashed = true` |

### Detalle tecnico

**Nuevo boton hover "Editar" (junto al de "Reenviar"):**
```typescript
<button
  onClick={(e) => {
    e.stopPropagation();
    setResendData({
      to: email.to_email,
      cc: email.cc_emails || "",
      subject: email.subject,
      body: email.body_html || email.body_text || "",
    });
    setComposeOpen(true);
  }}
  className="p-1.5 rounded-md hover:bg-accent ..."
  title="Editar y reenviar"
>
  <Pencil className="w-4 h-4" />
</button>
```

**Indicador de fallo en la lista:**
```typescript
{email.status === "failed" && (
  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
)}
```

**Banner de error en el detalle:**
```typescript
{selected.status === "failed" && (
  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
    <span className="font-medium text-destructive">Error de envio:</span>{" "}
    {selected.error_message || "Error desconocido"}
  </div>
)}
```

**Boton "Reintentar" en detalle (para fallidos):**
```typescript
{selected.status === "failed" && (
  <Button variant="destructive" size="sm" onClick={() => {
    setRetryEmailId(selected.id);
    setResendData({
      to: selected.to_email,
      cc: selected.cc_emails || "",
      subject: selected.subject,
      body: selected.body_html || selected.body_text || "",
    });
    setComposeOpen(true);
  }}>
    <RotateCcw className="w-3.5 h-3.5 mr-1" />
    Reintentar
  </Button>
)}
```

**Auto-papelera tras reintento exitoso (ComposeEmail):**
```typescript
// Nueva prop
retryEmailId?: string;

// Tras envio exitoso
if (retryEmailId) {
  await supabase.from("email_logs")
    .update({ is_trashed: true, trashed_at: new Date().toISOString() })
    .eq("id", retryEmailId);
}
```

### Resumen de archivos a modificar

| Archivo | Cambios |
|---|---|
| `src/pages/Emails.tsx` | Boton hover "Editar", indicadores de fallo, boton "Reintentar", estado `retryEmailId` |
| `src/components/email/ComposeEmail.tsx` | Prop `retryEmailId`, logica post-envio para auto-papelera |

