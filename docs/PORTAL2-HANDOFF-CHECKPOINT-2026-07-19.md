# Portal2 handoff checkpoint — 2026-07-19

> **Purpose:** Operator handoff for continuing Customer Portal work on another machine / fresh Cursor session without losing context.  
> **Checkpoint date:** 2026-07-19  
> **OMBC:** `OMBC-20260718-165445-BD189C` · **OMD:** `PENDING_RECONCILIATION` (do not invent OMD IDs)  
> **Canonical path:** `om-customer-portal/docs/PORTAL2-HANDOFF-CHECKPOINT-2026-07-19.md`  
> **Operator copy:** `/var/www/orthodoxmetrics/prod/tmp/PORTAL2-HANDOFF-CHECKPOINT-2026-07-19.md`

---

## 1. Mission / product

| Item | Value |
|---|---|
| **App** | `om-customer-portal` — greenfield parish end-user UI |
| **Production URL** | `https://orthodoxmetrics.com/portal2/` (parallel to legacy `https://orthodoxmetrics.com/portal/`) |
| **Source repo** | `/var/www/workspaces/om-customer-portal` |
| **Static deploy dir** | `/var/www/orthodoxmetrics/portal/` |
| **Deploy script** | `./scripts/deploy-static.sh` (or `pnpm deploy:static`) — rsync `dist/` → deploy dir |
| **Stack** | Vite + React 19 + TypeScript + **Mantine** shell + **`@om/ui`** / **`@om/tokens`** / **`@om/contracts`** |
| **Package aliases** | `@om/contracts` → `@omrecords82/contracts@0.2.0`; `@om/tokens` / `@om/ui` → `@omrecords82/*@0.1.0` |
| **Node toolchain** | Node **24.18** + pnpm **11.10**; `NODE_AUTH_TOKEN` for GitHub Packages |
| **Master checklist** | `docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md` |

**Program model:** Build new UI in `om-customer-portal`; run at `/portal2` beside legacy `/portal` SPA. Global `/portal` cutover is **Wave K only** — not authorized yet.

---

## 2. Pilot tenant

| Field | Value |
|---|---|
| **Sole authorized tenant** | `om_church_46` |
| **Numeric church id** | **46** (`Saints Peter & Paul Orthodox Church`) |
| **Pilot user** | `frjames@ssppoc.org` — role **priest**, `users.id` **2** |
| **Auth pilot status** | **CLOSED** 2026-07-19 — see `docs/AUTH-PILOT-CHECKLIST.md` |
| **Rollback rehearsal** | **WAIVED** by operator — not rehearsed; `/portal2` stays live auth |
| **Legacy `/portal`** | Untouched; still serves parish traffic |

**Do not add tenants without explicit operator authorization.**

---

## 3. Current production `/portal2` bake flags

As last deployed (build-time `VITE_*` — **not** committed in repo; `.env.example` stays mock/false):

```bash
VITE_PORTAL_BASE_PATH=/portal2
VITE_PORTAL_AUTH_MODE=live
VITE_PORTAL_REQUIRE_AUTH=true
VITE_PORTAL_RECORDS_EDITOR_BAPTISM=true
# marriage/funeral default false (omit or explicit false)
VITE_PORTAL_RECORDS_EDITOR_MARRIAGE=false
VITE_PORTAL_RECORDS_EDITOR_FUNERAL=false
# cemetery flags default false unless operator enables per church
VITE_CEMETERY_ENABLED=false
VITE_CEMETERY_MAP_ENABLED=false
```

### Redeploy template (any FE change)

From `/var/www/workspaces/om-customer-portal`:

```bash
export NODE_AUTH_TOKEN="${NODE_AUTH_TOKEN:-$(gh auth token)}"
export PATH="${HOME}/.local/node-v24.18.0/bin:${PATH}"

VITE_PORTAL_BASE_PATH=/portal2 \
VITE_PORTAL_AUTH_MODE=live \
VITE_PORTAL_REQUIRE_AUTH=true \
VITE_PORTAL_RECORDS_EDITOR_BAPTISM=true \
VITE_PORTAL_RECORDS_EDITOR_MARRIAGE=false \
VITE_PORTAL_RECORDS_EDITOR_FUNERAL=false \
./scripts/deploy-static.sh
```

**Dry-run flag check (no deploy):**

```bash
pnpm validate:auth-pilot
```

**Backend deploy (OM — only if OM server changed):**

```bash
cd /var/www/orthodoxmetrics/prod
/var/omai-ops/om-deploy.sh be-sync   # or fe per change
```

**OMAI deploy (only if OMAI OIDC/auth changed):**

```bash
/var/omai-ops/omai-deploy.sh fe   # or appropriate target
```

---

## 4. What's done this session

### Portal repo — `git log -20 --oneline` (HEAD = `0d3264a`)

| Commit | Summary |
|---|---|
| `0d3264a` | feat(wave-h): baptism history panel + delete flow |
| `f9b8a37` | feat(wave-h): baptism records editor for `/portal2` dual-run |
| `daae1ec` | chore(deps): pin `@omrecords82/contracts@0.2.0` |
| `1c22921` | docs(wave-h): sacramental schema gate closed |
| `bc9a8dd` | docs(auth-pilot): close `om_church_46`; waive rollback |
| `ba6658e` | docs(auth-pilot): parish settings + nested `next=` confirmed |
| `c0f11f7` | docs(auth-pilot): live `/portal2` verification evidence |
| `12f0fa0` | docs: partial auth pilot evidence |
| **`b96950e`** | **Fix live records list church context** (string→numeric `churchId`; auth-ready gate) |
| `bd4ba35` | docs: `om_church_46` live-auth deploy |
| `136c235` | PORTAL-WAVE-B-AUTH: sole pilot tenant recorded |
| `e173ded` | PORTAL-WAVE-J-A11Y: shell focus, skip link, route titles |
| `3f51818` | PORTAL-WAVE-I-ONBOARD: post-login redirect + CTAs |
| `7719f9e` | PORTAL-WAVE-G-METRICS: KPI polish |
| `73ffa6c` | PORTAL-WAVE-F-CERTS: certificates DoD + help sitemap |
| `9ff2091` | PORTAL-AUTH-PILOT: operator scaffolding |
| `187d6c4` | PORTAL-WAVE-H-FLAGS: records editor dual-run flags |
| `9f837b9` | PORTAL-WAVE-J-TOKENS: liturgical + accessibility CSS |
| `79ecec5` | PORTAL-WAVE-J-TOKENS: brand-bridge to `@om/tokens` |
| `84fc85b` | PORTAL-WAVE-G-CEMETERY-MAP: read-only map UX polish |

### Cross-repo / backend evidence

| Repo | Commit / PR | What |
|---|---|---|
| **OMAI** | PR **#314** / `d5d0a11` | OIDC redirect to `/portal2/auth/oidc-complete` when `next` starts with `/portal2` |
| **OM backend** | `f1aeb2d37` | Fix `church_id` resolution for portal parish settings API (`CHURCH_ID_MISSING` → live) |
| **om-packages** | PR **#16** / `394e541` | Publish `@omrecords82/contracts@0.2.0` (baptism/marriage/funeral Zod schemas) |

### Capability areas closed (session arc)

- [x] **Wave B** — Auth pilot live for `om_church_46`; rollback waived
- [x] **Wave C** — Settings live persist (profile, parish, OCR prefs, parish users)
- [x] **Wave D** — Hub live KPIs + honest empties
- [x] **Wave BP** — OCR mobile/desktop + onboard productized; operator visual QA approved
- [x] **Wave E** — Records list + `?type=` deep links
- [x] **Wave F** — Certificates history + render (assets deferred)
- [x] **Wave G** — Cemetery read-only map MVP; metrics polish
- [x] **Wave I** — Onboarding wizard + live checklist APIs
- [x] **Wave J (partial)** — Brand bridge, a11y shell sweep
- [x] **Wave H (baptism only)** — Editor + history + delete; flag ON on `/portal2`

### Key portal file paths (Wave H baptism)

| Area | Path |
|---|---|
| Editor page | `src/features/records/baptism/BaptismEditorPage.tsx` |
| API client | `src/features/records/baptism/baptismEditorApi.ts` |
| Mappers | `src/features/records/baptism/baptismEditorMappers.ts` |
| History panel | `src/features/records/baptism/BaptismHistoryPanel.tsx` |
| Dual-run flags | `src/features/records/recordsEditorFlags.ts` |
| List chrome | `src/features/records/RecordsPage.tsx`, `recordsApi.ts` |
| Routes | `src/app/App.tsx` — `/records/baptism/new`, `/records/baptism/:id/edit` |

---

## 5. Wave H status

### Entry gates — all **CLOSED** (2026-07-19)

| Gate | Status | Evidence |
|---|---|---|
| Live auth + church context | Closed | `docs/AUTH-PILOT-CHECKLIST.md` |
| Records list APIs | Closed | `recordsApi.ts`, `RecordsPage.tsx` |
| Deep-link `?type=` | Closed | `recordsDeepLink.ts` + tests |
| `@om/contracts` schemas | Closed | `@omrecords82/contracts@0.2.0` published + pinned |
| Permission rules documented | Closed | `docs/WAVE-H-RECORDS-GATES.md` §1 |
| Tenant isolation tests | Closed | `recordsApi.test.ts` |
| Clergy/location selection | Closed | `docs/WAVE-H-RECORDS-GATES.md` §5 |
| Dual-run / rollback policy | Closed | `recordsEditorFlags.ts`, `docs/WAVE-H-RECORDS-GATES.md` §6 |
| Audit expectations | Closed | `docs/WAVE-H-RECORDS-GATES.md` §3 |

### Editor implementation

| Editor | UI shipped | Prod flag | Status |
|---|---|---|---|
| **Baptism** | Yes | `VITE_PORTAL_RECORDS_EDITOR_BAPTISM=true` | Shipped + history + delete |
| **Marriage** | No | `false` (default) | **NOT started** |
| **Funeral** | No | `false` (default) | **NOT started** |

### Dual-run policy

- **At most one editor type enabled at a time** during pilot (`hasDualRunPilotConflict` in `recordsEditorFlags.ts`).
- Legacy `/portal/records/*` remains fallback when portal flag is off.
- Turn baptism flag **off** before enabling marriage (unless operator overrides).

### Known OM backend gap (residual)

Sacrament mutating routes use `requireAuth` only — **no server `requireRole` / `canManageRecords`**. Portal enforces deacon+ on client; **recommended follow-up:** add server role gates in OM (`server/src/api/{baptism,marriage,funeral}.js`).

---

## 6. Open backlog (ordered)

| # | Task | Notes |
|---|---|---|
| 1 | **Smoke-test baptism CRUD + history + delete** on prod `/portal2` as `frjames@ssppoc.org` | Create → list → edit → history entry → delete. Not yet operator-signed after `0d3264a`. |
| 2 | **OM backend:** `requireRole` / `canManageRecords` on sacrament POST/PUT/DELETE | See `docs/WAVE-H-RECORDS-GATES.md` §1 |
| 3 | **Marriage editor** | Reuse baptism pattern; turn baptism dual-run **OFF** first per policy |
| 4 | **Funeral editor** | Same as marriage |
| 5 | **Wave K Go/No-Go** / global `/portal` cutover | **Not authorized** — needs 2+ pilot churches, rollback test, MVP parity |
| 6 | **Deferred (non-blockers)** | GAP-TOAST Codex; assets library; liturgical calendar UI; cert designer canvas; cemetery geometry edit |

### Checklist items still open (from master doc)

- [ ] OMD reconciliation — keep **`PENDING_RECONCILIATION`**; use `PORTAL-WAVE-*` slugs only
- [ ] GAP-TOAST — `@om/ui/toast` (Codex); no Sonner/Mantine Notifications
- [ ] Version bump cadence when om-packages ships new versions
- [ ] Marriage + funeral editors (Wave H remainder)
- [ ] Wave K evidence (2 pilots, mobile, rollback test, route dispositions)

---

## 7. Hard rules for the next Cursor

| Rule | Detail |
|---|---|
| **Tenants** | Only **`om_church_46` / church 46**. Do not invent or enable other tenants. |
| **Global cutover** | Do **not** flip legacy `/portal` login or marketing post-login paths without Wave K authorization. |
| **Editor flags** | Do **not** enable marriage + baptism together unless operator explicitly says so. |
| **Auth on redeploy** | Keep `VITE_PORTAL_AUTH_MODE=live` + `VITE_PORTAL_REQUIRE_AUTH=true` for `/portal2` unless asked to mock. |
| **Deploy scripts** | Portal: `./scripts/deploy-static.sh` · OMAI: `/var/omai-ops/omai-deploy.sh` · OM: `/var/omai-ops/om-deploy.sh` |
| **OM prod FE** | **No `Unstable_Grid2`** if touching `/var/www/orthodoxmetrics/prod/front-end` |
| **Packages** | Do not invent unpublished `@om/*` APIs — Codex in `om-packages` |
| **Toast** | No portal-local toast / Sonner — wait for GAP-TOAST |
| **Commits** | Cite `PORTAL-WAVE-*` + OMBC receipt; no invented OMD IDs |
| **Secrets** | Never commit `.env`, tokens, or credentials |

---

## 8. Start on another machine

### Setup

```bash
# Clone / pull
git clone git@github.com:omrecords82/om-customer-portal.git   # adjust remote
cd om-customer-portal && git pull origin main   # expect HEAD ~0d3264a+

# Node 24.18 + pnpm 11.10
export PATH="${HOME}/.local/node-v24.18.0/bin:${PATH}"
corepack enable && corepack prepare pnpm@11.10.0 --activate

# GitHub Packages auth
export NODE_AUTH_TOKEN="$(gh auth token)"   # or PAT with read:packages
echo "@omrecords82:registry=https://npm.pkg.github.com" >> ~/.npmrc

pnpm install
pnpm validate   # lint + typecheck + deps + test + build
```

### Related repos (if backend work)

| Repo | Path (this server) |
|---|---|
| OM prod | `/var/www/orthodoxmetrics/prod` |
| OMAI | `/var/www/omai` |
| om-packages | `/var/www/workspaces/om-packages` |

### Paste-ready first prompt for Cursor

```
Continue om-customer-portal (/portal2) work from checkpoint
docs/PORTAL2-HANDOFF-CHECKPOINT-2026-07-19.md.

Context: sole pilot tenant om_church_46 (church 46); live auth on /portal2;
baptism editor shipped with VITE_PORTAL_RECORDS_EDITOR_BAPTISM=true;
marriage/funeral not started; Wave K cutover not authorized.

First task: smoke-test baptism create/edit/history/delete on production
/portal2 as frjames@ssppoc.org and document pass/fail in AUTH-PILOT or
WAVE-H docs. Do not enable other tenants or flip legacy /portal login.
Redeploy only with live auth flags per handoff §3.
```

---

## Quick reference — related docs

| Document | Path |
|---|---|
| Master checklist | `docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md` |
| Auth pilot | `docs/AUTH-PILOT-CHECKLIST.md` |
| Wave H gates | `docs/WAVE-H-RECORDS-GATES.md` |
| Package integration | `docs/om-package-integration.md` |
| Blueprint visual QA | `docs/BLUEPRINT-VISUAL-QA.md` |
| Env template | `.env.example` |

---

*Generated 2026-07-19. Update this checkpoint when closing the next major wave or before operator handoff.*
