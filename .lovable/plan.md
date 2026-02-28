

## Papelera de Emails - Plan de Implementacion

### Resumen

Implementar una papelera completa para el sistema de email del CRM con borrado logico (soft delete), restauracion y borrado permanente.

---

### Paso 1: Migracion de base de datos

Anadir columna `is_trashed` a la tabla `email_logs`:

```text
ALTER TABLE email_logs ADD COLUMN is_trashed boolean NOT NULL DEFAULT false;
ALTER TABLE email_logs ADD COLUMN trashed_at timestamptz;
```

Todas las queries existentes de inbox/sent filtraran automaticamente por `is_trashed = false`.

### Paso 2: Actualizar queries en `Emails.tsx`

- **fetchCounts**: Anadir `.eq("is_trashed", false)` a las queries de inbox y sent. Anadir nueva query para contar emails en papelera por cuenta.
- **fetchEmails**: Cuando `selectedFolder === "trash"`, filtrar por `is_trashed = true` en vez de por direction. Para inbox/sent, anadir `.eq("is_trashed", false)`.
- **Nuevo estado**: `trashCounts` por cuenta.
- **Nuevas funciones**:
  - `moveToTrash(emailId)`: UPDATE `is_trashed = true, trashed_at = now()`
  - `restoreFromTrash(emailId)`: UPDATE `is_trashed = false, trashed_at = null`
  - `permanentDelete(emailId)`: DELETE real del registro
  - `emptyTrash(accountId)`: DELETE todos los emails con `is_trashed = true` de esa cuenta

### Paso 3: Actualizar `EmailSidebar.tsx`

- Actualizar tipo `FolderCounts` para incluir `trash: number`
- Anadir carpeta "Papelera" con icono `Trash2` debajo de "Enviados" en cada cuenta
- Mostrar contador de emails en papelera
- Anadir boton "Vaciar papelera" visible solo cuando la carpeta seleccionada es "trash"

### Paso 4: UI en la lista de emails

- **Hover action**: Anadir boton de papelera (`Trash2`) que aparece al hacer hover en cada fila de email (usando `group` + `group-hover:opacity-100`)
- **Vista papelera**: Cuando `selectedFolder === "trash"`, mostrar botones de Restaurar (`RotateCcw`) y Borrar definitivo (`XCircle`) en lugar del boton de papelera
- **Barra superior en papelera**: Mostrar boton "Vaciar papelera" con confirmacion (AlertDialog)

### Paso 5: UI en el panel de detalle

- Anadir boton "Borrar" (`Trash2`) en la barra de acciones del email seleccionado (junto a Responder y Reenviar)
- Si el email esta en papelera, mostrar "Restaurar" y "Borrar definitivo" en su lugar

### Paso 6: Mobile

- Anadir "Papelera" a los controles mobile (botones de folder en la parte superior)

---

### Archivos a modificar

| Archivo | Cambios |
|---|---|
| Migracion SQL | Anadir `is_trashed` y `trashed_at` a `email_logs` |
| `src/pages/Emails.tsx` | Filtros de query, funciones moveToTrash/restore/delete, UI hover buttons, barra papelera, detalle |
| `src/components/email/EmailSidebar.tsx` | Carpeta Papelera en sidebar, tipo FolderCounts ampliado, boton vaciar |

### Flujo de usuario

```text
Email en Inbox/Sent --> [Borrar] --> Papelera (is_trashed=true)
Papelera --> [Restaurar] --> Vuelve a Inbox/Sent (is_trashed=false)
Papelera --> [Borrar definitivo] --> DELETE real
Papelera --> [Vaciar papelera] --> DELETE todos con confirmacion
```

