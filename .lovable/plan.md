

## Plan: Asegurar que todas las tarjetas muestran email/telefono y pueden usar Hunter/Lusha/Apollo

### Problema detectado
- **226 de 265 contactos** no tienen `company_domain` ni `email`, lo que impide que Hunter.io y Apollo funcionen desde las tarjetas.
- Sin embargo, muchas de sus organizaciones SI tienen el campo `website` (ej: `unidental.es`, `blife.es`, `clinicamenorca.com`).
- Las tarjetas solo muestran email/telefono si ya existen datos -- no hay indicacion visual de que faltan ni forma rapida de enriquecer sin dominio.
- Los botones de Hunter/Apollo solo aparecen en las tarjetas Kanban cuando `company_domain` existe.

### Cambios a realizar

#### 1. Migracion SQL: Copiar website de organizacion a company_domain del contacto
Actualizar los ~226 contactos que no tienen `company_domain` pero cuya organizacion tiene `website`, copiando el dominio limpio (sin `https://www.`).

```text
UPDATE contacts c
SET company_domain = (dominio limpio de la organizacion)
WHERE c.company_domain IS NULL 
  AND c.organization_id IS NOT NULL
  AND la organizacion tiene website
```

Esto desbloqueara inmediatamente Hunter y Apollo para la mayoria de contactos.

#### 2. Tarjetas Kanban (src/pages/Contacts.tsx)
- Mostrar siempre una seccion de email y telefono, incluso cuando estan vacios (con texto "Sin email" / "Sin telefono" en gris).
- Mostrar botones Hunter/Apollo para contactos que tienen `company_domain` (ahora muchos mas tras la migracion).
- Agregar boton Lusha directamente en la tarjeta Kanban (actualmente solo esta en el perfil).

#### 3. Tarjetas Lista (src/pages/Contacts.tsx)
- Mismo cambio: mostrar siempre email y telefono, con placeholder cuando faltan.
- Agregar botones de enriquecimiento rapido (Hunter, Apollo, Lusha).

#### 4. Perfil de contacto (src/components/contacts/ContactProfile.tsx)
- En la vista de lectura, mostrar siempre los campos email y telefono aunque esten vacios, con texto "No disponible".
- Si el contacto no tiene `company_domain` pero su organizacion tiene `website`, usar el website como fallback para Hunter.
- Mostrar boton Lusha siempre que el status sea `pending` (ya funciona asi).

### Archivos a modificar

1. **Nueva migracion SQL** -- UPDATE masivo para copiar `organizations.website` a `contacts.company_domain` donde falta
2. **src/pages/Contacts.tsx** -- Mostrar email/phone siempre en tarjetas; agregar botones Lusha en Kanban; usar org website como fallback para Hunter/Apollo
3. **src/components/contacts/ContactProfile.tsx** -- Mostrar campos vacios con "No disponible"; usar org website como fallback

### Resultado esperado
- Todas las tarjetas mostraran secciones de email y telefono (con datos o con indicador de que faltan)
- Hunter, Apollo y Lusha estaran disponibles directamente desde las tarjetas para la gran mayoria de contactos
- Tras la migracion, ~150+ contactos adicionales tendran `company_domain` y podran ser enriquecidos
