

## Fix: Envio de Emails con Adjuntos (PPTX, PDF, PPT)

### Causa raiz

El error en los logs es claro:

```
send-email error: ReferenceError: Buffer is not defined
    at Object.handler (send-email/index.ts:112:20)
```

La linea 114 de `supabase/functions/send-email/index.ts` usa `Buffer.from(arrayBuffer)` para convertir los archivos adjuntos descargados del storage. `Buffer` es una API de Node.js que **no existe en el runtime de Deno** (Edge Functions). Por eso cualquier email CON adjuntos falla, mientras que los emails sin adjuntos se envian correctamente.

### Solucion

Reemplazar `Buffer.from(arrayBuffer)` por `new Uint8Array(arrayBuffer)`, que es compatible tanto con Deno como con nodemailer. Nodemailer acepta `Uint8Array` como contenido de adjuntos sin problema.

### Cambio en `supabase/functions/send-email/index.ts`

**Linea 99** - Cambiar el tipo del array:
```typescript
// ANTES:
const mailAttachments: { filename: string; content: Buffer }[] = [];

// DESPUES:
const mailAttachments: { filename: string; content: Uint8Array }[] = [];
```

**Linea 112-114** - Reemplazar Buffer.from:
```typescript
// ANTES:
mailAttachments.push({
  filename: att.filename,
  content: Buffer.from(arrayBuffer),
});

// DESPUES:
mailAttachments.push({
  filename: att.filename,
  content: new Uint8Array(arrayBuffer),
});
```

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/send-email/index.ts` | Reemplazar `Buffer` por `Uint8Array` (2 lineas) |

### Resultado esperado

Los emails con adjuntos PPTX, PPT, PDF y cualquier otro tipo de archivo se enviaran correctamente via SMTP sin errores de runtime.

