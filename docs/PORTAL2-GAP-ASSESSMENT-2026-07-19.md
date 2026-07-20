# Portal2 Gap Assessment — 2026-07-19

> **Classification:** INTERNAL (operator / agent)  
> **Purpose:** Structured parity assessment — Customer Portal `/portal2` vs legacy parish SPA `/portal`  
> **Sources:** `prod/tmp/issues/` (operator screenshots), migration checklists, handoff checkpoint, live codebase comparison  
> **Canonical path:** `om-customer-portal/docs/PORTAL2-GAP-ASSESSMENT-2026-07-19.md`  
> **Operator copy:** `/var/www/orthodoxmetrics/prod/tmp/PORTAL2-GAP-ASSESSMENT-2026-07-19.md`  
> **OMBC:** `OMBC-20260718-165445-BD189C` · **OMD:** `PENDING_RECONCILIATION`

---

## 1. Executive summary

**Overall MVP parity estimate: ~72%** (live operational parity for Wave K Go/No-Go, not visual shell alone).

Portal2 has a production-ready shell, live auth for sole pilot tenant **`om_church_46`** (church **46**), live records **lists**, live OCR **upload/history**, certificate **generate/history**, hub KPIs, onboarding, and a **baptism editor** behind dual-run flag. Legacy `/portal` remains the fallback for marriage/funeral editors, OCR review/settings studio, full parish admin hub, assets, certificate designer, and several account-hub sub-surfaces.

| Category | Approx. parity | Notes |
|---|---:|---|
| Auth & session | **95%** | Live pilot closed; global cutover deferred Wave K |
| Account / parish settings | **78%** | Profile/sessions/users OK; church-details discrete fields **implemented 2026-07-19** — church 46 reload **unverified** |
| Records (list + editors) | **62%** | Live lists + deep links; baptism editor shipped; marriage/funeral/chrismation gaps |
| OCR (workflow + admin) | **68%** | Mobile/desktop upload MVP wired; **`/portal2/ocr/settings` implemented 2026-07-19** — review studio still missing |
| Certificates | **72%** | History + render live; designer/templates management deferred |
| Hub / help / onboarding | **88%** | Live or honest empties; liturgical calendar post-MVP |
| Metrics / charts | **65%** | KPI dashboard live; chart rendering deferred |
| Cemetery | **35%** | Read MVP code shipped; **prod flags OFF**; simplified map vs legacy engine |
| Wave K readiness | **18%** | Single pilot; baptism UI smoke unsigned; no global cutover |

### Critical gaps (P0 — block Wave K or daily parish ops on `/portal2`)

1. **Marriage and funeral sacramental editors** — not started (`VITE_PORTAL_RECORDS_EDITOR_MARRIAGE/FUNERAL=false`).
2. ~~**Parish church-details field parity**~~ — **implemented** `/portal2/settings/parish` (address + jurisdiction + language); **church 46 persistence reload not verified**.
3. ~~**OCR Settings admin console**~~ — **implemented** `/portal2/ocr/settings` (Documents, Rules, Clergy, Locations); clergy/location CRUD, merge, split, import (clergy), rule editor dialogs shipped **2026-07-20**; **church 46 live smoke unverified**.
4. **OCR in-portal review studio** — field review, crop/rotate, confirm-extract still legacy-only.
5. **Baptism editor operator UI sign-off** — API smoke PASS; frjames UI CRUD/history/delete still unsigned.

### Deferred / post-MVP (explicitly not Wave K blockers per operator decisions)

- Liturgical calendar UI, assets library, interactive reports, certificate designer canvas, cemetery geometry editing, full `@om/icons` / brand-token cleanup, public `/enroll`, global `/portal` cutover, second+ pilot tenants until authorized.

---

## 2. Methodology

Compared:

1. **Operator issues** — all files under `/var/www/orthodoxmetrics/prod/tmp/issues/` (6 PNG screenshots; no markdown issue tickets).
2. **Program checklists** — `ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md`, `ENDUSER-OM-PACKAGES-COMPLETION-PLAN.md`, `PORTAL2-HANDOFF-CHECKPOINT-2026-07-19.md`, `AUTH-PILOT-CHECKLIST.md`.
3. **Portal2 routes & features** — `om-customer-portal/src/app/App.tsx`, `src/config/navConfig.ts`, feature modules under `src/features/**`.
4. **Legacy parity reference** — `orthodoxmetrics/prod/front-end/src/routes/portalRoutes.tsx`, `Router.tsx` (`/account/*`), account hub pages, portal OCR desktop/settings.

Assessment rules:

- Mark **done** only with code + checklist/handoff evidence (live APIs or honest empty states).
- Distinguish **code shipped** vs **prod enablement** (cemetery flags, editor dual-run flags).
- Severity: **P0** = Wave K blocker or operator-reported daily-work gap; **P1** = high parish-admin impact; **P2** = polish; **deferred** = operator-explicit post-MVP.

---

## 3. Issues from `prod/tmp/issues`

The issues directory contains **6 operator screenshot files** (no separate `.md` issue tickets). Titles inferred from URL/filename and screenshot content.

| Issue file | Title (inferred) | Status in Portal2 | Priority |
|---|---|---|---|
| `screencapture-orthodoxmetrics-account-church-details-2026-07-19-22_40_28.png` | Legacy **Church Details** editable form (`/account/church-details`) — address + liturgical fields | **Implemented (unverified)** — `/portal2/settings/parish` discrete address + jurisdiction picker + language (2026-07-19) | **P0 verify** |
| `screencapture-orthodoxmetrics-account-church-details-2026-07-19-22_52_32.png` | Same Church Details parity capture (duplicate evidence) | Same as above | **P0 verify** |
| `screencapture-orthodoxmetrics-portal-ocr-settings-2026-07-19-22_38_19.png` | Legacy OCR Settings — **Documents** tab (processing, snippets, retention) | **Implemented (unverified)** — `/portal2/ocr/settings` Documents tab | **P0 verify** |
| `screencapture-orthodoxmetrics-portal-ocr-settings-2026-07-19-22_33_14.png` | Legacy OCR Settings — **Parish Clergy** tenures (discover/merge/add) | **Implemented** — `/portal2/ocr/settings` Clergy tab (Add/Edit/Delete/Import/Merge/Split/Rediscover, 2026-07-20) | **P0 verify** |
| `screencapture-orthodoxmetrics-portal-ocr-settings-2026-07-19-22_35_42.png` | Legacy OCR Settings — **Rules Engine** (validation/inference rules) | **Implemented (unverified)** — `/portal2/ocr/settings` Rules tab | **P1 verify** |
| `screencapture-orthodoxmetrics-portal-ocr-settings-2026-07-19-22_34_53.png` | Legacy OCR Settings — **Locations** (canonical church/cemetery/burial) | **Implemented** — `/portal2/ocr/settings` Locations tab (Add/Edit/Delete/Merge/Split/Rediscover; Import N/A — no backend API, 2026-07-20) | **P0 verify** |

**Issues files processed: 6**

---

## 4. Area-by-area gap matrix

Routes use production URLs; Portal2 basename is `/portal2`, legacy is `/portal`. Account hub routes are shared (`/account/*`) outside the portal shell.

### 4.1 Parish / Account settings

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Account profile edit | **Done** — `/portal2/account` | — | Wave C | `AccountPage.tsx` + `GET/PUT /api/user/profile` |
| Password change | **Done** — dialog on Account page | — | Wave C | `PUT /api/user/profile/password` |
| Active sessions list + revoke | **Done** — Account page | — | Wave B/C | `settingsApi.ts` sessions endpoints |
| Parish info overview (membership, role, CRM) | **Partial** — parish fields on `/settings/parish` only | P2 | Wave C | Legacy `/account/parish` richer read-only hub |
| Church details edit (address, liturgical) | **Implemented (unverified)** — `/portal2/settings/parish` discrete fields + PUT payload (2026-07-19) | **P0 verify** | Wave C |
| Branding (logo, colors) | **Missing** | P1 | Wave C / PM hub | Legacy `/account/branding` |
| OCR preferences (language, preprocessing, retention) | **Partial** — autoseed only | **P0** | Wave C / F | Legacy `/account/ocr-preferences` + `/portal/ocr/settings` |
| Notification prefs | **Partial** — digest + cert; OCR job alerts N/A live | P2 | Wave C | `PreferencesPage.tsx` |
| Parish users directory | **Partial** — list + unlock | P1 | Wave C | `/portal2/settings/users`; invite/revoke gated |
| Parish Management Hub | **Missing** | P1 | Legacy PM | `/account/parish-management/*` (mapping, themes, search config) |
| Account hub IA (multi-page sidebar) | **Partial** — consolidated Account + settings routes | P2 | Wave C | Legacy `/account/profile`, `/personal-info`, `/password`, `/sessions`, `/notifications` |

### 4.2 Records

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Unified records hub + `?type=` deep links | **Done** — `/portal2/records?type=` | — | Wave E | `recordsDeepLink.ts` + tests |
| Live list/search (baptism, marriage, funeral) | **Done** — church 46 live (1296 rows) | — | Wave E | `recordsApi.ts` |
| Chrismation list | **Gap** — filter exists; **no list API** | P1 | Wave E | Honest empty in `recordsApi.ts` |
| Sort / advanced filters / AG Grid | **Partial** — table/cards, basic search | P2 | Wave E | Legacy AG Grid in `records-management` |
| Baptism create/edit/history/delete | **Done (dual-run)** — flag ON prod | P0 verify | Wave H | `/portal2/records/baptism/new`, `…/:id/edit`; UI smoke unsigned |
| Marriage create/edit | **Missing** | **P0** | Wave H | Legacy `/portal/records/marriage/new|edit/:id` |
| Funeral create/edit | **Missing** | **P0** | Wave H | Legacy `/portal/records/funeral/new|edit/:id` |
| Clergy/location selectors in editors | **Partial** — baptism editor only | P1 | Wave H | `WAVE-H-RECORDS-GATES.md` §5 |
| Record delete from list | **Missing** — list is read-only chrome | P2 | Wave H | Delete via baptism editor only |

### 4.3 Certificates

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Certificate hub + generate + history | **Done** — `/portal2/certificates` | — | Wave F | Live render + history download |
| Template designer / manage templates | **Missing** | deferred | Wave F | Legacy `/portal/certificates/designer/:id`, `/templates` |
| Chrismation/reception cert types | **Partial** — kind normalization only | P2 | Wave F | Studio types limited vs legacy |
| Interactive reports / recipients | **Missing** | deferred | Wave F | Explicitly deferred in checklist |

### 4.4 OCR (desktop / mobile / admin)

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| OCR desktop upload wizard | **Done** — `/portal2/ocr` | — | Wave BP | `OcrDesktopPage.tsx` |
| OCR mobile 4-phase capture | **Done** — `/portal2/ocr/mobile` | — | Wave BP | Operator visual QA approved |
| Job history, polling, retry, seed, download | **Done** (live) | — | Wave BP | `ocrApi.ts` |
| OCR review queue / per-job review | **Missing** | **P0** | Wave BP cutoff | Legacy `/portal/ocr/review/:churchId/:jobId` |
| OCR Settings (Documents/API/Rules/Clergy/Locations) | **Implemented (unverified)** — `/portal2/ocr/settings` | **P0 verify** | Operator issues | Legacy `/portal/ocr/settings`; clergy toolbar parity **2026-07-20**; no provider/API tab (deferred); location bulk import **blocked** (no API) |
| Record field mapping | **Implemented (unverified)** — `/portal2/settings/record-fields` | P1 verify | PM hub | API: `GET/PUT /api/church/:id/ocr/record-fields`; legacy was `/account/parish-management/record-settings` — **routing gap, not deleted API** |
| Batch delete, QR pairing | **Missing** | P2 | `OCR_LIVE_CUTOFF_NOTES` | Documented deferred |
| OCR setup wizard | **Missing** | P2 | Legacy `/portal/ocr/setup` | Staff-only legacy route |

### 4.5 Hub

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Dashboard KPIs + recent activity | **Done** — `/portal2/` | — | Wave D | `hubApi.ts`; honest empties |
| Quick actions / module cards | **Done** | — | Wave D | `hubPresentation.ts` |
| Liturgical calendar widget | **Missing** | deferred | Wave G/J | Post-MVP per operator |
| Church-46 custom header/theme pack | **Missing** | deferred | Wave J | Legacy `church46` shell is tenant-specific |

### 4.6 Metrics

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Church metrics KPIs | **Done** — `/portal2/metrics` | — | Wave G | Shared dashboard API with hub |
| OM Charts graphical series | **Partial** — summary note only | deferred | Wave G | Legacy `/portal/charts`; chart libs deferred |
| Sacramental restrictions / schedule guidelines | **Missing** | P2 | Legacy route | `/portal/sacramental-restrictions` |

### 4.7 Cemetery

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Cemetery module (map, plots, records, maintenance, reports) | **Partial** — read MVP behind flags | P1 | Wave G | `/portal2/cemetery` |
| Prod enablement for church 46 | **Not done** | **P1** | G-ENABLE | Prod bake: `VITE_CEMETERY_*=false` |
| Full CemeteryMap engine (trees, landmarks, directions) | **Missing** | deferred | Wave G | `CemeteryReadOnlyMap.tsx` SVG MVP |
| Geometry editing | **Excluded** | deferred | Operator MVP | By design |

### 4.8 Onboarding

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Authenticated onboarding checklist | **Done** — `/portal2/onboarding` | — | Wave I / BP-3 | Live checklist APIs |
| Record tables / layouts wizard steps | **Done** — sub-routes under `/onboarding/*` | — | Wave I | |
| Public enroll | **Out of scope** | — | Wave I decision | Separate product |

### 4.9 Help

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Help / guides / site map | **Done** — `/portal2/help` | — | Wave D | Grouped sitemap |
| Legacy user guide route | **Partial** | P2 | Legacy `/portal/guide` | Content parity not 1:1 |

### 4.10 Auth

| Legacy capability | Portal2 status | Severity | Wave / ref | Notes |
|---|---|---|---|---|
| Login / logout / OIDC complete | **Done** — `/portal2/auth/*` | — | Wave B | OMAI PR #314 redirect fix |
| Forgot password, verify email, accept invite | **Done** | — | Wave B | |
| Unauthorized page | **Done** | — | Wave B | |
| Global post-login → `/portal2` for all tenants | **Missing** | deferred | Wave K | Pilot only `om_church_46` |
| `@om/ui/toast` / FormAlert | **Missing** | P1 | GAP-TOAST | Interim text status only |

### 4.11 Other legacy portal modules (no Portal2 route)

| Legacy route | Portal2 | Severity | Notes |
|---|---|---|---|
| `/portal/assets` | **Missing** | deferred | Assets library explicitly deferred |
| `/portal/certificates/designer/*` | **Missing** | deferred | Canvas app-owned / deferred |
| `/account/parish-management/*` | **Missing** | P1 | Database mapping, theme studio, record settings, etc. |

---

## 5. Parish settings deep-dive

### 5.1 Route mapping

| Surface | Legacy | Portal2 |
|---|---|---|
| Parish overview | `/account/parish` | *(no dedicated page)* — partial info on `/portal2/settings/parish` |
| Editable church details | `/account/church-details` | `/portal2/settings/parish` |
| Branding | `/account/branding` | **none** |
| OCR prefs (account) | `/account/ocr-preferences` | `/portal2/settings/preferences` (subset) |
| OCR admin settings | `/portal/ocr/settings?church=:id` | **none** |

### 5.2 Field-by-field comparison (church details)

Source: legacy `AccountChurchDetailsPage.tsx` vs Portal2 `ParishSettingsPage.tsx` + `settingsApi.ts` mappers.

| Field | Legacy UI | Legacy API field(s) | Portal2 UI | Portal2 PUT payload | Gap |
|---|---|---|---|---|---|
| Church name | Text input | `name` | Official name | `name` | **OK** |
| Short name | *(branding page)* | `short_name` | Short name | `short_name` | **OK** |
| Email | Text input | `email` | Office email | `email` | **OK** |
| Phone | Text input | `phone` | Office phone | `phone` | **OK** |
| Website | Text input | `website` | Website | `website` | **OK** |
| Street address | Text input | `address` | *(absent)* | *(not sent)* | **P0 gap** |
| City | Text input | `city` | Collapsed into **Location** | `city` (parsed) | **P0** — no dedicated city field |
| State / Province | Text input | `state_province` | Collapsed into **Location** | `state_province` (parsed) | **P0** |
| Postal code | Text input | `postal_code` | *(absent)* | *(not sent)* | **P0 gap** |
| Country | Text input | `country` | *(absent)* | *(not sent)* | **P0 gap** |
| Jurisdiction | **Dropdown** (`/jurisdictions`) | `jurisdiction`, `jurisdiction_id` | Free-text **Diocese** | `jurisdiction` string only | **P0** — no ID, no picker |
| Calendar type | Read-only (from jurisdiction) | `calendar_type` | *(absent)* | *(not sent)* | **P0 gap** |
| Preferred language | Dropdown | `preferred_language` | *(absent)* | *(not sent)* | **P0 gap** |
| CRM apply jurisdiction | Button | sets `jurisdiction_id` | *(absent)* | — | P1 |
| Save / Cancel | Sticky actions | `PUT /api/my/church-settings` | Edit mode Save/Cancel | Same API, **reduced payload** | **Partial** |
| Read-only role messaging | Alert | priest+ edit | Role gate message | priest in `CHURCH_EDITOR_ROLES` | **OK** (roles align) |

### 5.3 API notes

- **GET** `/api/my/church-settings` — Portal2 reads live data (`churchSettingsToParishProfile` in `settingsApi.ts`); auth pilot confirmed live for church 46 after backend fix `f1aeb2d37`.
- **PUT** `/api/my/church-settings` — Portal2 sends `parishProfileToChurchPayload()` which **omits** `address`, `postal_code`, `country`, `jurisdiction_id`, `calendar_type`, `preferred_language`. Backend likely accepts partial updates, but Portal2 cannot persist legacy-equivalent church details even when Edit is available.
- **Jurisdictions reference** — Legacy loads `GET /jurisdictions`; Portal2 has no client call.
- **Location parsing risk** — Single "Location" string split on first comma (`parishLocationToApiFields`) loses street/postal/country and is fragile vs legacy discrete fields.

### 5.4 Operator screenshot parity target

Legacy `/account/church-details` (issues PNGs) shows editable sections:

1. **Basic Information** — name, email, phone, website  
2. **Address** — street, city, state, postal code, country  
3. **Liturgical Settings** — jurisdiction select, calendar type (derived), preferred language  
4. **Cancel / Save Changes**

Portal2 `/portal2/settings/parish` default view is read-only labels until **Edit**; even in edit mode it does not expose address or liturgical controls. **Screenshot parity requires Wave C follow-up**, not just toggling edit mode.

---

## 6. Recommended remediation order (top 10)

| # | Item | Effort | Severity | Work ref |
|---|---|---|---|---|
| 1 | **Parish settings field parity** — address + jurisdiction picker + language + PUT payload | **M** | P0 | `PORTAL-WAVE-C-SETTINGS` |
| 2 | **Baptism UI smoke sign-off** (frjames CRUD/history/delete) | **S** | P0 | `PORTAL-WAVE-H-BAPTISM-SMOKE` |
| 3 | **Marriage editor** (baptism dual-run OFF first) | **L** | P0 | `PORTAL-WAVE-H-MARRIAGE` |
| 4 | **Funeral editor** | **L** | P0 | `PORTAL-WAVE-H-FUNERAL` |
| 5 | **OCR Settings route** — port `/portal/ocr/settings` tabs (start Documents + Clergy + Locations) | **L** | P0 | Operator issues / Wave F |
| 6 | **OCR review studio** in Portal2 or documented legacy bridge with nav | **L** | P0 | `OCR_LIVE_CUTOFF_NOTES` |
| 7 | **Expand OCR preferences** — match `/account/ocr-preferences` fields on `/settings/preferences` | **M** | P1 | Wave C |
| 8 | **GAP-TOAST + FormAlert** (Codex) then portal adoption | **M** | P1 | `OM-PACKAGES-GAP-TOAST` |
| 9 | **Cemetery enablement church 46** (flags ON + smoke) | **S** | P1 | `PORTAL-WAVE-G-CEMETERY-ENABLE` |
| 10 | **Second pilot tenant + Wave K evidence pack** | **M** | P0 (cutover) | `PORTAL-WAVE-K-PILOTS` |

Effort key: **S** ≈ 1–3 days, **M** ≈ 1–2 weeks, **L** ≈ multi-week / multi-PR.

---

## 7. Explicitly NOT missing / already done

Do **not** re-open these as gaps without new operator direction:

| Area | Evidence |
|---|---|
| `/portal2` static deploy + CI + `@om/*` packages | Wave A; `scripts/deploy-static.sh` |
| Live auth pilot **`om_church_46`** | `AUTH-PILOT-CHECKLIST.md` closed 2026-07-19 |
| Live records list + `?type=` deep links | Wave E; 1296 rows church 46 |
| Hub live KPIs / honest empties | Wave D; `hubApi.ts` |
| OCR mobile + desktop productized UX | Wave BP; operator visual QA approved |
| Live OCR upload, history, polling, retry/seed/download | `ocrApi.ts`, handoff §4 |
| Certificates history + render | Wave F; `certificatesApi.ts` |
| Onboarding checklist + wizard sub-routes | Wave I |
| Account profile, password, sessions (live) | Wave B/C; `AccountPage.tsx` |
| Parish users list + unlock (live) | Wave C; `ParishUsersPage.tsx` |
| Baptism editor UI + history + delete (shipped) | Wave H; prod flag ON |
| `@om/contracts` sacramental schemas 0.2.0 | om-packages PR #16 |
| Sacrament mutate role guards (backend) | OMBC `OMBC-20260719-214357-E075AF` |
| Records deep-link tests | `recordsDeepLink.test.ts` |
| Shell a11y baseline | Wave J partial |
| Cemetery read MVP **code** (flags plumbing) | Wave G code — enablement separate |
| Public enroll in Customer Portal | Explicitly out of scope |

---

## 8. Open questions for operator

1. **Parish settings scope for Wave C close-out:** Should Portal2 match legacy `/account/church-details` exactly, or also absorb `/account/parish` read-only hub (CRM, role chips, record-type badges)?
2. **OCR Settings strategy:** Full port of `/portal/ocr/settings` into Portal2 under `/ocr/settings`, vs deep-link to legacy studio/settings during dual-run?
3. **OCR review:** Is legacy `/portal/ocr/review/*` acceptable for pilot until Portal2 review ships, or is in-portal review a P0 for church 46?
4. **Parish Management Hub:** Which `/account/parish-management/*` pages are MVP for Wave K vs post-cutover (database mapping, theme studio, search config)?
5. **Branding page:** Required for pilot tenant branding parity, or defer with church-46 custom header exception?
6. **Chrismation:** Product priority for list API + editor, or remain baptism/marriage/funeral only for Wave K?
7. **Baptism UI smoke:** Can operator sign frjames UI pass now, or waive and proceed to marriage editor?
8. **Cemetery:** Approve `G-ENABLE` for church 46 after marriage/funeral path, or earlier/later?
9. **Second pilot tenant:** Which church slug/id is authorized next for Wave K evidence?
10. **Checklist sync:** Master checklist still shows some Wave H schema items open — confirm handoff as ground truth for baptism shipped?

---

## Appendix — route index

### Portal2 (`basename /portal2`)

| Path | Component |
|---|---|
| `/` | `HomePage` |
| `/records` | `RecordsPage` |
| `/records/baptism/new`, `/records/baptism/:recordId/edit` | `BaptismEditorPage` |
| `/ocr`, `/ocr/mobile`, `/ocr/settings` | `OcrDesktopPage`, `OcrMobilePage`, `OcrSettingsPage` |
| `/metrics` | `MetricsPage` |
| `/cemetery` | `CemeteryPage` |
| `/certificates` | `CertificatesPage` |
| `/onboarding` (+ sub-routes) | Onboard wizard pages |
| `/settings/parish`, `/settings/users`, `/settings/preferences`, `/settings/record-fields` | Settings pages |
| `/account` | `AccountPage` |
| `/help` | `HelpPage` |
| `/auth/*` | Auth pages |

### Legacy portal (selected)

| Path | Notes |
|---|---|
| `/portal` | Hub |
| `/portal/records?type=` | Unified records + AG Grid editors |
| `/portal/ocr`, `/portal/ocr/review/*`, `/portal/ocr/settings` | OCR wizard + studio |
| `/portal/certificates/*` | Certificate studio |
| `/portal/assets` | Assets library |
| `/portal/cemetery/*` | Full cemetery layout |
| `/portal/charts` | OM Charts |
| `/account/church-details` | Editable church details (parity reference) |
| `/account/parish-management/*` | Parish admin hub |

---

*Assessment generated 2026-07-19. Updated 2026-07-20 (OCR Settings clergy/location action parity — implemented / unverified).*
