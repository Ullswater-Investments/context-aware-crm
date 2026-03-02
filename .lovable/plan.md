
## Incluir destinatario original en "Reenviar"

### Problema

Al reenviar un email, el campo "Para" queda vacío. El usuario necesita que el destinatario original aparezca pre-rellenado para tener contexto de a quién se envió originalmente.

### Cambios en `src/pages/Emails.tsx`

Hay dos lugares donde se ejecuta la lógica de reenvío:

1. **Botón hover en la lista (líneas 491-507)**: Actualmente no aplica formato de reenvío. Se actualizará para usar el formato correcto con encabezado y pre-rellenar el destinatario original.

2. **Botón "Reenviar" en panel de detalle (líneas 637-638)**: Cambiar `to: ""` por `to: selected.to_email` para que el destinatario original aparezca pre-rellenado.

### Detalle del cambio

En ambos casos, el campo `to` del compositor se rellenará con el email del destinatario original (`email.to_email` / `selected.to_email`). El usuario podrá modificarlo o añadir más destinatarios antes de enviar.

Adicionalmente, el botón hover de la lista (líneas 491-507) se actualizará para aplicar el mismo formato de reenvío que el panel de detalle: prefijo "Fwd:", encabezado "Mensaje reenviado" con De/Para/Asunto, y contenido original.

| Archivo | Cambio |
|---|---|
| `src/pages/Emails.tsx` | Línea 638: cambiar `to: ""` a `to: selected.to_email` |
| `src/pages/Emails.tsx` | Líneas 491-507: aplicar formato de reenvío completo con `to: email.to_email` |
