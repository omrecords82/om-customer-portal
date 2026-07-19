# Auth pilot enablement checklist

**Work ref:** `PORTAL-WAVE-B-AUTH`  
**OMBC:** `OMBC-20260718-165445-BD189C`  
**Policy:** Pilot live auth authorized; global `/portal` cutover is Wave K only.

## Build / runtime flags

```bash
VITE_PORTAL_BASE_PATH=/portal2
VITE_PORTAL_AUTH_MODE=live
VITE_PORTAL_REQUIRE_AUTH=true
```

Apply only for internal users and **explicitly allowlisted** pilot tenants. Do not flip marketing/global post-login targets.

## Pre-enable verification (per tenant)

- [ ] Login
- [ ] Logout
- [ ] Expired-session handling
- [ ] Unauthorized handling (`/auth/unauthorized`)
- [ ] User context loaded
- [ ] Church context loaded
- [ ] Role enforcement
- [ ] CSRF behavior
- [ ] Direct nested-route access (e.g. `/portal2/records?type=baptism`)
- [ ] Production error logging observed
- [ ] Rollback plan rehearsed (revert env to `mock` / `REQUIRE_AUTH=false`, redeploy)

## Rollback

1. Set `VITE_PORTAL_AUTH_MODE=mock` and/or `VITE_PORTAL_REQUIRE_AUTH=false`
2. `pnpm deploy:static` (or CI deploy)
3. Confirm `/portal` legacy SPA still serves parish traffic

## Related

- Canonical checklist: `docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md` (Wave B)
- Session client: `src/auth/`
