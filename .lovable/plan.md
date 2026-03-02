

## Implementar Delay entre Envios de Campana

### Problema

Hostinger aplica un rate limit (`hostinger_out_ratelimit`) que bloquea los emails cuando se envian demasiado rapido. Actualmente el loop de campana envia los 20 emails en rafaga (menos de 1 segundo entre cada uno), lo que dispara este limite y causa que la mayoria fallen.

### Solucion

Anadir un delay de 8 segundos entre cada envio dentro del loop de `sendCampaign` en `ComposeEmail.tsx`, con una cuenta atras visual para que el usuario sepa cuanto falta para el siguiente envio.

### Cambios en `src/components/email/ComposeEmail.tsx`

**1. Nuevo estado para la cuenta atras:**
```typescript
const [campaignCountdown, setCampaignCountdown] = useState<number>(0);
```

**2. Funcion de delay con cuenta atras:**
```typescript
const delayWithCountdown = (seconds: number) => {
  return new Promise<void>((resolve) => {
    setCampaignCountdown(seconds);
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      setCampaignCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
};
```

**3. Insertar delay en el loop de envio (linea 328, despues de `setCampaignProgress`):**
```typescript
setCampaignProgress({ ...progress });

// Delay entre envios para evitar rate limit (excepto tras el ultimo)
if (contact !== campaignContacts[campaignContacts.length - 1]) {
  await delayWithCountdown(8);
}
```

**4. Actualizar la UI de progreso (linea 668-678) para mostrar la cuenta atras:**
```typescript
{campaignProgress && (
  <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium">Enviando campana...</span>
      <span className="text-muted-foreground">
        {campaignProgress.sent + campaignProgress.errors}/{campaignProgress.total}
        {campaignProgress.errors > 0 && (
          <span className="text-destructive ml-1">({campaignProgress.errors} errores)</span>
        )}
      </span>
    </div>
    <Progress value={((campaignProgress.sent + campaignProgress.errors) / campaignProgress.total) * 100} />
    {campaignCountdown > 0 && (
      <p className="text-xs text-muted-foreground text-center">
        Siguiente envio en {campaignCountdown}s (evitando rate limit)
      </p>
    )}
  </div>
)}
```

**5. Limpiar countdown al finalizar (junto a las otras limpiezas en linea 337):**
```typescript
setCampaignCountdown(0);
```

### Resumen

| Archivo | Cambio |
|---|---|
| `src/components/email/ComposeEmail.tsx` | Anadir delay de 8s entre envios con cuenta atras visual |

### Tiempo estimado de campana

Con el delay de 8 segundos: una campana de 20 contactos tardara aproximadamente 2 minutos y 40 segundos en completarse. El usuario vera el progreso en tiempo real con la cuenta atras entre cada envio.

