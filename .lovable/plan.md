

## Fix WhatsApp Edge Functions for End-to-End Testing

### Problem Found
The `send-whatsapp` and `whatsapp-webhook` functions are **not registered** in `supabase/config.toml`. Without `verify_jwt = false`, the signing-keys system blocks the request before the function code even runs, causing the timeout/canceled errors seen in testing.

### Fix Steps

**1. Register both functions in `supabase/config.toml`**

Add entries for `send-whatsapp` and `whatsapp-webhook` with `verify_jwt = false`:

```toml
[functions.send-whatsapp]
verify_jwt = false

[functions.whatsapp-webhook]
verify_jwt = false
```

**2. Redeploy both Edge Functions**

After updating the config, redeploy `send-whatsapp` and `whatsapp-webhook` so the new JWT settings take effect.

**3. Test the send-whatsapp function**

Call the function with a test payload to verify:
- Auth validation works (getClaims)
- Phone cleaning works
- Whapi.cloud API connection works
- Message is saved to the database

**4. Test the whatsapp-webhook function**

Call the webhook endpoint without auth (simulating Whapi.cloud) to verify inbound message processing.

### Files to Modify

| File | Change |
|---|---|
| `supabase/config.toml` | Add `send-whatsapp` and `whatsapp-webhook` entries |

### After the Fix

Once deployed, I will:
1. Call `send-whatsapp` with a test message to verify the full outbound flow
2. Call `whatsapp-webhook` with a simulated inbound payload to verify the inbound flow
3. Check the `whatsapp_messages` table for the stored records
4. Report results

