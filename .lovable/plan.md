
## Mejorar "Editar" para preservar todo el contenido original

### Problema actual

Cuando el usuario hace clic en "Editar" para modificar un email enviado (especialmente los fallidos), se pierden elementos clave:

1. **Adjuntos originales**: El compositor solo maneja archivos `File` (nuevos), no carga los adjuntos ya guardados en `email_attachments`
2. **Firma original**: La firma esta embebida en el `body_html` pero el compositor la trata como parte del cuerpo, lo que puede duplicarla si el usuario activa la firma
3. **Cuenta remitente**: No se pre-selecciona la cuenta desde la que se envio originalmente

### Solucion propuesta

#### 1. Pasar adjuntos originales al compositor

Ampliar `resendData` para incluir el `email_log_id` del email original. Cuando ComposeEmail recibe este ID, consultara la tabla `email_attachments` para obtener los adjuntos existentes y mostrarlos como "adjuntos heredados" (ya subidos a Storage) junto a los nuevos que el usuario pueda anadir.

**En `Emails.tsx`**: Agregar `emailLogId` al tipo de `resendData` y pasarlo al compositor como nueva prop `editEmailId`.

**En `ComposeEmail.tsx`**:
- Nueva prop `editEmailId?: string`
- Al abrir con `editEmailId`, consultar `email_attachments` para ese email
- Nuevo estado `existingAttachments` con los adjuntos ya subidos (nombre, path, tamano)
- Mostrar estos adjuntos con un icono de clip y opcion de eliminar
- Al enviar, incluir los adjuntos existentes (ya tienen path en Storage) junto con los nuevos

#### 2. Preservar la firma embebida en el cuerpo

Cuando se edita un email, la firma ya esta dentro del `body_html`. Para evitar duplicacion:
- Desactivar por defecto el interruptor de firma cuando se abre en modo edicion (`editEmailId` presente)
- El usuario puede activarla manualmente si quiere cambiar la firma

Esto es consistente con el comportamiento actual donde la firma esta desactivada por defecto.

#### 3. Pre-seleccionar la cuenta remitente original

Ampliar `resendData` para incluir `fromAccountId`. ComposeEmail usara este valor para pre-seleccionar la cuenta correcta en el selector de remitente.

**En `Emails.tsx`**: Buscar el `account_id` correspondiente al `from_email` del email y pasarlo.
**En `ComposeEmail.tsx`**: Nueva prop `defaultFromAccount?: string` que se usa para inicializar `fromAccount`.

### Cambios detallados

#### `src/pages/Emails.tsx`

**Tipo resendData ampliado:**
```typescript
resendData: {
  to: string;
  cc: string;
  subject: string;
  body: string;
  editEmailId?: string;      // ID del email para cargar adjuntos
  fromAccountId?: string;    // ID de la cuenta remitente
} | null
```

**Boton "Editar" en hover (lineas 497-515)** - Agregar `editEmailId` y buscar cuenta:
```typescript
setResendData({
  to: email.to_email,
  cc: email.cc_emails || "",
  subject: email.subject,
  body: email.body_html || email.body_text || "",
  editEmailId: email.id,
});
```

**Boton "Editar" en panel detalle (lineas 678-694)** - Mismo cambio:
```typescript
setResendData({
  to: selected.to_email,
  cc: selected.cc_emails || "",
  subject: selected.subject,
  body: selected.body_html || selected.body_text || "",
  editEmailId: selected.id,
});
```

**ComposeEmail invocacion (lineas 770-784)** - Pasar nuevas props:
```typescript
<ComposeEmail
  ...
  editEmailId={resendData?.editEmailId}
  defaultFromAccount={resendData?.fromAccountId}
/>
```

#### `src/components/email/ComposeEmail.tsx`

**Nuevas props:**
```typescript
editEmailId?: string;
defaultFromAccount?: string;
```

**Nuevo tipo y estado para adjuntos existentes:**
```typescript
type ExistingAttachment = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
};

const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>([]);
```

**Cargar adjuntos al abrir en modo edicion:**
```typescript
useEffect(() => {
  if (open && editEmailId) {
    supabase
      .from("email_attachments")
      .select("id, file_name, file_path, file_size")
      .eq("email_log_id", editEmailId)
      .then(({ data }) => {
        if (data) setExistingAttachments(data);
      });
  } else {
    setExistingAttachments([]);
  }
}, [open, editEmailId]);
```

**Pre-seleccionar cuenta remitente:**
```typescript
// En fetchEmailAccounts o en useEffect
if (defaultFromAccount) {
  setFromAccount(defaultFromAccount);
}
```

**Mostrar adjuntos existentes en la UI** (junto a los nuevos):
- Cada adjunto existente muestra nombre y tamano con un boton X para eliminarlo
- Al eliminar, se quita del array `existingAttachments` (no se borra de Storage)

**Enviar con adjuntos existentes:**
```typescript
// En la funcion send(), combinar adjuntos existentes con nuevos
const allAttachments = [
  ...existingAttachments.map(a => ({ filename: a.file_name, path: a.file_path })),
  ...uploadedAttachments.map(a => ({ filename: a.file_name, path: a.path })),
];
```

**Limpiar al cerrar:**
```typescript
setExistingAttachments([]);
```

### Resumen de archivos

| Archivo | Cambio |
|---|---|
| `src/pages/Emails.tsx` | Ampliar `resendData` con `editEmailId`, pasar nuevas props a ComposeEmail |
| `src/components/email/ComposeEmail.tsx` | Props `editEmailId` y `defaultFromAccount`, cargar adjuntos existentes, combinar al enviar |
