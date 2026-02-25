

## Plan: Agregar 4 filas adicionales a las tarjetas de contacto

### Objetivo
Mostrar en las tarjetas de contacto (Kanban y Lista) cuatro filas nuevas con datos de enriquecimiento: **work_email**, **mobile_phone**, **linkedin_url** y **company_domain**.

### Cambios en `src/pages/Contacts.tsx`

**1. Importar icono `Linkedin` de lucide-react** (linea 14, junto a los demas iconos)

**2. Vista Kanban** (despues de la fila de telefono, linea 315):
- **Work Email**: si `work_email` existe y es diferente de `email`, mostrar con icono Mail y prefijo "Corp:"
- **Mobile Phone**: si `mobile_phone` existe y no coincide con el telefono ya mostrado, mostrar con icono Phone y prefijo "Movil:"
- **LinkedIn**: si `linkedin_url` existe, enlace clicable con icono Linkedin y texto "LinkedIn" (con `stopPropagation`)
- **Company URL**: si `company_domain` existe, enlace clicable con icono Globe y texto del dominio (con `stopPropagation`)

**3. Vista Lista** (despues de la fila de telefono, linea 372):
- Mismas 4 filas con el mismo estilo de la vista lista (`text-sm`, `gap-2`)

### Detalles tecnicos

- Importar `Linkedin` de `lucide-react` (Globe ya esta importado)
- Los enlaces (LinkedIn y company_domain) usan `e.stopPropagation()` y `target="_blank"` con `rel="noopener noreferrer"`
- Para company_domain, se construye la URL como `https://{company_domain}` si no tiene protocolo
- Condiciones de deduplicacion: work_email solo si diferente de email; mobile_phone solo si diferente del telefono principal visible

