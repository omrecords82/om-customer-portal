# OM End-User Experience → New Customer Portal Build Checklist

> **Classification:** INTERNAL  
> **Audience:** operators / agents executing the build  
> **Scope:** parish/church end users only (`church_admin`, `priest`, `deacon`, `editor`, authenticated parish portal)  
> **Created:** 2026-07-18  
> **Reframed:** 2026-07-19 — **greenfield Customer Portal**, not in-place refactor of legacy OM front-end  
> **Operator decisions recorded:** 2026-07-19  
> **OMBC receipt:** `OMBC-20260718-165445-BD189C` (PROCEED; OMD `PENDING_RECONCILIATION`)  
> **Primary product path:** `/var/www/workspaces/om-customer-portal` → static deploy `/var/www/orthodoxmetrics/portal` → URL `/portal2` (parallel to legacy `/portal`)  
> **Package baseline:** published `@omrecords82/{contracts,tokens,ui}@0.1.0` (Option B aliases as `@om/*`)  
> **Parity reference (read-only):** legacy OM `front-end` routes/features — use for inventory and acceptance criteria only. **Do not migrate by editing those files into shape.**  
> **Prior discovery (reuse for capability gaps / surface inventory):** `docs/internal/om-packages-discovery/`, `docs/internal/om-packages-adoption/` in prod-current; customer-portal notes in `docs/om-package-integration.md`

**How to use this document:** treat every `- [ ]` as an executable work unit in the **new** Customer Portal (or in `om-packages` when a package gap blocks a wave). Do not start a wave whose blockers are unchecked. Mark items `[x]` only with PR / deploy evidence.

**Program model (explicit):**

| Mode | Status |
|---|---|
| In-place MUI → `@om/ui` rewrite inside `prod/front-end` | **Out of model** for this checklist |
| Build new end-user UI in `om-customer-portal` on `@om/*` + Mantine shell | **Canonical** |
| Run new UI in parallel (`/portal2`) beside legacy SPA (`/portal`) | **Current** |
| Pilot live auth for internal users + allowlisted tenants | **Authorized** (see Wave B) |
| Global customer login / deep-link cutover | **Wave K only** |
| Retire or freeze legacy end-user portal routes | **Final cutover (Wave K)** |

**Scale honesty:** full parish end-user parity is a **multi-quarter program**. The new portal already has toolchain + shell + package integration; feature depth is still thin. Legacy auth/account pilots on MUI (PRs #1003/#1004) remain useful **reference implementations**, not the destination codebase.

---

## Operator decisions summary (2026-07-19)

| Topic | Decision |
|---|---|
| **OQ-2 / GAP-TOAST** | **DECIDED** — implement shared `@om/ui/toast` (Codex in `om-packages`). FieldError-only is **not** sufficient. |
| **Auth cutover** | **PILOT LIVE authorized**; **GLOBAL deferred to Wave K** |
| **GAP-LINK-ROUTER / GAP-LINK-NAV / GAP-MENU-RICH** | **TEMPORARY APP RAC ADAPTERS APPROVED** — not hard blockers; Codex follows up |
| **Records deep links** | **PRESERVE** legacy `/portal/records?type=` query contract (product resolved; implementation still open) |
| **Cemetery** | **READ-ORIENTED MVP**; geometry editing **excluded**; feature flags **default off** |
| **Liturgical calendar** | **IN PRODUCT / POST-MVP** — does not block initial cutover |
| **Public enroll** | **OUT OF CUSTOMER PORTAL SCOPE** — separate public product/route |
| **Wave H** | **BLOCKED** until all entry gates pass; then Baptism → Marriage → Funeral |
| **Wave K** | **GO/NO-GO CRITERIA DEFINED** — live operational parity required; mocks do not count |
| **OMD** | Keep **`PENDING_RECONCILIATION`**; do not invent OMD IDs; stable `PORTAL-WAVE-*` slugs OK |
| **Blueprint visual QA** | **APPROVED** 2026-07-19 (operator sign-off recorded; see §BP Visual QA) |
| **Assets library** | **DEFERRED PRIORITY** behind core live workflows |

**Current execution priority (operator):**

1. Live authentication pilot (allowlisted tenants)  
2. Live OCR API integration  
3. Records deep-link compatibility  
4. Canonical records schema and Wave H editors (after gates)  
5. Cemetery MVP for enabled churches  
6. Live certificate workflows  
7. Assets library (raise only if an active customer depends on it daily)  
8. Interactive reports  

---

## 0. Prerequisites / platform

### 0.1 Registry & versions

- [x] **Option B publish path** — source stays `@om/*`; GitHub Packages publishes `@omrecords82/{contracts,tokens,ui}`; consumers use npm aliases (`om-packages` docs: `docs/publishing-github-packages.md`).
- [x] **Customer Portal deps** — `om-customer-portal/package.json` pins:
  - `"@om/contracts": "npm:@omrecords82/contracts@0.1.0"`
  - `"@om/tokens": "npm:@omrecords82/tokens@0.1.0"`
  - `"@om/ui": "npm:@omrecords82/ui@0.1.0"`
- [x] **Customer Portal `.npmrc`** — `@omrecords82:registry=https://npm.pkg.github.com` (token via user/CI `~/.npmrc` / `NODE_AUTH_TOKEN`; never commit secrets).
- [x] **Legacy OM front-end also pinned** (reference / parallel consumers) — PR #1003. Not the build target of this checklist.
- [x] **CI for `om-customer-portal`** — install/lint/typecheck/test/build with Node 24.18 + pnpm 11.10 + `NODE_AUTH_TOKEN` (`read:packages`).
- [x] **Deploy pipeline** — reproducible `pnpm build` with `VITE_PORTAL_BASE_PATH=/portal2` + rsync to `/var/www/orthodoxmetrics/portal` (scripted; no source copy into deploy dir).
- [ ] **Version bump cadence** — when om-packages ships `0.1.x` / `0.2.0`, bump Customer Portal aliases in the same PR that consumes new APIs.

### 0.2 App shell & style ownership (Customer Portal)

Permanent ownership model:

| Concern | Owner |
|---|---|
| Shared visual tokens | `@om/tokens` |
| Shared interactive controls | `@om/ui` |
| Shared contracts | `@om/contracts` |
| Layout, surfaces, spacing, typography chrome, responsive shell | **Mantine** (app) |
| Direct `react-aria-components` | Only where `@om/ui` lacks capability (**allowlisted**, temporary waived gaps — see §2.2) |

- [x] **Global CSS order** — Mantine → `@om/tokens/css` → `@om/ui/css` → portal overrides (`src/app/App.tsx`).
- [x] **Theme sync** — `OmThemeSync` mirrors Mantine scheme onto `document.documentElement.dataset.omTheme`.
- [x] **ESLint prohibited stacks** — no MUI / Emotion / Radix / Tailwind / shadcn / Bootstrap / Chakra / Ant; RAC allowlisted only in documented shell files.
- [x] **Temporary shell RAC adapters approved (operator 2026-07-19)** — sidebar router Link, Aria `RouterProvider`, account Menu may remain **application-owned**, narrowly scoped, documented, ESLint-allowlisted; **not** exported as Portal primitive APIs; **no** RAC types in public interfaces. Do **not** invent fake `@om/ui` wrappers solely to remove imports.
- [ ] **Theme bridge completeness** — map remaining portal-local navy/gold/sidebar vars onto published tokens when packages gain brand/sidebar semantics (do not invent tokens in the app). Post-MVP brand cleanup is explicitly allowed after cutover (see Wave J / Wave K).
- [ ] **Liturgical / accessibility token layers** — adopt `@om/tokens/css/liturgical` and `css/accessibility` when post-MVP calendar / a11y finish needs them (Wave J). **Does not block MVP cutover.**

### 0.3 Governance

- [ ] **No parallel primitive kits** — do not create `components/portal/ui/*` shadcn twins or local wrappers that re-expose React Aria types as public Portal APIs. Temporary allowlisted shell adapters (§2.2 waivers) are the **only** exception until Codex closes those gaps.
- [ ] **Codex vs Cursor** — Codex grows `@om/*` APIs in `om-packages`; Cursor builds Customer Portal features against published packages. Gaps with **approved temporary waivers** do not block portal waves; still open Codex follow-ups. Gaps without waivers (e.g. GAP-TOAST implementation) remain Codex deliverables before dependents ship.
- [ ] **Promotion criteria before new package/component consumption as “stable”**
  1. `verify:public-api` + Storybook/keyboard coverage in om-packages
  2. Changeset + published `@omrecords82/*` version
  3. Pilot on a low-risk Customer Portal surface
  4. No RAC leakage in public declarations
  5. Tokens via `@om/tokens` CSS variables only

### 0.4 Tracking

- [ ] **Create / reconcile OMD work items per wave** — **keep `PENDING_RECONCILIATION`**. **Do not invent OMD identifiers.** Until authoritative OMD IDs exist, use stable internal work references such as `PORTAL-WAVE-B-AUTH`, `PORTAL-WAVE-BP-OCR-MOBILE`, `PORTAL-WAVE-E-RECORDS-DEEPLINKS`, `PORTAL-WAVE-G-CEMETERY-MAP`. PRs/commits should cite: the wave slug, OMBC receipt `OMBC-20260718-165445-BD189C`, and legacy MIG ids only as **parity evidence**. Reconcile temporary slugs to OMD when available. **Do not mark this item complete** until reconciliation exists.
- [ ] **Link each wave PR** to legacy discovery MIG ids only as **parity references**, not as file-migration tickets.

---

## 1. Already completed (Customer Portal foundation)

| Item | Evidence | Status |
|---|---|---|
| Separate app repo + Vite/React 19/TS/pnpm toolchain aligned to om-packages | `om-customer-portal` commit `e9909ec` | Done |
| `/portal2` nginx → `/var/www/orthodoxmetrics/portal` static deploy; `/portal` remains legacy SPA | nginx snippet `orthodoxmetrics-customer-portal.conf` | Done |
| Published `@om/*` aliases installed; CSS order; token mapping start; Button/IconButton migration | commit `a887c35`; `docs/om-package-integration.md` | Done |
| Shell IA: home + feature chrome (records, OCR, metrics, cemetery, certificates, help, account, settings) | `src/app/App.tsx` | Done (many surfaces still mock-backed) |
| Parallel run with legacy portal | Product decision 2026-07-19 | Done |
| Operator decisions recorded (auth pilot, toast, adapters, MVP scope, Wave H/K gates) | This document 2026-07-19 | Done |

Legacy OM `front-end` Wave 1 auth/account `@om/ui` pilots (PR #1003/#1004) are **reference patterns** for forms/dialogs — port ideas into the new app; do not treat those files as the destination.

---

## 2. Package capability gaps

### 2.1 Current `@om/ui` public surface (`@omrecords82/ui@0.1.0`)

Use existing exports for new portal screens. Do not rebuild these in-app.

| Subpath | Component | Customer Portal notes |
|---|---|---|
| `button` / `icon-button` | Button, IconButton | In use (home + header) |
| `link` | Link | No router/basename adapter / nav semantics yet — **temporary RAC shell adapter approved** (§2.2) |
| `menu` | Menu | No item icons / rich composite triggers yet — **temporary RAC account-menu adapter approved** (§2.2) |
| `text-field` / `text-area` / `label` / `field-error` | Forms | Field-level validation only |
| `checkbox` / `radio` / `radio-group` / `switch` | Selection | Ready |
| `select` / `combo-box` | Lists | ComboBox local-filter only |
| `dialog` / `alert-dialog` / `drawer` | Overlays | Ready |
| `tabs` / `tooltip` / `table` | Structure | Tabs no router sync; Table semantic only |
| `toast` | Toast | **DECIDED required** — not shipped yet (Codex) |
| `css` | styles | Load after tokens |

### 2.2 Gaps to close in `om-packages` (Codex)

| Gap ID | Capability | Portal impact | Status |
|---|---|---|---|
| GAP-LINK-ROUTER | Router/basename-aware Link (or documented app adapter without RAC leakage) | Nav, auth links, hub | **Temporary waiver** — app RAC adapters approved; Codex follow-up |
| GAP-LINK-NAV | Nav semantics (`aria-current`, optional press/close hooks) | Sidebar/chrome | **Temporary waiver** — same as above |
| GAP-MENU-RICH | Menu item leading icons + composite trigger patterns | Account/header menus | **Temporary waiver** — same as above |
| GAP-FORM-ALERT | Form-level announced error/success | Auth/register/account | **Open** — Codex; FormAlert ≠ FieldError ≠ Toast (§2.2.1) |
| GAP-TOAST | Shared `@om/ui/toast` (OQ-2 **DECIDED**) | Cross-cutting transient events | **Open — Codex implement** (no longer awaiting human decision) |
| GAP-CHECKBOX-GROUP | CheckboxGroup | Settings/forms | Medium |
| GAP-TABLE-BASIC-UX | Sort/filter/pagination **or** `@om/tables` split | Lists | Medium |
| GAP-SELECT-ASYNC | Async ComboBox pattern | Records/certificates filters | Medium |
| GAP-BRAND-TOKENS | Navy/gold/sidebar/semantic brand packs | Token cutover from portal-local CSS | Medium; complete cleanup **post-MVP allowed** |
| GAP-BUTTON-ICON-SLOT | Leading/trailing icon slot | Hub tiles/CTAs | Low |

#### 2.2.1 Notification responsibility split (OQ-2 **DECIDED**)

| Mechanism | Owns | Does not own |
|---|---|---|
| **FieldError** | Validation tied to a **specific form field** | Global / transient app events |
| **FormAlert** | Form-level submission errors/success that require attention on the form | Toasts / per-field messages |
| **`@om/ui/toast`** | Transient application events: save success, upload started/completed, deletion completed, background processing failed, connection restored | Field validation; form submission outcome that belongs in FormAlert |

**Required `@om/ui/toast` behavior (Codex):** success, information, warning, and error variants; accessible announcement; dismissible mode; persistent mode for serious failures; optional action; reasonable duplicate suppression.

**Forbidden:** Sonner; Mantine Notifications; a Customer Portal-local toast system; FieldError as a global notification mechanism.

### 2.3 Future packages (create only when promotion criteria met)

| Package | Needed for | Do not start until |
|---|---|---|
| `@om/icons` | Unified icon story | Brand/token stability + hub/nav patterns — **post-MVP allowed** |
| `@om/forms` | Shared form layout / FormAlert / field stacks | GAP-FORM-ALERT + 2–3 portal pilots |
| `@om/tables` | Beyond semantic Table | After list pilots prove need |
| `@om/records` | Sacramental editors / list chrome | Schema contract + Wave E chrome + Wave H gates |
| `@om/cemetery` | Cemetery domain chrome | Map engine stays app-owned; read-oriented MVP first |
| `@om/vault` | Only if parish-facing vault is productized | Today devel/superadmin — likely out |
| `@om/onboarding` | Authenticated first-login wizards | Forms + app stepper OK; **not** public enroll |
| `@om/certificates` | Only if studio chrome reuse proven | Canvas stays app-owned |

---

## 3. Wave-by-wave build checklist (new Customer Portal)

> Each wave **implements screens/services in `om-customer-portal`**. Legacy paths are listed only as **parity targets**. Copying MUI trees from `front-end` is forbidden; reimplement against Mantine + `@om/ui`.

### Wave A — Platform harden (Customer Portal)

**Goal:** Make the new app production-operable while still preview-only at `/portal2`.

**Work ref:** `PORTAL-WAVE-A-PLATFORM`

- [x] GitHub Actions CI (Node 24.18, pnpm 11.10, Packages auth)
- [x] `scripts/deploy-static.sh` (build `/portal2` + rsync deploy dir)
- [x] Prohibited-deps / import CI check
- [x] README: local, Packages auth, parallel URL model
- [x] Expand unit/component tests for shell, theme sync, basePath, blueprint pages
- [x] a11y baseline: skip link, focus main on navigate, drawer escape, burger `aria-controls`

**Dependencies:** foundation done.  
**Blockers:** none.

---

### Wave B — Auth & session (new app)

**Goal:** Real sign-in / session for Customer Portal — **new screens**, not edits to legacy `AuthLogin.tsx`.

**Parity reference:** legacy `/auth/*`, Wave 1 files in `features/auth/**` (patterns only).  
**Work ref:** `PORTAL-WAVE-B-AUTH`

**Operator cutover policy (2026-07-19):**

| Scope | Status |
|---|---|
| Live authentication **capability** (screens + session client; `AUTH_MODE=live`) | **Pilot-ready / authorized for pilot** |
| Pilot tenant **enablement** (`VITE_PORTAL_REQUIRE_AUTH=true`, `VITE_PORTAL_AUTH_MODE=live` for internal users + **explicitly allowlisted** pilot tenants) | **Authorized** |
| Global customer post-login routing / `/portal` retirement | **Deferred to Wave K only** — do **not** authorize yet |

**Before enabling a pilot tenant, verify:** login; logout; expired-session handling; unauthorized handling; user context; church context; role enforcement; CSRF behavior; direct nested-route access (path+query via `next=`); production error logging; rollback behavior. See `docs/AUTH-PILOT-CHECKLIST.md`.

- [x] Session client aligned with OM auth APIs (cookies/CSRF as required) — app data layer (`mock` default / `live` mode)
- [x] Login, forgot password, unauthorized, verify-email, accept-invite pages in Customer Portal
- [x] Post-login routing policy recorded: pilots stay on `/portal2`; **do not** globally flip legacy `/portal` (Wave K)
- [x] Live authentication **pilot authorization** recorded (operator 2026-07-19)
- [x] Nested-route / gate automated tests — evidence: `safeNext.test.ts`, `RequireAuth.test.tsx`, `apiFetch.test.ts`, `recordsDeepLink.test.ts` (nested `/records?type=baptism` `next=` round-trip; `requireAuth` on/off; 401 redirect). **Does not** close per-tenant enablement.
- [ ] Pilot tenant enablement evidence (allowlist + verification checklist above) per tenant
- [x] Account password change dialog + profile surface exist; **sessions list + revoke** wired on `AccountPage` — evidence: GET/DELETE `/api/user/sessions`, POST `/api/user/sessions/revoke-others` via `settingsApi.ts` when `AUTH_MODE=live`; preview keeps honest mock sessions
- [x] GAP-FORM-ALERT interim: FieldError for fields; FormAlert/`@om/ui/toast` still Codex-owned for form-level / transient events
- [x] SPA shell links via **approved temporary** basename-aware RAC adapters (see §2.2 waivers) until GAP-LINK-* closes — document in `docs/om-package-integration.md`; do not invent fake `@om/ui` wrappers

**Do not:** mutate legacy auth forms as the destination; do not put Keycloak/OIDC logic into `@om/ui`; do not enable global cutover here.

**Dependencies:** Wave A preferred; GAP-TOAST Codex for cross-cutting toasts (decision settled; implementation pending).  
**Blockers:** none blocking continued portal work — toast/FormAlert package delivery needed before replacing interim patterns.

---

### Wave C — Account & parish settings

**Goal:** Parish self-service settings in the new UI.

**Parity reference:** `/account/*`, `parish-management/*` (legacy).  
**Work ref:** `PORTAL-WAVE-C-SETTINGS`

- [x] Profile / personal info / notifications — evidence: `settingsApi.ts` + `AccountPage` wire GET/PUT `/api/user/profile`, PUT `/api/user/profile/password`, GET/PUT `/api/notifications/preferences` (`weekly_digest`, `certificate_ready`) when `AUTH_MODE=live`; preview keeps honest local messaging
- [x] Parish info / church details — evidence: `ParishSettingsPage` + `settingsApi.ts` wire GET/PUT `/api/my/church-settings` when live + church context; role-gated edit (`church_admin`, `priest`, etc.)
- [x] Branding / OCR prefs (controls only; heavy editors later) — evidence: `PreferencesPage` + `settingsApi.ts` wire GET/PUT `/api/my/ocr-preferences` when `AUTH_MODE=live` + OCR admin role (`super_admin`, `admin`, `church_admin`); autoseed toggle maps to `useRecordSnippets`; review auto-open stays disabled (no API field); preview keeps honest local messaging
- [x] Parish users list (semantic `@om/ui/table` + mock rows) — evidence: `ParishUsersPage` + `settingsApi.ts` wire GET `/api/admin/church-users/:churchId` + POST unlock when `AUTH_MODE=live` + parish staff role; preview keeps mock rows; invite + revoke CTAs gated (platform-admin APIs only)
- [x] Shell parish chrome (Sidebar, PortalFooter, AuthLayout) — evidence: `ParishProfileProvider` + `fetchParishProfile` / GET `/api/my/church-settings` when `AUTH_MODE=live` + auth; preview/fetch-failure keep honest defaults + notes
- [x] Onboarding steps that church admins still need on first login — link to Wave BP onboard / Wave I

**Dependencies:** Wave B.  
**Blockers:** none hard for chrome; live APIs required for cutover DoD — profile, parish details, core notification toggles, parish user directory, account sessions, and OCR autoseed default wired; full OCR settings editor (language, preprocessing, retention) remains deferred.

---

### Wave D — Portal hub depth

**Goal:** Replace placeholder home/tiles with real hub behavior while keeping Mantine shell.

**Parity reference:** `/portal` hub, ChurchPortalHub, theme hubs (legacy).  
**Work ref:** `PORTAL-WAVE-D-HUB`

- [x] Dashboard widgets backed by real APIs **or honest empty states** (memberships, recent activity, certificates counts) — **required before Wave K** — evidence: `src/features/hub/hubApi.ts` + `useHubDashboard` wire `HomePage` to `GET /api/churches/:churchId/dashboard` + `GET /api/certificates/history` when `AUTH_MODE=live` + churchId; preview/error keep honest empties (no fake KPI/activity as-if-live)
- [x] Hub actions/menus via `@om/ui` (quick actions on home; rich menus may use temporary RAC adapters per §2.2)
- [x] Empty/onboarding hub states — evidence: `HomePage.tsx` empty activity + calendar panels with explicit preview/live notes
- [x] Help / guide / site-map pages in new app
- [x] Nav config single-sourced (routes, titles, icons, permissions) — permissions TBD with live roles

**Dependencies:** Waves B–C for session/permissions.  
**Blockers:** OQ-3 template debates apply to **legacy** only; new app already chose Mantine shell — do not reopen unless product asks. GAP-MENU-RICH is **waived** for temporary adapters.

---

### Wave BP — Blueprint productization (required UX sources)

**Goal:** Fully implement the three **Blueprints** UX systems inside Customer Portal as first-class product surfaces — **not** iframe/embed of legacy blueprint routes, and **not** copy-paste of scoped Tailwind.

**Work refs:** `PORTAL-WAVE-BP-OCR-MOBILE`, `PORTAL-WAVE-BP-OCR-DESKTOP`, `PORTAL-WAVE-BP-ONBOARD`

**Blueprint URLs (legacy preview — super_admin only today):**

| Blueprint | Legacy URL | Legacy source (reference only) |
|---|---|---|
| OM OCR Mobile | https://orthodoxmetrics.com/blueprints/om-ocr-mobile | `front-end/src/features/blueprints/om-ocr-mobile/` (~1.3k LOC + Tailwind) |
| OM OCR Desktop | https://orthodoxmetrics.com/blueprints/om-ocr-desktop | `front-end/src/features/blueprints/om-ocr-desktop/` (~1.9k LOC + Tailwind) |
| OM Onboard | https://orthodoxmetrics.com/blueprints/om-onboard | `front-end/src/features/blueprints/om-onboard/` (~0.2k LOC + Tailwind) |

**Stack rewrite (mandatory for Customer Portal ports):**

| Concern | Use | Do not use |
|---|---|---|
| Layout / surfaces / spacing / responsive structure | **Mantine** | Blueprint scoped Tailwind, MUI, cards-as-layout kits |
| Interactive controls | **`@om/ui`** first; **React Aria Components** only where `@om/ui` lacks parity (allowlisted + documented) | Raw HTML controls without a11y; Radix/shadcn twins from old kit |
| Visual tokens | `@om/tokens` + existing portal theme bridge | Hex/Tailwind utility sprawl from blueprint CSS |
| Data / OCR engines / camera pipelines | App-owned modules in Customer Portal | Forking engines into `@om/ui` |

**Shared blueprint DoD (all three):**

- [x] Behavior and information architecture match the blueprint preview (phases/steps, primary actions, empty/error/success states) — **implementation productized**; visual QA **APPROVED** 2026-07-19
- [x] Routed under Customer Portal (`/ocr/mobile`, `/ocr`, `/onboarding` under `/portal2` basename)
- [x] Zero Tailwind / zero blueprint `styles/tailwind.css` imports in Customer Portal
- [x] Mantine owns layout; `@om/ui` (or allowlisted RAC) owns buttons, fields, menus, dialogs, tabs, etc.
- [x] Light + dark schemes work via existing `OmThemeSync`
- [x] Keyboard / screen-reader basics (named icon buttons, dialog titles, focus order through wizard steps) — baseline; continue hardening
- [x] Vitest coverage for step-state machines / critical transitions (onboard + OCR mobile)
- [x] **Operator visual QA sign-off** — **APPROVED** 2026-07-19 (see §BP Visual QA and `docs/BLUEPRINT-VISUAL-QA.md`). Wave BP UX productization **accepted**; live OCR APIs remain open for cutover DoD.
- [ ] Legacy `/blueprints/*` routes remain reference-only until Wave K (optional redirect later)

#### BP Visual QA — operator sign-off (required)

**Decision:** Blueprint visual QA requires **operator sign-off**. Not strict pixel matching.

**Status:** **APPROVED** 2026-07-19 — operator compared OCR Mobile, OCR Desktop, and OM Onboard under `/portal2` vs blueprint previews. Evidence: `docs/BLUEPRINT-VISUAL-QA.md`. Work refs: `PORTAL-WAVE-BP-OCR-MOBILE`, `PORTAL-WAVE-BP-OCR-DESKTOP`, `PORTAL-WAVE-BP-ONBOARD`. OMBC: `OMBC-20260718-165445-BD189C`.

**Required screenshot coverage:**

- OCR Mobile — mobile viewport  
- OCR Desktop — desktop viewport  
- OM Onboard — desktop viewport  
- OM Onboard — mobile viewport  
- Light mode + dark mode  
- Loading, empty, error, and success states  

**Must validate:** step order; information hierarchy; primary/secondary actions; responsive behavior; visual density; state coverage; **no lost functionality**. Intentional deviations must be documented.

#### BP-1 — OM OCR Mobile (full implementation)

- [x] Reimplement 4-phase mobile upload flow from blueprint (capture → review/crop → process → results) in `om-customer-portal`
- [x] Camera / file picker / permission-denied / offline-ish empty states — connect Request camera probes `getUserMedia` (permission-denied copy); capture phase uses `capture="environment"` + multi file input
- [x] Mobile-first Mantine layout (AppShell-compatible; usable inside portal navbar)
- [x] Wire **live** OCR job history + upload + **retry/seed** when `AUTH_MODE=live` + church context (`ocrApi.ts`: `fetchChurchOcrJobs`, `uploadOcrJobPages`, `retryChurchOcrJob`, `seedChurchOcrJob`); desktop history + mobile OCR-phase Retry/Seed wired (shared client helpers)
- [x] **Mobile capture-phase live upload** — when `AUTH_MODE=live` + churchId, Capture / Choose files call `uploadOcrJobPages` (record-type select; empty start grid; failed retry re-POSTs retained files); mock mode keeps demo thumbs + local-only ingest with honest preview copy. Evidence: `ocrMobileCapture.ts` + `OcrMobilePage.tsx` + tests
- [x] Nav entry under OCR / Uploads for church roles (not super_admin-only blueprint gate)

#### BP-2 — OM OCR Desktop (full implementation)

- [x] Reimplement desktop/batch OCR portal from blueprint (history, configure, upload, processing, results)
- [x] Replace Tailwind chrome with Mantine + `@om/ui` tables/menus/dialogs
- [x] Job history list + filters; batch actions with AlertDialog confirms
- [x] Integrate with existing OM OCR job APIs for **retry/seed** (history + upload live when auth live) — evidence: `ocrApi.ts` + `OcrDesktopPage` Retry/Seed; routes `POST /api/church/:id/ocr/jobs/:jobId/{retry,seed}`
- [x] This becomes the primary `/ocr` experience in Customer Portal (Wave F consumes it; do not build a second competing OCR UI)

#### BP-3 — OM Onboard (full implementation)

- [x] Reimplement church portal preparation / onboarding screen from blueprint
- [x] Multi-step readiness checklist using Mantine structure + `@om/ui` controls (app stepper OK)
- [x] Persist progress locally (device) until parish onboarding APIs; live API persistence still open
- [x] Becomes the primary **authenticated** in-portal onboarding surface (Wave I; **not** public enroll)
- [x] Live GET `/api/onboarding/provisioning-checklist` + `/api/onboarding/me` when `AUTH_MODE=live`; preview keeps local device progress — evidence: `onboardApi.ts` + `OnboardPage.tsx` + tests

**Dependencies:** Wave A (harden); Wave B for live APIs; GAP-FORM-ALERT / temporary menu adapters as needed.  
**Blockers:** operator visual QA **recorded APPROVED 2026-07-19**; live OCR APIs remain open for cutover DoD (do not treat live OCR as complete).  
**Priority:** Wave BP UX accepted; live OCR history/upload/retry/seed + **mobile capture-phase upload** wired when auth live; remaining live OCR polish + Cutover DoD still open.

---

### Wave E — Records chrome (lists / search / filters)

**Goal:** Records **list and navigation chrome** in the new portal — not AG Grid editors yet.

**Parity reference:** `/portal/records`, records-management toolbars.  
**Work ref:** `PORTAL-WAVE-E-RECORDS-DEEPLINKS`

**Deep-link product decision (2026-07-19) — RESOLVED:** preserve the existing records query-string contract.

Must support (under Customer Portal basename at cutover equivalent paths):

- `/portal/records?type=baptism`
- `/portal/records?type=marriage`
- `/portal/records?type=funeral`

**Requirements:**

- Parse `type` query parameter and initialize the corresponding filter/section  
- Support known historical aliases; normalize to canonical internal record-type identifiers  
- Unknown values → fall back to **all-records** view (**not** 404)  
- Preserve compatible additional query parameters where practical  
- Automated tests for bookmarked and externally linked URLs  

**This implementation must complete before Wave H editors begin and before Wave K cutover.**

- [x] Records landing + type filters/search (Mantine TextInput/Select + `@om/ui` actions)
- [x] Add / more actions via Button/Menu/AlertDialog (Add button + destructive delete confirm) — **list-only gate prep (2026-07-19): create/edit/delete UI removed from RecordsPage until Wave H; live list/search wired instead**
- [x] Mobile-friendly list/card chrome
- [x] Deep-link **product decision** recorded (preserve legacy `?type=` contract)
- [x] Deep-link **implementation + tests** (parse/normalize/fallback; evidence: `recordsDeepLink.ts` + tests)

**Do not start:** sacramental field editors / AG Grid cell editing (Wave H) until Wave H entry gates pass.

**Dependencies:** Waves B, D; GAP-SELECT-ASYNC optional.  
**Blockers:** none for chrome; deep-link implementation blocks Wave H start and Wave K.

---

### Wave F — Assets, certificates chrome (+ OCR adoption)

**Goal:** Remaining staff workflow chrome. **OCR UI comes from Wave BP** — do not invent a third OCR shell.

**Parity reference:** `/portal/assets`, `/portal/certificates/*`; OCR via blueprints (Wave BP).  
**Work ref:** `PORTAL-WAVE-F-CERTS-ASSETS`

- [x] Adopt BP-1 + BP-2 as the OCR routes (mobile + desktop); remove placeholder OCR page
- [ ] **Assets library** browse/collections + AlertDialog confirms — **DEFERRED PRIORITY** (behind live auth, OCR APIs, records deep links, Wave H path, cemetery MVP, live certificates). Raise only if an active customer depends on it for routine operations. **Not a current program blocker.**
- [x] Certificates: list, generate form chrome, history table; designer canvas app-owned
- [x] Live certificate **history** where currently customer-used — evidence: `certificatesApi.ts` + `CertificatesPage` wire `GET /api/certificates/history` (+ authenticated `GET …/history/:id/download`) when `AUTH_MODE=live` + churchId; honest empty/error otherwise; pure helpers covered in `certificatesApi.test.ts`
- [x] Live certificate **generation/render** — evidence: `CertificatesPage` picks certificate type + `template_id` + `record_id` (selects from `GET /api/certificates/templates` + `GET /api/certificates/records/:type`, or manual id fields); live + churchId calls `POST /api/certificates/render`; surfaces success/error honestly (incl. `missing_fields`); download/history link when `history_id` returned; mock mode refuses with clear messaging (no fake live success). Pure builders/parsers in `certificatesApi.test.ts`. Canvas/designer remains app-owned / deferred.
- [ ] Interactive reports recipient flows if parish-facing — **lower than assets**; deferred behind core live workflows

**Dependencies:** Wave BP (OCR); Waves B, D, E.  
**Blockers:** Live OCR APIs for OCR cutover DoD (BP visual QA **APPROVED** 2026-07-19); assets do **not** block other waves. Certificate generate/render chrome is live-ready; assets + interactive reports remain deferred.

---

### Wave G — Cemetery + metrics

**Goal:** Cemetery and church metrics experiences in the new UI.

**Parity reference:** `/portal/cemetery/*`, `/portal/charts` / om-charts.  
**Work ref:** `PORTAL-WAVE-G-CEMETERY-MAP`

**Cemetery MVP decision (2026-07-19):** **read-oriented**. Geometry editing is **excluded**. Enablement is **per church**, defaults **off**. Church-specific behavior must not be hard-coded into the shared portal. Map only after geometry + record mappings are validated for that church.

**Feature flags (all default `false`):**

| Flag | Purpose |
|---|---|
| `cemetery.enabled` | Master enablement for cemetery module |
| `cemetery.mapEnabled` | Map rendering (requires validated geometry) |
| `cemetery.maintenanceEnabled` | Maintenance surfaces |
| `cemetery.reportsEnabled` | Reports surfaces |

**MVP includes:** render existing validated cemetery geometry; search deceased persons; locate/select a plot; plot status; associated records; basic filters; map tooltips; plot detail panel; mobile-compatible plot details; navigation for records / plots / maintenance / reports (as flags allow).

**MVP excludes:** drawing cemetery geometry; editing plot boundaries; row/section remapping; bulk geometry changes; cemetery digitizer; advanced GIS editing; automatic geometry inference. (Advanced geometry editing remains **post-MVP / post-cutover allowed**.)

**Liturgical calendar:** **IN PRODUCT / POST-MVP**. Remains on the parish Customer Portal roadmap. **Does not block** initial portal cutover. Schedule after live auth, records, OCR, parish settings, required certificates, and cemetery for enabled churches.

- [x] Cemetery map page (read-only MVP) — evidence: `CemeteryReadOnlyMap` + `fetchCemeteryRenderGeometry` (`GET …/cemetery/render-geometry`) + plot map coords from `/plots` when `cemetery.enabled` && `cemetery.mapEnabled`; SVG plot markers + road/circle polylines + geometry summary; plot select → detail (`GET …/plots/:plotId` occupants); mobile-stacked detail; disabled messaging when `mapEnabled` false. **Deferred:** full legacy CemeteryMap engine (pan/zoom, trees, landmarks, cameras, directions routing). No drawing/editing tools. No hard-coded church IDs.
- [x] Cemetery records/plots lists + deceased search (read MVP) — evidence: `cemeteryApi.ts` + `CemeteryPage` wire `GET /api/churches/:churchId/cemetery/plots` + `GET …/people/search` when `cemetery.enabled` and `AUTH_MODE=live` + churchId; preview stub otherwise; plot detail panel select; no geometry editing; no hard-coded church IDs
- [x] Maintenance / reports navigation gated by flags — surfaces render only when `maintenanceEnabled` / `reportsEnabled` (default off)
- [x] Feature-flag wiring: `cemetery.enabled` / `mapEnabled` / `maintenanceEnabled` / `reportsEnabled` (default off) — `cemeteryFlags.ts` + env overlays
- [x] Church metrics / charts chrome + live KPIs — evidence: `metricsApi.ts` + `MetricsPage` wire `GET /api/churches/:churchId/dashboard` (KPIs/labels) + optional `GET …/charts/summary` label notes when OM Charts enabled; chart libs deferred; honest empty/error when not live or missing churchId
- [ ] Liturgical calendar chrome — **POST-MVP** (in product; not a cutover blocker)

**Dependencies:** Waves B, D, table patterns from C/E.  
**Blockers for map:** validated per-church geometry + mappings; flags off until then. Geometry editing product freeze = MVP exclude.

**DoD (cemetery MVP):** flags default off; enabled churches get read-only map + search/select/detail; no editing tools shipped as MVP.

---

### Wave H — Records editors (highest risk)

**Goal:** Sacramental create/edit in the new portal with validation parity.

**Work ref:** `PORTAL-WAVE-H-EDITORS`

**Operator authorization (2026-07-19): Wave H is NOT authorized to start yet.**

#### Wave H entry gates (all must pass before any editor work)

- [ ] Live authentication and church context work for pilot users
- [x] Real records-list APIs work in the Customer Portal — evidence: `recordsApi.ts` + `RecordsPage` wire `GET /api/baptism-records`, `GET /api/marriage-records`, `GET /api/funeral-records` (church_id, page, limit, search) when `AUTH_MODE=live` + churchId; honest mock/empty when preview or API fails; `?type=` deep-link contract preserved; chrismation list API not yet available (honest empty); combined all-types view merges three endpoints (per-type filter for full pagination); pure helpers in `recordsApi.test.ts`. **Editors still blocked.**
- [x] Wave E records deep-link compatibility is implemented and tested
- [ ] Canonical baptism, marriage, and funeral schemas exist in `@om/contracts`
- [ ] Read / create / update / delete permission rules are documented
- [ ] Tenant-isolation tests exist
- [ ] Clergy, location, and related-record selection behavior is defined
- [ ] Dual-run or rollback behavior against legacy editors is defined
- [ ] Audit-logging requirements are defined

**When authorized, implement in order — do not build all three simultaneously:**

1. **Baptism** (establishes shared form, validation, persistence, error-handling, a11y, and testing pattern)  
2. **Marriage**  
3. **Funeral**

#### Implementation checklist (only after gates)

- [ ] Canonical record schema via `@om/contracts` / future `@om/records`
- [ ] Baptism entry & edit flow on `@om/ui` + forms patterns
- [ ] Marriage entry & edit flow (reuse baptism pattern)
- [ ] Funeral entry & edit flow (reuse baptism pattern)
- [ ] Drawer/Dialog edit hosts; dual-run feature flag vs legacy editors
- [ ] Tenant isolation tests mandatory

**Dependencies:** Wave E deep links done; schema contract; live auth/church context; docs for permissions/audit/dual-run.  
**Do not start early.** Highest regression risk in the program.

---

### Wave I — Authenticated onboarding wizards

**Goal:** First-run **authenticated** parish onboarding in the new app. **In-portal preparation UI comes from Wave BP-3 (OM Onboard).**

**Work ref:** `PORTAL-WAVE-I-ONBOARD`

**Public enrollment decision (2026-07-19):** Public enroll is **OUT OF CUSTOMER PORTAL SCOPE**. It is an acquisition / tenant-provisioning workflow for a **separate** public product/route (possible locations include `/enroll`, `/get-started`, `/onboarding/enroll` — **final public route not decided here**). Do **not** treat public enroll as Customer Portal required scope or Wave K DoD.

**Wave I retains only authenticated parish onboarding:**

- Parish preparation  
- First-login onboarding  
- Readiness tracking  
- Record-table setup  
- Record-layout setup  
- Persisted onboarding progress  

- [x] Adopt BP-3 (`om-onboard`) as the primary parish preparation / onboarding surface
- [x] Record-tables / record-layouts onboarding steps (beyond blueprint if still required) — evidence: `/onboarding/change-password`, `/onboarding/record-tables`, `/onboarding/record-layouts` + `onboardWizardApi.ts` (live OM APIs; preview local persistence)
- [x] Persist onboarding progress (live APIs) — **required before Wave K** — evidence: `onboardApi.ts` reads live checklist + `/me`; OM backend `GET /api/onboarding/provisioning-checklist` (read-only parish user)
- [x] Public `/enroll` **explicitly excluded** from Customer Portal scope (handled outside this app)

**Dependencies:** Wave BP-3; Waves B, C, forms patterns.  
**Blockers:** stepper/wizard — package Tabs defer steppers; app-owned stepper OK.

---

### Wave J — Brand tokens, icons, a11y finish

**Goal:** End-user theming without portal-local hex sprawl.

**Work ref:** `PORTAL-WAVE-J-TOKENS`

**Post-MVP note:** Complete brand-token cleanup, `@om/icons` unification, and liturgical token/calendar surfaces are **explicitly allowed post-MVP** and must not block Wave K if MVP pathways otherwise pass. Liturgical calendar work here aligns with Wave G **POST-MVP** scheduling.

- [ ] Consume brand/sidebar tokens once published (GAP-BRAND-TOKENS) — cleanup may complete post-MVP
- [ ] Liturgical token layer for calendar surfaces — **POST-MVP** with liturgical calendar
- [ ] `@om/icons` adoption after audit (do not mix Tabler/MUI/lucide casually) — **post-MVP allowed**
- [ ] forced-colors / accessibility CSS wired
- [ ] Church 46: **tenant exception remains app-owned** if/when that shell is ported — document forever-app-owned assets

**Dependencies:** hub/chrome waves stable.  
**Do not start early for brand churn** before hub/chrome stable — but do not treat unfinished brand cleanup as a Wave K blocker when MVP Go/No-Go is otherwise met.

---

### Wave K — Cutover & legacy retirement

**Goal:** Make the new portal the real end-user destination; freeze legacy end-user portal.

**Work ref:** `PORTAL-WAVE-K-CUTOVER`

**Go/No-Go decision (2026-07-19):** Legacy portal retirement requires **live operational parity** for the agreed MVP. **Visual placeholders and mock-only workflows do not count.**

#### Required MVP capabilities before cutover

- Live login, logout, session renewal, authorization  
- Real user context and real church context  
- Hub with live data **or honest empty states**  
- Profile with live persistence  
- Core parish settings with live persistence  
- Records search and lists  
- Baptism create/edit; marriage create/edit; funeral create/edit  
- Live OCR mobile workflow; live OCR desktop workflow  
- Persisted onboarding  
- Certificate generation and history **where currently customer-used**  
- Compatible records deep links  
- Help and support routes  
- Cemetery functionality for **currently enabled** cemetery customers  

#### Explicitly allowed post-MVP (not cutover blockers)

- Liturgical calendar  
- Assets library, unless an active customer requires it for daily work  
- Advanced reports  
- Advanced cemetery geometry editing  
- Complete brand-token cleanup  
- Unified `@om/icons`  

#### Required go/no-go evidence

- Operator acceptance  
- At least **two** pilot churches  
- At least **one** non–Church-46 tenant  
- Desktop validation + mobile validation  
- No critical open defects; no high-severity open defects  
- Successful rollback test; defined soak period  
- Monitoring: no material authentication failures; no material API failures; no tenant-isolation failures  
- Every legacy customer route has one disposition: **migrated** | **redirected** | **deliberately retired** | **explicitly deferred**  

#### Cutover execution checklist

- [ ] Pilot tenants: post-login → `/portal2` (or `/portal` after base-path cutover) — **only after MVP Go/No-Go**
- [ ] Rebuild Customer Portal with `VITE_PORTAL_BASE_PATH=/portal` when ready; nginx `/portal` serves new `dist`
- [ ] Redirect/retire `/portal2` after soak
- [ ] Deep-link map from legacy portal routes → new routes (includes Wave E `?type=` contract)
- [ ] Stop feature work on legacy end-user portal surfaces; optional later delete/unroute
- [ ] Marketing site links / role home path (`getPostLoginPath` and equivalents) point to new UI
- [ ] DoD sign-off (section 5) with MVP + evidence above
- [ ] Record disposition for every legacy customer route

**Dependencies:** live parity for required MVP waves (not mocks).  
**Blockers:** operator Go/No-Go evidence incomplete; global auth cutover change control.

---

## 4. Cross-cutting (every wave)

- [ ] **a11y** — keyboard, focus, named icon buttons, AlertDialog for destructive; toast announcements when GAP-TOAST ships
- [ ] **Responsive** — Mantine breakpoints; no fixed wide traps on primary staff flows
- [ ] **Visual QA** — before/after or hub screenshots for touched surfaces; BP operator sign-off for blueprints (**APPROVED** 2026-07-19)
- [ ] **Branding** — verify at least one non–Church-46 tenant when chrome/tokens change (required for Wave K evidence)
- [ ] **i18n** — if/when wired, keep keys; no accidental English hardcoding regressions
- [ ] **Tests** — Vitest for new logic; smoke for auth + hub + one deep feature per wave; deep-link tests for records
- [ ] **Rollback** — `/portal2` preview + feature flags; never force-global cutover mid-wave
- [ ] **Work refs** — commit/PR messages cite `PORTAL-WAVE-*` slug + OMBC receipt; no invented OMD IDs

---

## 5. Definition of done — “new end-user OM UI ready”

All must be true for **global** readiness (Wave K). Pilot live auth may proceed earlier under Wave B rules.

1. [ ] Customer Portal is the **supported** parish end-user UI for **MVP scope** defined in Wave K (live auth, hub, records lists + baptism/marriage/funeral editors, **live** OCR mobile + desktop + **persisted** onboard, certificates where used, cemetery for enabled churches, help). **Public enroll is out of scope.** Liturgical calendar / assets / advanced reports do not block if marked post-MVP.
2. [ ] Interactive controls on that surface are `@om/ui` (or promoted `@om/forms` / domain packages); Mantine is shell-only; RAC only behind **documented temporary waivers** or closed gaps; **no Tailwind blueprint ports**.
2b. [x] Blueprints `om-ocr-mobile`, `om-ocr-desktop`, and `om-onboard` are implemented **and** operator visual QA is signed off (Wave BP) — **APPROVED** 2026-07-19. Live OCR APIs for cutover MVP remain separate (Wave K / live OCR items).
3. [ ] No prohibited UI libraries in Customer Portal (including no local toast / Sonner / Mantine Notifications).
4. [ ] Tokens resolve via `@om/tokens` for shared semantics; remaining portal-local values documented with package follow-ups (full brand cleanup may be post-MVP).
5. [ ] Login cutover complete for target tenants per Wave K evidence; legacy `/portal` end-user SPA frozen, redirected, retired, or explicitly deferred with disposition.
6. [ ] a11y + responsive + i18n checks signed for MVP paths.
7. [ ] CI green with Packages auth; pinned `@omrecords82/*` versions; deploy script/docs current.
8. [ ] Package gaps either closed, implemented (GAP-TOAST), or explicitly **waived** with operator sign-off (GAP-LINK-*, GAP-MENU-RICH temporary adapters).
9. [ ] Wave K Go/No-Go evidence checklist complete (pilots, monitoring, rollback, defect bar, route dispositions).

---

## 6. Explicit exclusions / forever boundaries

| Item | Why |
|---|---|
| In-place MUI deletion campaign across `prod/front-end` | Wrong model — legacy may linger until cutover; do not boil the ocean |
| Shipping Customer Portal features by embedding/copying blueprint **Tailwind** trees | Must reimplement with **Mantine + `@om/ui`/RAC** (Wave BP) |
| Rewriting Modernize `FullLayout` / AG Grid / chart engines / certificate canvas / map engines into `@om/ui` | Heavy engines stay app-owned modules inside Customer Portal as needed |
| Auth providers / Keycloak / session cookie policy inside packages | Security boundary — app owns it |
| Pure superadmin / OMAI / Big Book / devel vault (`/devel-tools/parish-vault`) | Out of end-user portal scope |
| **Public enrollment / `/enroll` inside Customer Portal** | Separate acquisition / tenant-provisioning product (Wave I decision) |
| Cemetery geometry **editing** in MVP | Read-oriented MVP only; flags default off |
| Inventing unpublished `@om/*` APIs inside the portal | Hand off to om-packages |
| Inventing OMD ticket IDs | Keep `PENDING_RECONCILIATION`; use `PORTAL-WAVE-*` slugs |
| Sonner / Mantine Notifications / portal-local toast kit | OQ-2 decided: `@om/ui/toast` only (Codex) |
| Global `/portal` login flip before Wave K Go/No-Go | Pilot live auth only until then |
| Wave H editors before entry gates | Highest risk; ordered Baptism → Marriage → Funeral when authorized |

---

## 7. Suggested execution order

1. **Wave A** — CI/deploy/tests/a11y harden Customer Portal _(done)_  
2. **Temporary shell RAC adapters** (approved) while Codex closes GAP-LINK-* / GAP-MENU-RICH — do not block portal work  
3. **GAP-TOAST + GAP-FORM-ALERT** (Codex) — decision settled for toast; implement `@om/ui/toast` + FormAlert  
4. **Wave B** — Auth & session; **pilot live enablement** for allowlisted tenants  
5. **Wave BP visual QA** — operator sign-off **APPROVED** 2026-07-19; continue **live OCR API** integration  
6. **Wave C** — Account & parish settings → live persistence  
7. **Wave D** — Hub depth with live/honest empty states  
8. **Wave E** — Records chrome + **deep-link implementation/tests**  
9. **Wave F** — Live certificates (where used); **assets deferred**  
10. **Wave G** — Cemetery read-oriented MVP for enabled churches; metrics; liturgical calendar **post-MVP**  
11. **Record schema contract** then **Wave H** editors **only after all entry gates** (Baptism → Marriage → Funeral)  
12. **Wave I** — Authenticated onboarding extras / persisted progress (adopt BP-3); **no public enroll**  
13. **Wave J** — Brand tokens / icons / liturgical tokens as needed (**post-MVP OK**)  
14. **Wave K** — Cutover & legacy retirement when Go/No-Go evidence is complete  
15. **DoD sign-off**

---

## Appendix A — Path index

| Area | Path |
|---|---|
| Customer Portal source | `/var/www/workspaces/om-customer-portal` |
| Static deploy | `/var/www/orthodoxmetrics/portal` |
| Preview URL | `https://orthodoxmetrics.com/portal2/` |
| Legacy SPA (parity only) | `https://orthodoxmetrics.com/portal/` → `prod/front-end` |
| Blueprint: OCR Mobile | `https://orthodoxmetrics.com/blueprints/om-ocr-mobile` |
| Blueprint: OCR Desktop | `https://orthodoxmetrics.com/blueprints/om-ocr-desktop` |
| Blueprint: Onboard | `https://orthodoxmetrics.com/blueprints/om-onboard` |
| Blueprint sources (reference) | `prod/front-end/src/features/blueprints/{om-ocr-mobile,om-ocr-desktop,om-onboard}/` |
| Package monorepo | `/var/www/workspaces/om-packages` |
| Integration notes | `om-customer-portal/docs/om-package-integration.md` |
| This checklist (canonical) | `om-customer-portal/docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md` |
| This checklist (operator copy) | `/var/www/orthodoxmetrics/prod/tmp/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md` |
| Legacy discovery | `prod` docs `docs/internal/om-packages-discovery/` |

## Appendix B — OMBC / OMD

- Receipt: `OMBC-20260718-165445-BD189C`
- Decision: PROCEED (durable roadmap; reuse discovery for **inventory/gaps**, do not rebuild packages that already exist)
- Tracking: **`PENDING_RECONCILIATION`** — **do not invent OMD IDs**
- Temporary work refs until OMD exists: `PORTAL-WAVE-*` slugs (examples in §0.4)
- **2026-07-19 amendment:** destination is **new Customer Portal**, not in-place end-user refactor of legacy front-end
- **2026-07-19 operator decisions:** see **Operator decisions summary** (toast, auth pilot vs Wave K, adapter waivers, records deep links, cemetery MVP, liturgical post-MVP, public enroll out of scope, Wave H gates, Wave K Go/No-Go, BP visual QA, assets deferred)
