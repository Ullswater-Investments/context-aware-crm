

## Mejora de visibilidad del boton WhatsApp

### Cambios en `src/pages/Contacts.tsx`

**1. Import:** Cambiar `MessageCircle` por `MessageSquare` en la linea de imports (linea 13).

**2. Kanban - Icono junto al telefono (lineas 429-431):**
Aumentar tamano del icono y anadir fondo verde con padding:
- De: `p-0.5 rounded hover:bg-[#25d366]/10` + `MessageCircle w-3 h-3`
- A: `p-1 rounded-md bg-[#25d366]/15 hover:bg-[#25d366]/25` + `MessageSquare w-4 h-4`

**3. Kanban - Boton WhatsApp en fila de herramientas (despues de linea 469):**
Anadir un boton "WhatsApp" al final de la fila, solo visible si el contacto tiene telefono:
```text
[Hunter] [Apollo] [Lusha] [Findymail] [WhatsApp]
```
Estilo: `bg-[#25d366]/15 text-[#25d366] hover:bg-[#25d366]/25` con icono `MessageSquare w-3 h-3`.

**4. Lista - Icono junto al telefono (lineas 520-522):**
Mismo tratamiento que Kanban: fondo verde, `rounded-md`, `p-1`, `MessageSquare w-4 h-4`.

**5. Lista - Boton WhatsApp en fila de herramientas (despues de linea 555):**
Igual que en Kanban, boton "WhatsApp" al final de la fila si tiene telefono.

### Cambios en `src/components/contacts/ContactProfile.tsx`

**6. Import:** Cambiar `MessageCircle` por `MessageSquare`.

**7. Boton junto al telefono (lineas 469-471):**
Convertir en boton prominente con fondo solido verde:
- De: icono discreto con hover
- A: boton con `bg-[#25d366] hover:bg-[#1da851] text-white px-2 py-1 rounded-md` e icono `MessageSquare` + texto "WhatsApp"

### Resumen

| Ubicacion | Antes | Despues |
|---|---|---|
| Kanban telefono | Punto verde 12px | Boton con fondo verde 16px |
| Kanban herramientas | No existia | Boton "WhatsApp" verde |
| Lista telefono | Icono 14px sin fondo | Boton con fondo verde 16px |
| Lista herramientas | No existia | Boton "WhatsApp" verde |
| Perfil contacto | Icono discreto | Boton solido verde con texto |

Archivos a modificar: `src/pages/Contacts.tsx` y `src/components/contacts/ContactProfile.tsx`. No hay cambios de logica ni backend - todos los botones usan `setWhatsappContact(c)` y `setWhatsappOpen(true)` existentes.
