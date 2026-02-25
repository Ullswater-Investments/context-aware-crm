

## Revision de errores y mejoras propuestas

### Error critico encontrado

#### Bug en la funcion `find()` del importador (linea 67)

Hay un bug de auto-referencia en `ContactImporter.tsx`. En la funcion `find()`, la variable `idx` se usa dentro del propio callback de `findIndex` antes de ser asignada:

```text
const idx = lower.findIndex((h) => h === p && !assignedHeaders.has(headers[idx]));
//                                                                          ^^^
//                                                          idx aun no existe aqui
```

Esto causa que la comprobacion de `assignedHeaders` **nunca funcione correctamente** en el primer paso (exact matches). La variable `idx` es `undefined` dentro del callback, por lo que `headers[undefined]` es `undefined`, y `assignedHeaders.has(undefined)` siempre es `false`. En la practica el check de duplicados no protege nada en exact matches.

**Solucion**: Cambiar la logica para verificar `assignedHeaders` usando el indice del iterador correctamente:

```text
for (const p of pats) {
  const idx = lower.findIndex((h, i) => h === p && !assignedHeaders.has(headers[i]));
  if (idx >= 0) { ... }
}
```

El mismo problema existe en el segundo paso (linea 76) con `lower.indexOf(h)` que puede fallar con headers duplicados. Corregir a:

```text
const idx = lower.findIndex((h, i) => {
  if (assignedHeaders.has(headers[i])) return false;
  ...
});
```

---

### Estado actual de los datos

- 333 contactos en la base de datos
- Solo 19 tienen email, 0 tienen telefono movil
- **Los contactos del CSV adjunto (162 contactos de Apollo) aun no se han importado**
- El usuario debe usar el boton "Importar" en la pagina de Contactos y subir el archivo CSV

---

### Mejoras propuestas

#### 1. Patron "title" demasiado generico en `position`

El patron `"title"` en la lista de `position` puede capturar columnas como "Job Title" correctamente, pero tambien podria coincidir con otras columnas que contengan "title" en el nombre. Actualmente no es un problema grave porque se usa exact match primero, pero es mejor ser mas especifico.

**Solucion**: Mover "title" al final del array de patrones de `position` para que solo se use como ultimo recurso, y solo en exact match (no en includes).

#### 2. Limite de 1000 filas en queries de contactos

La query `load()` en `Contacts.tsx` no tiene limite explicito. Con el default de 1000 filas del backend, si el usuario supera los 1000 contactos, dejara de ver algunos sin aviso.

**Solucion**: Agregar `.limit(2000)` o implementar paginacion.

#### 3. El perfil del contacto no muestra todos los emails/telefonos de forma clara

Actualmente los emails y telefonos adicionales solo se muestran en la seccion "Datos Lusha" (linea 445-479), lo que es confuso porque estos datos pueden venir del importador o de Apollo, no solo de Lusha. El nombre de la seccion es engañoso.

**Solucion**: Renombrar la seccion "Datos Lusha" a "Datos de contacto adicionales" para que sea mas clara, independientemente de la fuente de los datos.

---

### Archivos a modificar

1. **`src/components/contacts/ContactImporter.tsx`** - Corregir bug de auto-referencia en `find()` (lineas 67 y 76)
2. **`src/pages/Contacts.tsx`** - Agregar limite a la query de contactos
3. **`src/components/contacts/ContactProfile.tsx`** - Renombrar seccion "Datos Lusha" a "Datos adicionales"

