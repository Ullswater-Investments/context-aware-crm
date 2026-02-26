

## Fix: Botón "Enviar" no visible en el compositor de email

### Problema

El footer del compositor tiene todos los controles en una sola fila (`flex items-center justify-between`): adjuntos, switch de firma, plantillas, gestor de plantillas, selector de firma, gestor de firmas, guardar plantilla, vista previa, IA y enviar. En pantallas normales o cuando el panel lateral no ocupa suficiente ancho, el botón "Enviar" queda fuera del viewport o comprimido hasta ser invisible.

### Solucion

Reorganizar el footer en **dos filas**:

**Fila 1 (herramientas):** Todos los controles secundarios agrupados y con scroll horizontal si es necesario.
- Izquierda: Adjuntar, Firma (switch + selector + gestionar), separador, Plantillas (picker + gestionar)
- Derecha: Guardar plantilla, Vista Previa, IA

**Fila 2 (accion principal):** Solo el boton "Enviar", prominente y siempre visible, ocupando el ancho completo o alineado a la derecha con mayor tamaño.

### Cambios tecnicos

**Archivo:** `src/components/email/ComposeEmail.tsx` (lineas 540-687, seccion del footer)

Reestructurar el JSX del footer:

```
<div className="shrink-0 border-t border-border bg-background px-4 py-2 space-y-2">
  {/* Fila 1: Herramientas */}
  <div className="flex items-center gap-2 overflow-x-auto">
    [adjuntar] [firma switch+selector+config] | [plantillas+config] | [guardar plantilla] [vista previa] [IA]
  </div>
  
  {/* Fila 2: Enviar */}
  <div className="flex justify-end">
    <Button onClick={send} ... size="default" className="px-6">
      Enviar <Send />
    </Button>
  </div>
</div>
```

Esto garantiza que el boton de enviar **siempre sea visible** independientemente del ancho de la pantalla, y ademas le da mayor prominencia visual como accion principal del compositor.
