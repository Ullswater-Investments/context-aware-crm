

## Enriquecer contactos desde Excel con guardado en Documentos

### Resumen

Modificar el flujo de importacion/enriquecimiento Excel para que, ademas de procesar los contactos, guarde el archivo Excel en el bucket `documents` y registre una entrada en la tabla `documents`. Asi queda un historial de las hojas usadas para enriquecer.

### Cambios

#### 1. `src/components/contacts/ContactImporter.tsx`

Antes de procesar las filas, subir el archivo al bucket `documents` con path `{userId}/{timestamp}_{filename}` e insertar un registro en la tabla `documents` con:
- `name`: nombre del archivo
- `file_path`: path en storage
- `file_type`: tipo MIME
- `file_size`: tamano
- `created_by`: user.id

Esto ocurre al inicio de `processFile`, antes del parseo de filas. Si la subida falla, se muestra un warning pero se continua con la importacion (no es bloqueante).

#### 2. Botón "Subir Excel" (ya existe)

El boton "Importar" (`FileSpreadsheet`) en `Contacts.tsx` linea 543 ya abre el `ContactImporter`. Solo necesitamos renombrar el label a "Subir Excel" para mayor claridad, o anadir un segundo boton dedicado. Recomiendo simplemente mantener el boton existente y anadir la logica de guardado dentro del importer.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/contacts/ContactImporter.tsx` | Subir archivo a storage + insertar en tabla `documents` antes de procesar filas |
| `src/pages/Contacts.tsx` | Renombrar boton "Importar" a "Subir Excel" (opcional, cosmético) |

### Resultado

Al subir un Excel desde cualquier pagina de contactos:
1. El archivo se guarda en Documentos (visible en la seccion de Documentos)
2. Los datos del Excel enriquecen/crean contactos como hasta ahora
3. Queda un registro historico de cada archivo usado para enriquecer

