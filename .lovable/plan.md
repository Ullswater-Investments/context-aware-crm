

## Boton "Editar" en el panel de detalle de emails

### Cambio

Anadir un boton "Editar" en el panel de detalle de emails enviados (junto a "Responder", "Reenviar" y "Borrar"). Este boton abre el compositor pre-rellenado con los mismos datos del email original (destinatario, CC, asunto y cuerpo), permitiendo al usuario modificar el contenido y reenviarlo.

### Diferencia con "Reenviar"

- **Reenviar**: Abre el compositor con el mismo contenido tal cual, enfocado en reenviarlo sin cambios.
- **Editar**: Misma mecanica pero con el icono de lapiz (`Pencil`) y la intencion de que el usuario modifique el contenido antes de enviar.

### Cambio en `src/pages/Emails.tsx`

Anadir un boton con icono `Pencil` (de lucide-react) entre los botones existentes, solo visible para emails outbound. Al hacer clic, pre-rellena el compositor con los datos del email seleccionado.

| Archivo | Cambio |
|---|---|
| `src/pages/Emails.tsx` | Importar `Pencil`, anadir boton "Editar" en la seccion de acciones del panel de detalle (~10 lineas) |

