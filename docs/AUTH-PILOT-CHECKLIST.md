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
- [ ] Direct nested-route access (e.g. `/portal2/records?type=baptism`) — unauthenticated hit must land on `/auth/login?next=` with the full path+query encoded; after login, `getSafePortalNext` restores `/records?type=baptism` and records deep-link parse still applies
- [ ] Production error logging observed
- [ ] Rollback plan rehearsed (revert env to `mock` / `REQUIRE_AUTH=false`, redeploy)

## Automated evidence (not a substitute for per-tenant enablement)

Vitest coverage for Wave B nested-route / gate behavior (shipped with `PORTAL-WAVE-B-AUTH`):

- `src/auth/safeNext.test.ts` — `getSafePortalNext` / `loginPathWithNext` for `/records?type=baptism` (+ basename strip)
- `src/auth/RequireAuth.test.tsx` — `requireAuth` true vs false; nested `next=` redirect shape
- `src/auth/apiFetch.test.ts` — live+requireAuth 401 → login with nested `next=`
- `src/features/records/recordsDeepLink.test.ts` — deep-link parse after `next=` round-trip

Do **not** treat this section as pilot tenant enablement complete.

## Rollback

1. Set `VITE_PORTAL_AUTH_MODE=mock` and/or `VITE_PORTAL_REQUIRE_AUTH=false`
2. `pnpm deploy:static` (or CI deploy)
3. Confirm `/portal` legacy SPA still serves parish traffic

## Related

- Canonical checklist: `docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md` (Wave B)
- Session client: `src/auth/`
