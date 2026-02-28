

## Papelera de Contactos - Plan de Implementacion

### Resumen

Anadir funcionalidad de papelera para contactos: boton discreto en cada tarjeta (hover), borrado logico con status "trash", seccion para ver/restaurar/eliminar contactos en papelera.

---

### Paso 1: Migracion de base de datos

- Anadir valor `trash` al enum `contact_status`
- Anadir columna `trashed_at timestamptz` a la tabla `contacts`

```text
ALTER TYPE contact_status ADD VALUE 'trash';
ALTER TABLE public.contacts ADD COLUMN trashed_at timestamptz;
```

### Paso 2: Modificar `src/pages/Contacts.tsx`

**Nuevas funciones:**
- `moveToTrash(contactId)`: UPDATE status='trash', trashed_at=now()
- `restoreFromTrash(contactId)`: UPDATE status='new_lead', trashed_at=null
- `permanentDelete(contactId)`: DELETE real del registro
- `emptyTrash()`: DELETE todos con status='trash'

**Nuevo estado:**
- `showTrash` (boolean): toggle para alternar entre vista normal y papelera

**Filtrado:**
- Vista normal: `filtered` excluye contactos con `status === 'trash'`
- Vista papelera: muestra solo contactos con `status === 'trash'`

**UI - Boton papelera en tarjetas Kanban:**
- Anadir boton `Trash2` con `absolute top-2 right-2`, visible solo en hover (`group` + `group-hover:opacity-100`)
- El contenedor de la tarjeta necesita clase `group relative`

**UI - Boton papelera en tarjetas Lista:**
- Mismo patron: boton hover en esquina superior derecha de cada Card

**UI - Barra de papelera:**
- Boton "Papelera" junto a los botones de vista (kanban/lista) con contador
- Cuando `showTrash=true`, mostrar lista de contactos en papelera con botones Restaurar y Borrar definitivo
- Boton "Vaciar papelera" con confirmacion AlertDialog

**UI - Importar icono Trash2:**
- Anadir `Trash2, RotateCcw, XCircle` a los imports de lucide-react

### Paso 3: Mobile

- El boton de papelera en las tarjetas funciona igual en mobile (siempre visible o con tap)

---

### Archivos a modificar

| Archivo | Cambios |
|---|---|
| Migracion SQL | Anadir `trash` al enum, columna `trashed_at` |
| `src/pages/Contacts.tsx` | Boton papelera en tarjetas, vista papelera, funciones moveToTrash/restore/delete |

### Flujo de usuario

```text
Contacto en Kanban/Lista --> [icono papelera hover] --> status='trash'
Vista Papelera --> [Restaurar] --> Vuelve a 'new_lead'
Vista Papelera --> [Borrar definitivo] --> DELETE real
Vista Papelera --> [Vaciar papelera] --> DELETE todos con confirmacion
```

