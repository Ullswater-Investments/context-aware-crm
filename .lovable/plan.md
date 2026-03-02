

## Boton "Reenviar" en la lista de mensajes enviados

### Contexto

Actualmente el boton "Reenviar" solo aparece en el panel de detalle (derecha) cuando se selecciona un email. El usuario quiere un boton de acceso rapido directamente en cada fila de la lista de emails enviados, visible al pasar el raton (hover), junto al boton de papelera existente.

### Cambio en `src/pages/Emails.tsx`

En la seccion de hover actions (lineas 439-447), anadir un boton "Reenviar" que aparezca solo para emails outbound (enviados) no eliminados. Al hacer clic, abre el compositor pre-rellenado con el mismo destinatario, CC, asunto y cuerpo del email original.

**Logica del boton:**
- Solo visible cuando `email.direction === "outbound"` y no estamos en la carpeta papelera
- Al hacer clic: configura `resendData` con los datos del email y abre `ComposeEmail`
- Usa el icono `Forward` ya importado
- Se posiciona antes del boton de papelera

**Codigo aproximado a anadir (dentro del bloque de hover actions no-trash):**
```typescript
{email.direction === "outbound" && (
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
    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
    title="Reenviar"
  >
    <Forward className="w-4 h-4" />
  </button>
)}
```

### Archivo a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Emails.tsx` | Anadir boton "Reenviar" en hover actions de emails outbound (1 bloque, ~15 lineas) |

### Resultado

Al pasar el raton sobre cualquier email enviado en la lista, aparecera un icono de reenvio junto al icono de papelera. Al hacer clic se abre el compositor con todos los datos pre-rellenados listos para reenviar.

