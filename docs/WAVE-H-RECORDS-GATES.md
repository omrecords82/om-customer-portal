# Wave H — Records entry gates (documentation)

**Work ref:** `PORTAL-WAVE-H-EDITORS`  
**Policy:** Sacramental **editors are not authorized** until all entry gates pass. This document closes the documentation and portal-side test gates for permissions, tenant isolation, audit expectations, editor field-selection behavior, and dual-run/rollback.

**Related code:** `src/features/records/recordsApi.ts`, `RecordsPage.tsx`, `recordsApi.test.ts`  
**OM backend parity:** `om/agent-cursor/server/src/api/{baptism,marriage,funeral}.js`, `server/src/utils/roles.js`, `server/src/utils/writeSacramentHistory.ts`, `server/src/routes/lookup.js`

---

## 1. Parish record permission model

OM role hierarchy (canonical, highest first): `super_admin` → `admin` → `church_admin` → `priest` → `deacon` → `editor` → `viewer` → `guest` (`server/src/utils/roles.js`).

| Action | OM server today | Customer Portal today | Wave H editor target |
|---|---|---|---|
| **Read** list / single record | `requireAuth` on `GET /api/*-records` and `GET /api/*-records/:id`; scoped by `church_id` query and/or session `church_id` + per-church DB | Live list when `AUTH_MODE=live` + session `user.churchId`; read-only UI | Same read path; detail drawer uses `GET /api/*-records/:id?church_id=` |
| **Create** | `POST /api/*-records` — `requireAuth` + hierarchy `requireRole('deacon')` (`canManageRecords`) | Client `canManageRecords` (deacon+) before showing create; POST body includes session `church_id` | Same — server now enforces deacon+ |
| **Update** | `PUT /api/*-records/:id` — `requireAuth` + `requireRole('deacon')` (also closed prior gap where PUT lacked auth) | `canManageRecords` (deacon+) for edit affordances | Same |
| **Delete** | `DELETE /api/*-records/:id` — `requireAuth` + `requireRole('deacon')` | **Baptism editor:** `DELETE /api/baptism-records/:id?church_id=` via `deleteBaptismRecord`; deacon+ client gate + AlertDialog confirm | Same |
| **Status / verification** | `PATCH /api/*-records/:id/status` — `requireAuth` + `requireRole('priest')` | Not exposed in portal | Priest+ |
| **Batch** | `POST /api/*-records/batch` — `requireAuth` + `requireRole('deacon')` (auth gap closed 2026-07-19) | Out of Wave H UI scope | Same |
| **Export / import** | Separate admin/import routes | Out of Wave H scope | Document when product requests |

**Portal enforcement (list phase — shipped):**

- `RecordsPage` passes **`user.churchId` from `/api/me` (session)** into `fetchSacramentalRecordsList`. It does **not** use `?churchId=` from the URL for API calls.
- `?churchId=` on `/records` is preserved for **legacy deep-link compatibility** only (`recordsDeepLink.ts`).
- Live list requires `authMode === "live"` and `user.churchId > 0`; otherwise honest mock/empty states.
- Nav/route access follows Wave B `RequireAuth` when `VITE_PORTAL_REQUIRE_AUTH=true`; role-gated nav items remain TBD with product.

**OM server enforcement (2026-07-19):** sacrament mutating routes (`POST`/`PUT`/`DELETE`/`batch`) use `requireAuth` + hierarchy `requireRole('deacon')` from `server/src/utils/roles.js` (`canManageRecords` parity). `PATCH .../status` uses `requireRole('priest')`. GETs remain `requireAuth` only. Receipt: `OMBC-20260719-214357-E075AF`.

---

## 2. Tenant isolation — `church_id` scoping

### Portal client contract

1. **Session church is authoritative.** All live records list requests set query param `church_id=<session churchId>` via `buildRecordsListUrl` in `recordsApi.ts`.
2. **URL `?churchId=` is never forwarded** to list APIs. A bookmark with another parish’s id cannot pivot the authenticated user’s data scope in the portal.
3. **Missing church context fails closed in live mode:** `fetchSacramentalRecordsList` returns `{ ok: false, status: 400, message: "Church context required…" }` when `churchId` is null or ≤ 0.
4. **Query shape:** `church_id`, `page`, `limit`, `search`, `sortField=id`, `sortDirection=desc` on:
   - `GET /api/baptism-records`
   - `GET /api/marriage-records`
   - `GET /api/funeral-records`
5. **Combined “all types” view** merges the three endpoints with the **same** `church_id`; per-type filter required for full server pagination.

### OM server behavior (reference)

- Resolves tenant DB from `church_id` (query, else session).
- List queries add `WHERE church_id = ?` when `church_id` is provided.
- Single-record fetch adds `AND church_id = ?` when scoped.
- OCR and cemetery routes use `validateChurchAccess` in some paths; sacrament list routes rely on auth + `church_id` filtering — portal must not send cross-tenant ids.

### Automated evidence

Vitest: `src/features/records/recordsApi.test.ts` — section **“tenant isolation (list API)”** proves URL construction and live fetch guardrails.

---

## 3. Audit logging requirements

**No client-side audit backend in the portal.** Do not POST synthetic audit events from the browser.

### OM server (existing)

| Event | Mechanism |
|---|---|
| Create / update / delete / import / OCR / merge / restore on sacrament rows | `writeSacramentHistory` → `{baptism,marriage,funeral}_history` tables (`writeSacramentHistory.ts`) |
| Read history for one record | `GET /api/{type}-records/:id/history?church_id=` → `readSacramentHistory` |
| List / search reads | **No** per-row audit trail today — acceptable for list gate; do not add fake logging |
| Invite-user session activity | `activity_log` insert on authenticated requests (auth middleware) |

### Wave H editor expectations

- Every successful **mutating** editor action must go through existing OM REST endpoints so `writeSacramentHistory` runs with `source: 'ui'` (or `'api'` if proxied).
- Editor UI surfaces **record history** via `GET /api/*-records/:id/history` — **Baptism shipped (2026-07-19):** `BaptismHistoryPanel`, `fetchBaptismHistory`, honest empty/error states on edit screen.
- Portal error logging: production builds rely on OM/server logs for failed API calls; no new portal audit store.

---

## 4. `@om/contracts` schema gap

| Item | Status |
|---|---|
| Package pin (portal) | `@om/contracts` → `@omrecords82/contracts@0.2.0` (`package.json`) — **pinned 2026-07-19** |
| Source schemas | **Landed** in `om-packages` `@om/contracts@0.2.0` — `packages/contracts/src/records/` (baptism, marriage, funeral create/update/list + Zod parsers) |
| GitHub Packages publish | **Done** — `@omrecords82/contracts@0.2.0` on GitHub Packages (`om-packages` main `394e541`, `node scripts/publish-github-packages.mjs`) |
| Portal list model | App-owned `SacramentalRecord` in `recordsData.ts` + row mappers in `recordsApi.ts`; `@om/contracts@0.2.0` available for Wave H editor wiring |

**Gate status (2026-07-19):** **Closed** — schemas published (`@omrecords82/contracts@0.2.0`), portal pin bumped, `pnpm install` verified. **Consumption gate closed.**

**Baptism editor (2026-07-19):** **Authorized and shipped** — `BaptismEditorPage`, `baptismEditorApi.ts`, `baptismEditorMappers.ts`; routes `/records/baptism/new` and `/records/baptism/:id/edit`; `RECORDS_EDITOR_UI_SHIPPED.baptism=true`; live `/portal2` deploy sets `VITE_PORTAL_RECORDS_EDITOR_BAPTISM=true` (marriage/funeral flags remain false). **History panel + delete (2026-07-19):** `BaptismHistoryPanel`, `GET /api/baptism-records/:id/history`, `DELETE /api/baptism-records/:id?church_id=` with deacon+ gate + AlertDialog. Marriage/funeral editors follow Baptism pattern when authorized.

**Schema exports (0.2.0):** `parseBaptismRecordCreate|Update`, `parseMarriageRecordCreate|Update`, `parseFuneralRecordCreate|Update`, list query/response parsers, `SACRAMENT_RECORD_STATUSES`, `CURRENT_RECORDS_SCHEMA_VERSION`.

---

## 5. Clergy, location, and related-record selection (Wave H editors)

When editors are authorized, reuse OM lookup APIs with **session `church_id`** (same rule as list):

| Field / need | OM API | Portal rule |
|---|---|---|
| Clergy combobox | `GET /api/lookup/clergy?church_id=&record_type=&search=` | Prefer `source: 'canonical'` entities; fallback DISTINCT from sacrament tables |
| Locations (burial, place) | `GET /api/lookup/locations?church_id=&types=&search=` | Prefer canonical location entities; fallback funeral `burial_location` values |
| Related record pickers (e.g. certificate, marriage link) | Type-specific list/search endpoints with same `church_id` | Search within tenant only; no cross-church record ids |
| Autocomplete on typed fields | `GET /api/{type}-records/autocomplete?church_id=&field=` (legacy) | Optional; church-scoped query param required |

Free-text entry remains allowed where legacy editors allow it; canonical entities reduce duplication. Portal must not cache another tenant’s lookup results under a shared key.

---

## 6. Dual-run and rollback (editors vs legacy)

### Dual-run (when Wave H editors ship)

1. **Feature flags** (env overlays; optional OM church override later): per-type booleans in `src/features/records/recordsEditorFlags.ts`:
   - `VITE_PORTAL_RECORDS_EDITOR_BAPTISM` (default `false`)
   - `VITE_PORTAL_RECORDS_EDITOR_MARRIAGE` (default `false`)
   - `VITE_PORTAL_RECORDS_EDITOR_FUNERAL` (default `false`)
   - Helpers: `resolveRecordsEditorFlags`, `canShowRecordsEditor`, `isRecordsEditorReady`, `canNavigateToRecordsEditor` (requires `editorsUiShipped`), `buildLegacyRecordsEditorUrl`.
2. **Legacy fallback:** `/portal/records/*` legacy SPA remains source of truth until flag on for pilot tenant.
3. **Parity checks:** create → list appears → edit → history entry → delete (where allowed) on same `church_id`.
4. **Order:** Baptism editor first; marriage/funeral reuse pattern — **do not enable more than one flag at a time** (`hasDualRunPilotConflict` blocks editor affordances when violated).

**Portal wiring (2026-07-19):** flag module + tests shipped; `RecordsPage` shows `describeRecordsEditorGateStatus` note; **Baptism editor UI shipped** (`BaptismEditorPage`, list row click / New baptism / `?recordId=` deep link when flag + auth gates pass). **Baptism history + delete shipped** on edit screen. Marriage/funeral editor routes remain unshipped.

### Rollback

1. Set editor flag(s) to `off` (or remove env).
2. `pnpm deploy:static` for Customer Portal if FE changed.
3. Confirm legacy `/portal` editors still serve parish traffic (Wave K cutover is separate).
4. No database rollback from portal — sacrament history is append-only on OM side.

Same pattern as auth pilot rollback: `docs/AUTH-PILOT-CHECKLIST.md`.

---

## 7. Gate checklist mapping

| Wave H entry gate | Status after this doc |
|---|---|
| Live authentication and church context for pilot users | **Closed** — enablement evidence complete for `om_church_46` (2026-07-19); rollback rehearse **waived** (`AUTH-PILOT-CHECKLIST.md`) |
| Real records-list APIs in portal | **Closed** (prior commit) |
| Wave E deep-link compatibility | **Closed** (prior) |
| Canonical schemas in `@om/contracts` | **Closed** — published `@omrecords82/contracts@0.2.0` + portal pin — §4 |
| Read/create/update/delete permission rules documented | **Closed** — §1 |
| Tenant-isolation tests exist | **Closed** — `recordsApi.test.ts` |
| Clergy / location / related-record selection defined | **Closed** — §5 |
| Dual-run or rollback defined | **Closed** — §6 + `recordsEditorFlags.ts` |
| Audit-logging requirements defined | **Closed** — §3 |

**Editors:** **Baptism editor authorized and shipped (2026-07-19)** — dual-run enabled on live `/portal2` deploy (`VITE_PORTAL_RECORDS_EDITOR_BAPTISM=true`; marriage/funeral flags false). Marriage/funeral editors follow Baptism pattern when authorized.
