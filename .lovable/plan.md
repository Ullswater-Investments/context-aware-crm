

## Fix: Build errors in Contacts.tsx

### Analysis
After thorough review, the `src/pages/Contacts.tsx` file is actually correct:
- `enrichWithFindymailFromCard` is properly defined at line 150
- It's correctly referenced at lines 451 and 533
- The `findymailFilter` state exists at line 59
- The bulk enrich already includes `"findymail"` in services at line 230
- `enrichingFindymailId` state exists at line 72

The build error references lines 568 and 710, but the file only has 573 lines total. This indicates the TypeScript compiler is seeing a cached/stale version of the file.

### Fix
The solution is to perform a trivial no-op edit to `src/pages/Contacts.tsx` to force the build system to re-read the file and clear the stale cache. I will re-save the file with no meaningful changes (e.g., add a trailing newline or reformat a comment) to trigger a fresh compilation.

### Also verify
- Remove the `as any` cast on `findymail_status` in `ContactProfile.tsx` if still present
- Confirm the `enrich-findymail-contact` Edge Function uses `getUser()` instead of the deprecated `getClaims()` (current code uses `getClaims()` which may fail at runtime)

### Files affected
| File | Change |
|---|---|
| `src/pages/Contacts.tsx` | Re-save to clear stale build cache |
| `src/components/contacts/ContactProfile.tsx` | Verify `as any` removal |
| `supabase/functions/enrich-findymail-contact/index.ts` | Fix `getClaims()` to `getUser()` for auth validation |

