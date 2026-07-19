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
- [ ] **CI for `om-customer-portal`** — install/lint/typecheck/test/build with Node 24.18 + pnpm 11.10 + `NODE_AUTH_TOKEN` (`read:packages`).
- [ ] **Deploy pipeline** — reproducible `pnpm build` with `VITE_PORTAL_BASE_PATH=/portal2` + rsync to `/var/www/orthodoxmetrics/portal` (scripted; no source copy into deploy dir).
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

- [ ] GitHub Actions CI (Node 24.18, pnpm 11.10, Packages auth)
- [ ] `scripts/deploy-static.sh` (build `/portal2` + rsync deploy dir)
- [ ] Prohibited-deps / import CI check
- [ ] README: local, Packages auth, parallel URL model
- [ ] Expand unit/component tests for shell, theme sync, basePath
- [ ] a11y baseline: skip link, focus main on navigate, drawer escape, burger `aria-controls`

**Dependencies:** foundation done.  
**Blockers:** none.

---

### Wave B — Auth & session (new app)

**Goal:** Real sign-in / session for Customer Portal — **new screens**, not edits to legacy `AuthLogin.tsx`.

**Parity reference:** legacy `/auth/*`, Wave 1 files in `features/auth/**` (patterns only).

- [ ] Session client aligned with OM auth APIs (cookies/CSRF as required) — app data layer
- [ ] Login, forgot password, verify email, accept invite, unauthorized/error pages in Customer Portal
- [ ] Post-login routing **flagged**: stay on `/portal2` for pilot tenants; do not globally flip legacy `/portal` yet
- [ ] Account password change / sessions list (using `@om/ui` Dialog/TextField/Button)
- [ ] GAP-FORM-ALERT interim: FieldError-only until package ships
- [ ] SPA links via basename-aware adapter (app-owned until GAP-LINK-ROUTER)

**Do not:** mutate legacy auth forms as the destination; do not put Keycloak/OIDC logic into `@om/ui`.

**Dependencies:** Wave A preferred.  
**Blockers:** auth API contract clarity; GAP-TOAST decision if using snackbars.

---

### Wave C — Account & parish settings

**Goal:** Parish self-service settings in the new UI.

**Parity reference:** `/account/*`, `parish-management/*` (legacy).

- [ ] Profile / personal info / notifications
- [ ] Parish info / church details (read + edit as product allows)
- [ ] Branding / OCR prefs (controls only; heavy editors later)
- [ ] Parish users list (semantic `@om/ui/table` + app pagination)
- [ ] Onboarding steps that church admins still need on first login

**Dependencies:** Wave B.  
**Blockers:** none hard.

---

### Wave D — Portal hub depth

**Goal:** Replace placeholder home/tiles with real hub behavior while keeping Mantine shell.

**Parity reference:** `/portal` hub, ChurchPortalHub, theme hubs (legacy).

- [ ] Dashboard widgets backed by real APIs (memberships, recent activity, certificates counts)
- [ ] Hub actions/menus via `@om/ui` (after GAP-MENU-RICH or acceptable text-only interim)
- [ ] Empty/onboarding hub states
- [ ] Help / guide / site-map pages in new app
- [ ] Nav config single-sourced (routes, titles, icons, permissions)

**Dependencies:** Waves B–C for session/permissions.  
**Blockers:** OQ-3 template debates apply to **legacy** only; new app already chose Mantine shell — do not reopen unless product asks.

---

### Wave E — Records chrome (lists / search / filters)

**Goal:** Records **list and navigation chrome** in the new portal — not AG Grid editors yet.

**Parity reference:** `/portal/records`, records-management toolbars.

- [ ] Records landing + type filters/search using TextField/Select/ComboBox
- [ ] Add / more actions via Button/Menu/AlertDialog
- [ ] Mobile-friendly list/card chrome
- [ ] Deep-link compatibility plan for legacy `/portal/records?type=` URLs at cutover

**Do not start:** sacramental field editors / AG Grid cell editing (Wave H).

**Dependencies:** Waves B, D; GAP-SELECT-ASYNC optional.  
**Blockers:** none for chrome.

---

### Wave F — OCR, assets, certificates chrome

**Goal:** Staff workflows’ **shells** in the new app; canvases/engines stay app-owned modules.

**Parity reference:** `/portal/ocr`, `/portal/assets`, `/portal/certificates/*`.

- [ ] OCR desktop/upload chrome + job list (OCR canvas/engine app-owned)
- [ ] Assets library browse/collections + AlertDialog confirms
- [ ] Certificates: list, generate form chrome, history table; designer canvas app-owned
- [ ] Interactive reports recipient flows if parish-facing

**Dependencies:** Waves B, D, E.  
**Blockers:** none hard.

---

### Wave G — Cemetery + metrics

**Goal:** Cemetery and church metrics experiences in the new UI.

**Parity reference:** `/portal/cemetery/*`, `/portal/charts` / om-charts.

- [ ] Cemetery map page — map engine app-owned; panels/tooltips/controls `@om/ui`
- [ ] Cemetery records/plots/maintenance/reports lists
- [ ] Church metrics / charts chrome — chart libs stay app-owned
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

**Goal:** First-run and public enrollment in the new app.

- [ ] Record-tables / record-layouts onboarding steps
- [ ] Parish onboarding wizard routed in Customer Portal (legacy registry listed `/portal/onboarding` without a mount — design correctly here)
- [ ] Public `/enroll` (or agreed public URL) if still productized

**Dependencies:** Waves B, C, forms patterns.  
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

1. [ ] Customer Portal is the **supported** parish end-user UI for agreed MVP scope (auth, hub, records chrome, at least one of certificates/OCR/cemetery as product requires).
2. [ ] Interactive controls on that surface are `@om/ui` (or promoted `@om/forms` / domain packages); Mantine is shell-only; RAC only behind documented gaps.
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
5. **Wave C** — Account & parish settings  
6. **Wave D** — Hub depth  
7. **Wave E** — Records chrome  
8. **Wave F** — OCR / assets / certificates chrome  
9. **Wave G** — Cemetery + metrics  
10. **Record schema contract** then **Wave H** editors  
11. **Wave I** — Onboarding / enroll  
12. **Wave J** — Brand tokens / icons  
13. **Wave K** — Cutover & legacy retirement  
14. **DoD sign-off**

---

## Appendix A — Path index

| Area | Path |
|---|---|
| Customer Portal source | `/var/www/workspaces/om-customer-portal` |
| Static deploy | `/var/www/orthodoxmetrics/portal` |
| Preview URL | `https://orthodoxmetrics.com/portal2/` |
| Legacy SPA (parity only) | `https://orthodoxmetrics.com/portal/` → `prod/front-end` |
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
