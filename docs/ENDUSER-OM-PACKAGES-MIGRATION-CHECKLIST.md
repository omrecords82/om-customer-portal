# OM End-User Experience → New Customer Portal Build Checklist

> **Classification:** INTERNAL  
> **Audience:** operators / agents executing the build  
> **Scope:** parish/church end users only (`church_admin`, `priest`, `deacon`, `editor`, public auth, parish portal)  
> **Created:** 2026-07-18  
> **Reframed:** 2026-07-19 — **greenfield Customer Portal**, not in-place refactor of legacy OM front-end  
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
| Cut over login / deep links to new UI when parity accepts | **Later waves** |
| Retire or freeze legacy end-user portal routes | **Final cutover** |

**Scale honesty:** full parish end-user parity is a **multi-quarter program**. The new portal already has toolchain + shell + package integration; feature depth is still thin. Legacy auth/account pilots on MUI (PRs #1003/#1004) remain useful **reference implementations**, not the destination codebase.

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
| Direct `react-aria-components` | Only where `@om/ui` lacks capability (allowlisted) |

- [x] **Global CSS order** — Mantine → `@om/tokens/css` → `@om/ui/css` → portal overrides (`src/app/App.tsx`).
- [x] **Theme sync** — `OmThemeSync` mirrors Mantine scheme onto `document.documentElement.dataset.omTheme`.
- [x] **ESLint prohibited stacks** — no MUI / Emotion / Radix / Tailwind / shadcn / Bootstrap / Chakra / Ant; RAC allowlisted only in documented shell files.
- [ ] **Theme bridge completeness** — map remaining portal-local navy/gold/sidebar vars onto published tokens when packages gain brand/sidebar semantics (do not invent tokens in the app).
- [ ] **Liturgical / accessibility token layers** — adopt `@om/tokens/css/liturgical` and `css/accessibility` when calendar/a11y waves need them.

### 0.3 Governance

- [ ] **No parallel primitive kits** — do not create `components/portal/ui/*` shadcn twins or local wrappers that re-expose React Aria types as public Portal APIs.
- [ ] **Codex vs Cursor** — Codex grows `@om/*` APIs in `om-packages`; Cursor builds Customer Portal features against published packages. Do not start a portal wave blocked by a package gap without a Codex handoff item.
- [ ] **Promotion criteria before new package/component consumption as “stable”**
  1. `verify:public-api` + Storybook/keyboard coverage in om-packages
  2. Changeset + published `@omrecords82/*` version
  3. Pilot on a low-risk Customer Portal surface
  4. No RAC leakage in public declarations
  5. Tokens via `@om/tokens` CSS variables only

### 0.4 Tracking

- [ ] **Create / reconcile OMD work items per wave** — do not invent IDs; prefer `PENDING_RECONCILIATION` resolution.
- [ ] **Link each wave PR** to legacy discovery MIG ids only as **parity references**, not as file-migration tickets.

---

## 1. Already completed (Customer Portal foundation)

| Item | Evidence | Status |
|---|---|---|
| Separate app repo + Vite/React 19/TS/pnpm toolchain aligned to om-packages | `om-customer-portal` commit `e9909ec` | Done |
| `/portal2` nginx → `/var/www/orthodoxmetrics/portal` static deploy; `/portal` remains legacy SPA | nginx snippet `orthodoxmetrics-customer-portal.conf` | Done |
| Published `@om/*` aliases installed; CSS order; token mapping start; Button/IconButton migration | commit `a887c35`; `docs/om-package-integration.md` | Done |
| Shell IA: home + placeholder routes (records, OCR, metrics, cemetery, certificates, help, account) | `src/app/App.tsx` | Done (chrome only) |
| Parallel run with legacy portal | Product decision 2026-07-19 | Done |

Legacy OM `front-end` Wave 1 auth/account `@om/ui` pilots (PR #1003/#1004) are **reference patterns** for forms/dialogs — port ideas into the new app; do not treat those files as the destination.

---

## 2. Package capability gaps (build blockers)

### 2.1 Current `@om/ui` public surface (`@omrecords82/ui@0.1.0`)

Us existing exports for new portal screens. Do not rebuild these in-app.

| Subpath | Component | Customer Portal notes |
|---|---|---|
| `button` / `icon-button` | Button, IconButton | In use (home + header) |
| `link` | Link | **No router/basename adapter**, no `onPress` / `aria-current` — sidebar still RAC |
| `menu` | Menu | Data-driven; **no item icons** / weak composite triggers — account menu still RAC |
| `text-field` / `text-area` / `label` / `field-error` | Forms | Ready for auth/account waves |
| `checkbox` / `radio` / `radio-group` / `switch` | Selection | Ready |
| `select` / `combo-box` | Lists | ComboBox local-filter only |
| `dialog` / `alert-dialog` / `drawer` | Overlays | Ready |
| `tabs` / `tooltip` / `table` | Structure | Tabs no router sync; Table semantic only |
| `css` | styles | Load after tokens |

### 2.2 Gaps to close in `om-packages` (Codex) when they block Customer Portal waves

| Gap ID | Capability | Blocks portal waves | Priority |
|---|---|---|---|
| GAP-LINK-ROUTER | Router/basename-aware Link (or documented app adapter without RAC leakage) | Nav, auth links, hub | High |
| GAP-LINK-NAV | Nav semantics (`aria-current`, optional press/close hooks) | Sidebar/chrome | High |
| GAP-MENU-RICH | Menu item leading icons + composite trigger patterns | Account/header menus | High |
| GAP-FORM-ALERT | Form-level announced error/success | Auth/register/account | High |
| GAP-TOAST | Single toast/snackbar (human pick — OQ-2) | Cross-cutting | High (decision) |
| GAP-CHECKBOX-GROUP | CheckboxGroup | Settings/forms | Medium |
| GAP-TABLE-BASIC-UX | Sort/filter/pagination **or** `@om/tables` split | Lists | Medium |
| GAP-SELECT-ASYNC | Async ComboBox pattern | Records/certificates filters | Medium |
| GAP-BRAND-TOKENS | Navy/gold/sidebar/semantic brand packs | Token cutover from portal-local CSS | Medium |
| GAP-BUTTON-ICON-SLOT | Leading/trailing icon slot | Hub tiles/CTAs | Low |

### 2.3 Future packages (create only when promotion criteria met)

| Package | Needed for | Do not start until |
|---|---|---|
| `@om/icons` | Unified icon story | Brand/token stability + hub/nav patterns |
| `@om/forms` | Shared form layout / FormAlert / field stacks | GAP-FORM-ALERT + 2–3 portal pilots |
| `@om/tables` | Beyond semantic Table | After list pilots prove need |
| `@om/records` | Sacramental editors / list chrome | Schema contract + chrome waves |
| `@om/cemetery` | Cemetery domain chrome | Map engine stays app-owned |
| `@om/vault` | Only if parish-facing vault is productized | Today devel/superadmin — likely out |
| `@om/onboarding` | First-login wizards | Forms + stepper decision |
| `@om/certificates` | Only if studio chrome reuse proven | Canvas stays app-owned |

---

## 3. Wave-by-wave build checklist (new Customer Portal)

> Each wave **implements screens/services in `om-customer-portal`**. Legacy paths are listed only as **parity targets**. Copying MUI trees from `front-end` is forbidden; reimplement against Mantine + `@om/ui`.

### Wave A — Platform harden (Customer Portal)

**Goal:** Make the new app production-operable while still preview-only at `/portal2`.

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

- [x] Session client aligned with OM auth APIs (cookies/CSRF as required) — app data layer (`mock` default / `live` mode)
- [x] Login, forgot password, unauthorized, verify-email, accept-invite pages in Customer Portal
- [x] Post-login routing **flagged**: stay on `/portal2` for pilot tenants; do not globally flip legacy `/portal` yet
- [x] Account password change dialog (mock) + profile surface; sessions list still open
- [x] GAP-FORM-ALERT interim: FieldError-only until package ships
- [ ] SPA links via basename-aware adapter (app-owned until GAP-LINK-ROUTER) — shell still uses RAC `RouterProvider` + `Link`

**Do not:** mutate legacy auth forms as the destination; do not put Keycloak/OIDC logic into `@om/ui`.

**Dependencies:** Wave A preferred.  
**Blockers:** auth API contract clarity; GAP-TOAST decision if using snackbars.

---

### Wave C — Account & parish settings

**Goal:** Parish self-service settings in the new UI.

**Parity reference:** `/account/*`, `parish-management/*` (legacy).

- [x] Profile / personal info / notifications (mock save; live APIs later)
- [x] Parish info / church details (read + edit mock)
- [x] Branding / OCR prefs (controls only; heavy editors later)
- [x] Parish users list (semantic `@om/ui/table` + mock rows)
- [x] Onboarding steps that church admins still need on first login — link to Wave BP onboard

**Dependencies:** Wave B.  
**Blockers:** none hard.

---

### Wave D — Portal hub depth

**Goal:** Replace placeholder home/tiles with real hub behavior while keeping Mantine shell.

**Parity reference:** `/portal` hub, ChurchPortalHub, theme hubs (legacy).

- [ ] Dashboard widgets backed by real APIs (memberships, recent activity, certificates counts)
- [x] Hub actions/menus via `@om/ui` (quick actions on home; GAP-MENU-RICH still open for rich menus)
- [ ] Empty/onboarding hub states
- [x] Help / guide / site-map pages in new app
- [x] Nav config single-sourced (routes, titles, icons, permissions) — permissions TBD with live roles

**Dependencies:** Waves B–C for session/permissions.  
**Blockers:** OQ-3 template debates apply to **legacy** only; new app already chose Mantine shell — do not reopen unless product asks.

---

### Wave BP — Blueprint productization (required UX sources)

**Goal:** Fully implement the three **Blueprints** UX systems inside Customer Portal as first-class product surfaces — **not** iframe/embed of legacy blueprint routes, and **not** copy-paste of scoped Tailwind.

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

- [x] Behavior and information architecture match the blueprint preview (phases/steps, primary actions, empty/error/success states) — **initial productization**; refine against live blueprint screenshots as needed
- [x] Routed under Customer Portal (`/ocr/mobile`, `/ocr`, `/onboarding` under `/portal2` basename)
- [x] Zero Tailwind / zero blueprint `styles/tailwind.css` imports in Customer Portal
- [x] Mantine owns layout; `@om/ui` (or allowlisted RAC) owns buttons, fields, menus, dialogs, tabs, etc.
- [x] Light + dark schemes work via existing `OmThemeSync`
- [x] Keyboard / screen-reader basics (named icon buttons, dialog titles, focus order through wizard steps) — baseline; continue hardening
- [x] Vitest coverage for step-state machines / critical transitions (onboard + OCR mobile)
- [ ] Visual QA screenshots vs blueprint reference in PR
- [ ] Legacy `/blueprints/*` routes remain reference-only until Wave K (optional redirect later)

#### BP-1 — OM OCR Mobile (full implementation)

- [x] Reimplement 4-phase mobile upload flow from blueprint (capture → review/crop → process → results) in `om-customer-portal`
- [x] Camera / file picker / permission-denied / offline-ish empty states — mock connect modes present
- [x] Mobile-first Mantine layout (AppShell-compatible; usable inside portal navbar)
- [ ] Wire real OCR upload/job APIs when Wave B session exists; mock seam until then
- [x] Nav entry under OCR / Uploads for church roles (not super_admin-only blueprint gate)

#### BP-2 — OM OCR Desktop (full implementation)

- [x] Reimplement desktop/batch OCR portal from blueprint (history, configure, upload, processing, results)
- [x] Replace Tailwind chrome with Mantine + `@om/ui` tables/menus/dialogs
- [x] Job history list + filters; batch actions with AlertDialog confirms
- [ ] Integrate with existing OM OCR job APIs (parity with legacy `PortalOcrDesktopApp` behavior, new UI only)
- [x] This becomes the primary `/ocr` experience in Customer Portal (Wave F consumes it; do not build a second competing OCR UI)

#### BP-3 — OM Onboard (full implementation)

- [x] Reimplement church portal preparation / onboarding screen from blueprint
- [x] Multi-step readiness checklist using Mantine structure + `@om/ui` controls (app stepper OK)
- [ ] Persist progress against parish onboarding APIs / Wave C settings
- [x] Becomes the primary in-portal onboarding surface (Wave I consumes it)

**Dependencies:** Wave A (harden); Wave B for real APIs; package gaps GAP-FORM-ALERT / GAP-MENU-RICH as needed.  
**Blockers:** none to start UI port with mocks.  
**Priority:** **elevate above generic Wave F/I placeholders** — blueprints are the UX source of truth for OCR + onboard.

---

### Wave E — Records chrome (lists / search / filters)

**Goal:** Records **list and navigation chrome** in the new portal — not AG Grid editors yet.

**Parity reference:** `/portal/records`, records-management toolbars.

- [x] Records landing + type filters/search using TextField/Select/ComboBox (Mantine TextInput/Select + @om/ui actions)
- [x] Add / more actions via Button/Menu/AlertDialog (Add button + destructive delete confirm)
- [x] Mobile-friendly list/card chrome
- [ ] Deep-link compatibility plan for legacy `/portal/records?type=` URLs at cutover

**Do not start:** sacramental field editors / AG Grid cell editing (Wave H).

**Dependencies:** Waves B, D; GAP-SELECT-ASYNC optional.  
**Blockers:** none for chrome.

---

### Wave F — Assets, certificates chrome (+ OCR adoption)

**Goal:** Remaining staff workflow chrome. **OCR UI comes from Wave BP** — do not invent a third OCR shell.

**Parity reference:** `/portal/assets`, `/portal/certificates/*`; OCR via blueprints (Wave BP).

- [x] Adopt BP-1 + BP-2 as the OCR routes (mobile + desktop); remove placeholder OCR page
- [ ] Assets library browse/collections + AlertDialog confirms
- [x] Certificates: list, generate form chrome, history table; designer canvas app-owned
- [ ] Interactive reports recipient flows if parish-facing

**Dependencies:** Wave BP (OCR); Waves B, D, E.  
**Blockers:** Wave BP incomplete ⇒ OCR checklist stays open.

---

### Wave G — Cemetery + metrics

**Goal:** Cemetery and church metrics experiences in the new UI.

**Parity reference:** `/portal/cemetery/*`, `/portal/charts` / om-charts.

- [ ] Cemetery map page — map engine app-owned; panels/tooltips/controls `@om/ui`
- [x] Cemetery records/plots/maintenance/reports lists — plots list chrome (mock)
- [x] Church metrics / charts chrome — KPI cards ready; chart libs stay app-owned
- [ ] Liturgical calendar chrome if in parish product scope

**Dependencies:** Waves B, D, table patterns from C/E.  
**Blockers:** cemetery MVP geometry product freeze; enablement flags per church.

---

### Wave H — Records editors (highest risk)

**Goal:** Sacramental create/edit in the new portal with validation parity.

- [ ] Canonical record schema via `@om/contracts` / future `@om/records`
- [ ] Baptism / marriage / funeral entry & edit flows on `@om/ui` + forms package
- [ ] Drawer/Dialog edit hosts; dual-run feature flag vs legacy editors
- [ ] Tenant isolation tests mandatory

**Dependencies:** Wave E; schema contract; async ComboBox decision.  
**Do not start early.** Highest regression risk in the program.

---

### Wave I — Onboarding wizards & public enrollment

**Goal:** First-run and public enrollment in the new app. **In-portal preparation UI comes from Wave BP-3 (OM Onboard).**

- [ ] Adopt BP-3 (`om-onboard`) as the primary parish preparation / onboarding surface
- [ ] Record-tables / record-layouts onboarding steps (beyond blueprint if still required)
- [ ] Public `/enroll` (or agreed public URL) if still productized

**Dependencies:** Wave BP-3; Waves B, C, forms patterns.  
**Blockers:** stepper/wizard — package Tabs defer steppers; app-owned stepper OK.

---

### Wave J — Brand tokens, icons, a11y finish

**Goal:** End-user theming without portal-local hex sprawl.

- [ ] Consume brand/sidebar tokens once published (GAP-BRAND-TOKENS)
- [ ] Liturgical token layer for calendar surfaces
- [ ] `@om/icons` adoption after audit (do not mix Tabler/MUI/lucide casually)
- [ ] forced-colors / accessibility CSS wired
- [ ] Church 46: **tenant exception remains app-owned** if/when that shell is ported — document forever-app-owned assets

**Dependencies:** hub/chrome waves stable.  
**Do not start early** — token churn breaks prior waves.

---

### Wave K — Cutover & legacy retirement

**Goal:** Make the new portal the real end-user destination; freeze legacy end-user portal.

- [ ] Pilot tenants: post-login → `/portal2` (or `/portal` after base-path cutover)
- [ ] Rebuild Customer Portal with `VITE_PORTAL_BASE_PATH=/portal` when ready; nginx `/portal` serves new `dist`
- [ ] Redirect/retire `/portal2` after soak
- [ ] Deep-link map from legacy portal routes → new routes
- [ ] Stop feature work on legacy end-user portal surfaces; optional later delete/unroute
- [ ] Marketing site links / role home path (`getPostLoginPath` and equivalents) point to new UI
- [ ] DoD sign-off (section 5)

**Dependencies:** parity acceptance for required waves (product-defined MVP).  
**Blockers:** operator go/no-go; auth cutover change control.

---

## 4. Cross-cutting (every wave)

- [ ] **a11y** — keyboard, focus, named icon buttons, AlertDialog for destructive
- [ ] **Responsive** — Mantine breakpoints; no fixed wide traps on primary staff flows
- [ ] **Visual QA** — before/after or hub screenshots for touched surfaces
- [ ] **Branding** — verify at least one non–Church-46 tenant when chrome/tokens change
- [ ] **i18n** — if/when wired, keep keys; no accidental English hardcoding regressions
- [ ] **Tests** — Vitest for new logic; smoke for auth + hub + one deep feature per wave
- [ ] **Rollback** — `/portal2` preview + feature flags; never force-global cutover mid-wave

---

## 5. Definition of done — “new end-user OM UI ready”

All must be true:

1. [ ] Customer Portal is the **supported** parish end-user UI for agreed MVP scope (auth, hub, records chrome, **OCR mobile + OCR desktop + onboard blueprints**, plus certificates/cemetery as product requires).
2. [ ] Interactive controls on that surface are `@om/ui` (or promoted `@om/forms` / domain packages); Mantine is shell-only; RAC only behind documented gaps; **no Tailwind blueprint ports**.
2b. [ ] Blueprints `om-ocr-mobile`, `om-ocr-desktop`, and `om-onboard` are fully implemented in Customer Portal with Mantine + `@om/ui`/RAC stack rewrite (Wave BP signed off).
3. [ ] No prohibited UI libraries in Customer Portal.
4. [ ] Tokens resolve via `@om/tokens` for shared semantics; remaining portal-local values documented with package follow-ups.
5. [ ] Login cutover complete for target tenants; legacy `/portal` end-user SPA frozen or redirected.
6. [ ] a11y + responsive + i18n checks signed for MVP paths.
7. [ ] CI green with Packages auth; pinned `@omrecords82/*` versions; deploy script/docs current.
8. [ ] Package gaps either closed or explicitly waived with operator sign-off.

---

## 6. Explicit exclusions / forever boundaries

| Item | Why |
|---|---|
| In-place MUI deletion campaign across `prod/front-end` | Wrong model — legacy may linger until cutover; do not boil the ocean |
| Shipping Customer Portal features by embedding/copying blueprint **Tailwind** trees | Must reimplement with **Mantine + `@om/ui`/RAC** (Wave BP) |
| Rewriting Modernize `FullLayout` / AG Grid / chart engines / certificate canvas / map engines into `@om/ui` | Heavy engines stay app-owned modules inside Customer Portal as needed |
| Auth providers / Keycloak / session cookie policy inside packages | Security boundary — app owns it |
| Pure superadmin / OMAI / Big Book / devel vault (`/devel-tools/parish-vault`) | Out of end-user portal scope |
| Toast system until OQ-2 decided | Human decision |
| Inventing unpublished `@om/*` APIs inside the portal | Hand off to om-packages |

---

## 7. Suggested execution order

1. **Wave A** — CI/deploy/tests/a11y harden Customer Portal  
2. **GAP-LINK-*** / **GAP-MENU-RICH** / **GAP-FORM-ALERT** (Codex) as they unblock B–D — or temporary app adapters with no RAC type leakage  
3. **GAP-TOAST (OQ-2)** human decision  
4. **Wave B** — Auth & session in new app  
5. **Wave BP** — Blueprint productization (**om-ocr-mobile**, **om-ocr-desktop**, **om-onboard**) on Mantine + `@om/ui`/RAC  
6. **Wave C** — Account & parish settings  
7. **Wave D** — Hub depth  
8. **Wave E** — Records chrome  
9. **Wave F** — Assets / certificates (+ adopt BP OCR routes)  
10. **Wave G** — Cemetery + metrics  
11. **Record schema contract** then **Wave H** editors  
12. **Wave I** — Onboarding extras / enroll (adopt BP-3)  
13. **Wave J** — Brand tokens / icons  
14. **Wave K** — Cutover & legacy retirement (incl. optional `/blueprints/*` redirects)  
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

## Appendix B — OMBC

- Receipt: `OMBC-20260718-165445-BD189C`
- Decision: PROCEED (durable roadmap; reuse discovery for **inventory/gaps**, do not rebuild packages that already exist)
- Tracking: `PENDING_RECONCILIATION`
- **2026-07-19 amendment:** destination is **new Customer Portal**, not in-place end-user refactor of legacy front-end
