# Auth pilot enablement checklist

**Work ref:** `PORTAL-WAVE-B-AUTH`  
**OMBC:** `OMBC-20260718-165445-BD189C`  
**Policy:** Pilot live auth authorized; global `/portal` cutover is Wave K only.

## Operator runbook (per tenant)

1. **Dry-run env (no API calls)** — from repo root:
   ```bash
   pnpm validate:auth-pilot
   ```
   Confirms effective `VITE_PORTAL_*` flags and prints the manual verification list. Does **not** substitute for real-user testing.

2. **Allowlist** — confirm the tenant slug in the allowlist table below matches the operator-provided identifier. **Sole authorized pilot tenant:** `om_church_46`. Record numeric `church_id` from Account → Session diagnostics after first live login if it differs from the slug.

3. **Deploy flags** — apply **only** for the target pilot deploy (internal users or one allowlisted tenant):
   ```bash
   VITE_PORTAL_BASE_PATH=/portal2
   VITE_PORTAL_AUTH_MODE=live
   VITE_PORTAL_REQUIRE_AUTH=true
   ```
   Build/deploy with those vars (see `scripts/deploy-static.sh`). Do **not** flip marketing/global post-login targets or legacy `/portal`.

4. **Manual verification** — complete every row in [Pre-enable verification](#pre-enable-verification-per-tenant) with a real pilot user. Use Account → **Session diagnostics** (live mode only) to confirm `churchId` and parish settings API source.

5. **Evidence** — fill the [Per-tenant evidence log](#per-tenant-evidence-log) and mark Wave B item in `docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md` when **all** tenants in scope are done.

6. **Rollback rehearse** — before closing evidence, revert env to mock / `REQUIRE_AUTH=false`, redeploy, confirm `/portal` legacy SPA still serves parish traffic.

## Pilot allowlist (operator-maintained)

| Tenant slug | Church id | Env scope / deploy note | Authorized by | Date |
| --- | --- | --- | --- | --- |
| `om_church_46` | **46** (`Saints Peter & Paul Orthodox Church` / DB `om_church_46`) | Per-tenant deploy: `VITE_PORTAL_AUTH_MODE=live`, `VITE_PORTAL_REQUIRE_AUTH=true` — **not** committed globally | operator | 2026-07-19 |

> **Sole pilot tenant:** `om_church_46` is the operator-provided identifier (slug). Do **not** add other tenants without explicit authorization. If session `churchId` differs from the slug, update the Church id column after first live login — do not invent numeric IDs.

## Per-tenant evidence log

Copy one block per enabled tenant. Attach screenshots or log excerpts in your operator ticket — not necessarily in git.

### Tenant: `om_church_46` · Church **46**

> **Live-auth deploy (2026-07-19):** `./scripts/deploy-static.sh` with build-time `VITE_PORTAL_BASE_PATH=/portal2`, `VITE_PORTAL_AUTH_MODE=live`, and `VITE_PORTAL_REQUIRE_AUTH=true` (one-shot; repo `.env.example` remains `mock` / `false`).
>
> **Records list fix (2026-07-19):** Empty `/portal2/records` traced to portal session bootstrap (records fetch before auth ready; `church_id` string not coerced to numeric `churchId`) — fixed portal `b96950e`, OMAI PR #314 / `d5d0a11` (OIDC redirect to `/portal2/auth/oidc-complete` when `next` starts with `/portal2`).
>
> **Operator confirmed (2026-07-19):** `frjames@ssppoc.org` on `/portal2` — login OK, `/api/me` + session `churchId` **46**, live records list **1296** combined rows (626 baptism + 223 marriage + 447 funeral). Remaining rows below still require manual verification.

| Check | Pass | Operator | Date | Notes |
| --- | --- | --- | --- | --- |
| Login | [x] | operator | 2026-07-19 | `frjames@ssppoc.org`; OIDC handoff returns to `/portal2/auth/oidc-complete` when `next=/portal2/...` |
| Logout | [ ] | | | |
| Expired-session handling | [ ] | | | |
| Unauthorized (`/auth/unauthorized`) | [ ] | | | |
| User context (`/api/me`) | [x] | operator | 2026-07-19 | Account diagnostics: user id **2**, role **priest** |
| Church context (session `churchId` > 0) | [x] | operator | 2026-07-19 | Session `churchId` **46** confirmed (Account diagnostics) |
| Parish settings (`GET /api/my/church-settings`) | [ ] | | | Parish chrome source = live |
| Role enforcement (nav + gated pages) | [ ] | | | |
| CSRF (mutating API smoke test) | [ ] | | | e.g. profile save |
| Nested route `next=` round-trip | [ ] | | | `/records?type=baptism` |
| **Records list (live)** | [x] | operator | 2026-07-19 | `/portal2/records` — **1296** combined (626+223+447) for church 46 |
| Production error logging | [ ] | | | optional 403/404 observe |
| Rollback rehearsed | [ ] | | | mock + redeploy |

**Wave B checklist item:** `[ ] Pilot tenant enablement evidence` — **partial evidence** (login + church context + live records list confirmed 2026-07-19); close only when every row in this table is complete for every allowlisted tenant.

## Build / runtime flags

```bash
VITE_PORTAL_BASE_PATH=/portal2
VITE_PORTAL_AUTH_MODE=live
VITE_PORTAL_REQUIRE_AUTH=true
```

Apply only for internal users and **explicitly allowlisted** pilot tenants. Do not flip marketing/global post-login targets.

## Pre-enable verification (per tenant)

- [x] Login — operator confirmed `frjames@ssppoc.org` 2026-07-19
- [ ] Logout
- [ ] Expired-session handling
- [ ] Unauthorized handling (`/auth/unauthorized`)
- [x] User context loaded — `/api/me`; user id **2**, role **priest** (2026-07-19)
- [x] Church context loaded — session `churchId` **46** (2026-07-19)
- [ ] Role enforcement
- [ ] CSRF behavior
- [ ] Direct nested-route access (e.g. `/portal2/records?type=baptism`) — unauthenticated hit must land on `/auth/login?next=` with the full path+query encoded; after login, `getSafePortalNext` restores `/records?type=baptism` and records deep-link parse still applies
- [ ] Production error logging observed
- [ ] Rollback plan rehearsed (revert env to `mock` / `REQUIRE_AUTH=false`, redeploy)

## In-app diagnostics (live mode)

When `VITE_PORTAL_AUTH_MODE=live`, **Account** shows a **Session diagnostics** card (operator-facing, not end-user marketing):

- Session bootstrap state
- User id, role
- Session `churchId` (church context gate for live APIs)
- Parish settings API source (`live` / error)

Use this during manual verification; it does not replace API/server-side checks.

## Automated evidence (not a substitute for per-tenant enablement)

**Dry-run (env only):**

```bash
pnpm validate:auth-pilot
```

**Vitest** — Wave B nested-route / gate behavior (shipped with `PORTAL-WAVE-B-AUTH`):

- `src/auth/safeNext.test.ts` — `getSafePortalNext` / `loginPathWithNext` for `/records?type=baptism` (+ basename strip)
- `src/auth/RequireAuth.test.tsx` — `requireAuth` true vs false; nested `next=` redirect shape
- `src/auth/apiFetch.test.ts` — live+requireAuth 401 → login with nested `next=`
- `src/features/records/recordsDeepLink.test.ts` — deep-link parse after `next=` round-trip
- `src/auth/authPilotDiagnostics.test.ts` — live diagnostics line builder

Do **not** treat automated sections as pilot tenant enablement complete.

## Rollback

1. Set `VITE_PORTAL_AUTH_MODE=mock` and/or `VITE_PORTAL_REQUIRE_AUTH=false`
2. `pnpm deploy:static` (or CI deploy)
3. Confirm `/portal` legacy SPA still serves parish traffic

## Related

- Canonical checklist: `docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md` (Wave B)
- Records editor gates (blocked until pilot evidence): `docs/WAVE-H-RECORDS-GATES.md`
- Session client: `src/auth/`
