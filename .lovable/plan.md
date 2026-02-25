

## Revision de errores y soluciones

### Problemas encontrados

#### 1. Los contactos de los CSVs nunca se importaron (CRITICO)

La base de datos tiene 333 contactos, pero solo 19 tienen email y 0 tienen telefono movil. Los 186 contactos de Apollo y 25 de Lusha que subiste como archivos **nunca se procesaron** con el importador. Para importarlos debes usar el boton "Importar" en la pagina de Contactos y subir cada archivo manualmente.

**Solucion**: No requiere cambios de codigo. Solo necesitas:
1. Ir a Contactos -> Importar
2. Subir `Export_Contacts_2026-02-25.csv` (Apollo, 186 contactos)
3. Esperar a que termine
4. Subir `Export_User_Data_2026-02-25.csv` (Lusha, 25 contactos para enriquecer)

---

#### 2. El trigger `updated_at` no existe en ninguna tabla

La funcion `update_updated_at_column()` esta creada en la base de datos, pero no hay ningun trigger asociado. Esto significa que el campo `updated_at` de `contacts`, `organizations`, `projects`, etc. nunca se actualiza automaticamente.

**Solucion**: Crear triggers en las tablas que tienen columna `updated_at`:
- `contacts`
- `organizations`
- `projects`
- `conversations`

---

#### 3. Mapeo de columna `email` demasiado amplio en el importador

El patron `["email", "correo", "e-mail", "mail"]` usa `h.includes("email")` que tambien coincide con "Work email", "Personal email", etc. Esto puede causar que el campo generico `email` apunte a la misma columna que `work_email`, generando datos duplicados.

**Solucion**: Cambiar la logica de `find()` en `mapColumns` para dar prioridad a coincidencias exactas y excluir columnas ya asignadas a campos mas especificos.

---

#### 4. Bucket `email-signatures` es publico (riesgo de privacidad)

Las firmas de email son imagenes personales/corporativas que estan en un bucket publico. Cualquier persona con la URL puede acceder a ellas.

**Solucion**: Cambiar a bucket privado y usar URLs firmadas (signed URLs) con tiempo de expiracion. Actualizar `ComposeEmail.tsx` y `SignatureManager.tsx` para usar `createSignedUrl` en lugar de `getPublicUrl`.

---

#### 5. Falta el secret `RESEND_API_KEY` (verificar configuracion)

El secret existe en la configuracion, pero si nunca se ha probado enviar un email, no se puede confirmar que funciona. No es un error de codigo sino una verificacion pendiente.

---

### Cambios propuestos

#### Migracion SQL - Triggers `updated_at`

Crear triggers para todas las tablas con columna `updated_at`:

```text
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Igual para organizations, projects, conversations
```

#### `src/components/contacts/ContactImporter.tsx`

Corregir la funcion `find()` para:
- Priorizar coincidencias exactas sobre `includes`
- En el patron `email`, excluir coincidencias con "work email", "personal email", "private email"

#### `src/components/email/ComposeEmail.tsx` y `SignatureManager.tsx`

Cambiar `getPublicUrl` por `createSignedUrl` con expiracion de 1 hora para las firmas de email.

### Archivos a modificar

1. **Migracion SQL** - Crear 4 triggers de `updated_at`
2. **`src/components/contacts/ContactImporter.tsx`** - Corregir mapeo de columna email
3. **`src/components/email/ComposeEmail.tsx`** - Usar signed URLs para firmas
4. **`src/components/email/SignatureManager.tsx`** - Usar signed URLs para previews

