# Portal UI Audit — Phased Remediation Plan (2026-07-21)

> **Classification:** INTERNAL (operator / agent)  
> **Report ID:** `ui-public-all-2026-07-21T02-36-58`  
> **Generated:** 2026-07-21T02:38:03Z  
> **Canonical path:** `om-customer-portal/docs/PORTAL2-UI-AUDIT-REMEDIATION-PLAN-2026-07-21.md`  
> **Operator copy:** `/var/www/orthodoxmetrics/prod/tmp/PORTAL2-UI-AUDIT-REMEDIATION-PLAN-2026-07-21.md`  
> **Artifact root:** `/var/www/orthodoxmetrics/prod/scripts/portal-ui-audit/.om-artifacts/ui-public-all-2026-07-21T02-36-58/`  
> **Audit UI:** `https://orthodoxmetrics.com/devel-tools/portal-ui-audit`

---

## Surface scope (read first)

| Surface | In this audit? | Notes |
|---|---|---|
| **Public marketing site** (`/`, `/about`, `/enroll`, …) | **Yes — primary** | Preset `full-public`, scope `public`, base URL `https://orthodoxmetrics.com/` |
| **Legacy parish portal** (`/portal`, Church 46) | **No** | Not in route set; 17 routes discovered, 16 active, all public |
| **Customer Portal** (`/portal2`) | **No** | Separate greenfield app (`om-customer-portal`); not audited in this run |

**Project root audited:** `/var/www/orthodoxmetrics/prod/front-end` (OM monolith SPA).

This document lives in `om-customer-portal/docs/` for program cross-reference, but **remediation ownership is overwhelmingly OM front-end + shared `@om/*` packages**, not Portal2. Portal2 already follows a single-stack model (Mantine + `@om/ui`); the competition/cascade findings here describe **legacy OM public + admin SPA debt**, not Portal2 gaps.

---

## 1. Executive summary

The latest **frontend-ui-audit** (`portal-ui-audit`) run against the **public OrthodoxMetrics website** found **19 findings** with a **critical** ceiling severity and a **weighted score of 63** (lower is worse; 0 = clean).

| Severity (audit) | Remediation priority | Count |
|---|---|---:|
| Critical | **P0** | **2** |
| High | **P1** | **7** |
| Medium | **P2** | **5** |
| Low | **P3** | **5** |
| **Total** | | **19** |

**Runtime coverage:** 15 routes attempted, 0 failed. **Routes discovered:** 17 (16 active, 1 excluded: `/account/profile` as non-public).

### Overall health assessment

The public site is **functionally reachable** (no broken internal links, no runtime route failures), but **design-system and library fragmentation is severe**. Two **critical** findings (`COMP-003`, `COMP-007`) indicate the OM front-end declares and renders multiple competing stacks (MUI, Bootstrap, Tailwind, three data grids, two form libraries, etc.). Confirmed runtime issues include **19 distinct button style signatures**, **2 broken enroll images**, and measurable **a11y label gaps** on public forms.

**Portal2 implication:** None of the 19 findings map to `/portal2` routes. Shared-package consolidation (icons, tokens, grid primitives) may benefit Portal2 long-term but is **not a Portal2 blocker** from this report.

---

## 2. Methodology

Findings were extracted from on-disk audit artifacts (web UI not required):

| Source | Path |
|---|---|
| Summary | `.om-artifacts/ui-public-all-2026-07-21T02-36-58/summary.md` |
| Findings JSON | `…/json/findings.json` |
| Scores / metadata | `…/logs/run.json`, `…/json/audit.json` |
| Failed assets | `…/json/failed-assets.csv` |
| Typography | `…/json/typography-outliers.csv`, `public-website-standardization.md` |
| Navigation | `navigation-consistency.md` (80 internal checks, 0 broken) |

**Severity mapping for this plan:**

| Audit severity | Plan priority |
|---|---|
| critical | P0 |
| high | P1 |
| P2 | medium |
| low | P3 |

**Classification tags** from the report (`confirmed`, `probable`, blank) are preserved in the inventory where present.

---

## 3. Negative findings inventory

All findings below are **negative** (require remediation or explicit suppression with rationale).

| ID | Area / route | Sev. | Category | Description | Affected surface | Classification |
|---|---|---|---|---|---|---|
| `COMP-003` | Repo-wide (package deps) | **P0** | component-competition | Competing data-grid: AG Grid, MUI X Data Grid, TanStack Table | Public site SPA (`/var/www/orthodoxmetrics/prod/front-end`); indirect package impact | — |
| `COMP-007` | Repo-wide (styling stacks) | **P0** | component-competition | Cross-stack styling cluster (MUI / Bootstrap / Tailwind + 17 libraries) | Public site SPA; shared monorepo packages | — |
| `COMP-001` | Repo-wide | **P1** | component-competition | Competing component libraries: MUI, React Bootstrap | Public site SPA | — |
| `COMP-002` | Repo-wide | **P1** | component-competition | Competing CSS-in-JS: Emotion, styled-components | Public site SPA | — |
| `COMP-004` | Repo-wide | **P1** | component-competition | Competing forms: Formik, React Hook Form | Public site SPA | — |
| `COMP-006` | Repo-wide | **P1** | component-competition | Competing primitives: Headless UI, Radix UI | Public site SPA | — |
| `VIS-BUTTONS` | 15 public routes (see evidence) | **P1** | visual-inconsistency | 19 distinct button computed-style signatures (radii include 0px–16px and pill) | Public site (`/`, `/about`, `/blog`, … `/tour`) | confirmed |
| `CASCADE-001` | 1 route with mixed runtime classes | **P1** | cascade-conflict | MUI + Bootstrap class ownership on rendered pages (`om-public-header__utility-btn` on `/` et al.) | Public site header chrome | — |
| `ASSET-FAILED` | `/enroll` | **P1** | assets / functional | 2 images failed to load: `marriage-enroll-light.png`, `funeral-enroll-light.png` | Public `/enroll` | confirmed |
| `COMP-005` | Repo-wide | **P2** | component-competition | Competing icons: Lucide React, MUI Icons, Tabler Icons | Public site SPA | — |
| `VIS-FONTS` | 15 public routes | **P2** | visual-inconsistency | 6 primary font families (Cormorant Garamond, Crimson Pro, Georgia, Inter, Plus Jakarta Sans, monospace) | Public site | probable |
| `VIS-RADIUS` | 15 public routes | **P2** | visual-inconsistency | 8 distinct border-radius values on buttons/controls | Public site | probable |
| `A11Y-001` | `/`, `/blog`, `/enroll`, `/samples` | **P2** | a11y | 5/11 inputs lacked label/aria association (heuristic) | Public site forms | — |
| `A11Y-003` | Public chrome (all routes) | **P2** | a11y | 5 icon-only buttons without accessible name | Public site header/nav | — |
| `VIS-HEADINGS` | 15 public routes | **P3** | visual-inconsistency | 11 distinct heading font sizes | Public site | probable |
| `A11Y-002` | `/`, `/blog`, `/enroll`, `/samples` | **P3** | a11y | 4 images missing alt text | Public site | — |
| `TYPE-OUTLIERS` | `/`, `/support/` | **P3** | typography | 2 typography outliers vs Plus Jakarta Sans baseline (Crimson Pro, monospace) | Public site | probable |
| `SEO-H1-/samples/explorer` | `/samples/explorer` | **P3** | seo-metadata | No H1 heading | Public site | probable |
| `SEO-H1-/support/` | `/support/` | **P3** | seo-metadata | No H1 heading | Public site | probable |

**Positive signals (not findings, inform exit criteria):**

- Internal link checks: **80** checks, **0** broken (`navigation-consistency.md`)
- Runtime route failures: **0 / 15**
- Body font baseline: **Plus Jakarta Sans** on 15 sampled routes (`public-website-standardization.md`)

---

## 4. Root-cause themes

### Theme A — Monolith library competition (P0–P1)

The OM `front-end` package.json and import graph simultaneously declare **MUI, Bootstrap, Tailwind, AG Grid, MUI X Data Grid, TanStack Table, Formik, RHF, Headless UI, Radix**, etc. Findings `COMP-001` through `COMP-007` are symptoms of **no enforced ownership boundary** between public marketing pages, admin tools, and legacy portal surfaces in one SPA.

### Theme B — Unowned interactive chrome (P1–P2)

`VIS-BUTTONS`, `VIS-RADIUS`, `CASCADE-001`, and header utility buttons (`om-public-header__utility-btn`) show **multiple styling owners** fighting on the same DOM. Public header components pull class names that coexist with MUI/Bootstrap runtime signatures.

### Theme C — Public content defects (P1)

`ASSET-FAILED` is a **concrete user-visible bug** on `/enroll` — missing static images, not heuristic.

### Theme D — Accessibility gaps on public forms (P2–P3)

`A11Y-001`, `A11Y-003`, `A11Y-002` cluster around **unlabeled inputs**, **icon-only controls**, and **missing alt** on marketing/enroll/sample pages.

### Theme E — Typography / SEO polish (P2–P3)

`VIS-FONTS`, `VIS-HEADINGS`, `TYPE-OUTLIERS`, and missing H1s are **brand/display drift** and **metadata hygiene**, lower urgency but visible on SEO-sensitive pages.

---

## 5. Phased remediation plan

### Phase 0 — Triage & quick wins

**Goal:** Fix confirmed user-visible defects and establish audit baseline without architectural refactors.

| Work item | Finding IDs | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|
| Restore `/enroll` images | `ASSET-FAILED` | **S** | OM FE (public pages) | Both URLs return 200; images render in audit screenshots |
| Add `aria-label` to 5 icon-only header buttons | `A11Y-003` | **S** | OM FE (public layout) | Heuristic count → 0 on re-audit |
| Add missing `alt` on 4 images | `A11Y-002` | **S** | OM FE (content pages) | `A11Y-002` cleared |
| Label 5 unassociated inputs | `A11Y-001` | **S** | OM FE (forms on `/`, `/blog`, `/enroll`, `/samples`) | ≤1/11 unlabeled (or 0) on re-audit |
| Add H1 to `/samples/explorer` and `/support/` | `SEO-H1-*` | **S** | OM FE (content) | Each page `h1Count=1` in SEO metadata export |
| Document intentional display fonts | `TYPE-OUTLIERS`, partial `VIS-FONTS` | **S** | OM FE + design | Outliers registered in `portal-ui-audit.yaml` `intentional_variants` OR fixed to baseline |

**Dependencies:** None.  
**Estimated calendar:** 1–3 days.

---

### Phase 1 — P0 blockers (critical)

**Goal:** Establish a single ownership model for grids and styling stacks; stop new divergence.

| Work item | Finding IDs | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|
| **Grid consolidation RFC** — pick canonical grid (recommend: TanStack Table for tables, retire or isolate AG Grid / MUI X to admin-only chunks with lazy boundaries) | `COMP-003` | **L** | OM FE platform + `@om/ui` | Only one grid family in public-route bundle; `COMP-003` suppressed or downgraded with migration tracker |
| **Styling stack boundary** — define `@om/ui` + Tailwind _or_ MUI as owner for public surfaces; Bootstrap islands wrapped or removed from public layout | `COMP-007`, `CASCADE-001` | **L** | OM FE platform + `@om/tokens` | Public routes no longer emit mixed MUI+Bootstrap signatures; `COMP-007`/`CASCADE-001` cleared or intentionally suppressed with ADR |
| Add ADR: "Public website design-system owner" | `COMP-007` | **M** | OM FE lead | ADR linked from `public-website-standardization.md` successor doc |

**Dependencies:** Phase 0 complete (so enroll isn't broken while refactoring).  
**Estimated calendar:** 4–8 weeks (parallel RFC + incremental migration).

---

### Phase 2 — P1 high

**Goal:** Reduce library competition and unify interactive primitives on public routes.

| Work item | Finding IDs | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|
| Consolidate component library on public pages to `@om/ui` (+ one primitive stack) | `COMP-001`, `COMP-006` | **L** | OM FE public squad | Single component-library finding for public bundle |
| Standardize CSS-in-JS (Emotion only; remove styled-components from public paths) | `COMP-002` | **M** | OM FE | `COMP-002` cleared |
| Form library standard (React Hook Form for new; Formik migration plan for legacy) | `COMP-004` | **L** | OM FE | `COMP-004` cleared or scoped to admin-only with code-split proof |
| **Button primitive unification** — map all public CTAs to `@om/ui` Button tokens | `VIS-BUTTONS`, `VIS-RADIUS` | **M** | OM FE + `@om/ui` | ≤3 button signatures on public routes; radius from token scale |
| Refactor public header utility buttons off Bootstrap class leakage | `CASCADE-001` | **M** | OM FE (layout) | 0 routes with mixed MUI+Bootstrap runtime classes |

**Dependencies:** Phase 1 ADR and grid/stack boundary.  
**Estimated calendar:** 6–10 weeks.

---

### Phase 3 — P2 medium

**Goal:** Visual consistency and icon consolidation.

| Work item | Finding IDs | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|
| Icon library consolidation (recommend Lucide or `@om/icons` when ready) | `COMP-005` | **M** | OM FE + `@om/icons` package | Single icon import path in public bundle |
| Typography token enforcement — body UI font Plus Jakarta Sans; display fonts whitelisted | `VIS-FONTS`, `TYPE-OUTLIERS` | **M** | OM FE + design | ≤2 primary UI font families (body + one display) on public routes |
| Heading scale alignment to theme type ramp | `VIS-HEADINGS` | **M** | OM FE + `@om/tokens` | ≤5 distinct heading sizes |

**Dependencies:** Phase 2 button/header work (shared token pipeline).  
**Estimated calendar:** 3–5 weeks.

---

### Phase 4 — P3 polish / debt

**Goal:** Close remaining low-severity findings and prevent regression.

| Work item | Finding IDs | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|
| SEO/metadata sweep beyond H1 (title/description consistency) | `SEO-H1-*` (extend) | **S** | OM FE + content | All public routes pass SEO rule set |
| Audit suppression hygiene — document intentional dual-stack areas (admin, legacy `/portal` until Wave K) | All COMP-* in admin-only | **M** | OM FE platform | `intentional_variants` in `portal-ui-audit.yaml` with owner + sunset date |
| CI gate: fail on `critical`/`high` for `--preset quick-public` | — | **M** | Platform ops | PR checks run `portal-ui-audit all --preset quick-public --fail-on high` |

**Dependencies:** Phases 1–3 substantially complete.  
**Estimated calendar:** 2–4 weeks ongoing.

---

### Phase summary

| Phase | Focus | Finding count addressed | Dominant owner |
|---|---|---:|---|
| 0 | Triage / quick wins | 7 IDs (assets, a11y, SEO) | OM FE |
| 1 | P0 blockers | 2 critical (+ cascade) | OM FE platform + packages |
| 2 | P1 high | 7 high | OM FE + `@om/ui` |
| 3 | P2 medium | 5 medium | OM FE + design tokens |
| 4 | P3 polish | 5 low + CI | OM FE + platform ops |

**Portal2 team:** Monitor only. No Portal2 work items from this report unless OM package consolidation changes `@om/ui` APIs (coordinate via [ENDUSER checklist](./ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md)).

---

## 6. Cross-links to existing program docs

| Document | Relevance to this audit |
|---|---|
| [PORTAL2-GAP-ASSESSMENT-2026-07-19.md](./PORTAL2-GAP-ASSESSMENT-2026-07-19.md) | Portal2 parity tracker — **orthogonal** to this public-site audit; deferred item "public `/enroll`" is OM public product, not Portal2 |
| [PORTAL2-HANDOFF-CHECKPOINT-2026-07-19.md](./PORTAL2-HANDOFF-CHECKPOINT-2026-07-19.md) | Portal2 uses Mantine + `@om/ui` single stack — **contrast** with COMP-* findings in OM monolith |
| [ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md](./ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md) | Explicit: public enroll **out of Customer Portal scope**; package consolidation informs long-term COMP-* fixes |
| [AUTH-PILOT-CHECKLIST.md](./AUTH-PILOT-CHECKLIST.md) | Auth pilot on `/portal2` — not covered by this public preset |
| [BLUEPRINT-VISUAL-QA.md](./BLUEPRINT-VISUAL-QA.md) | Portal2 visual QA — separate from public marketing site |
| `prod/scripts/portal-ui-audit/README.md` | Tool usage, config, intentional variant suppression |
| Artifact `public-website-standardization.md` | Typography baseline for public scope (Plus Jakarta Sans body) |

---

## 7. Verification plan

### Re-run commands

From `/var/www/orthodoxmetrics/prod/scripts/portal-ui-audit/`:

```bash
# Full public audit (same as this report)
portal-ui-audit all --preset full-public \
  --project-root /var/www/orthodoxmetrics/prod/front-end \
  --base-url https://orthodoxmetrics.com/ \
  --output ./.om-artifacts/ui-public-all-$(date -u +%Y-%m-%dT%H-%M-%S)

# Fast PR gate (recommended post-Phase 0)
portal-ui-audit all --preset quick-public \
  --base-url https://orthodoxmetrics.com/ \
  --fail-on high
```

**Developer Tools UI:** `https://orthodoxmetrics.com/devel-tools/portal-ui-audit` → select artifact run → review `summary.md`, `report.html`, findings export.

### Exit criteria by phase

| Milestone | Target metrics |
|---|---|
| Phase 0 complete | `ASSET-FAILED`, `A11Y-002`, `A11Y-003`, both `SEO-H1-*` **cleared**; weighted score ≥ 70 |
| Phase 1 complete | **0 critical** findings; `CASCADE-001` cleared on public routes |
| Phase 2 complete | **0 high** on `--preset quick-public`; `VIS-BUTTONS` ≤ 3 signatures |
| Phase 3 complete | **0 medium** on public preset; font families ≤ 2 UI + whitelisted display |
| Phase 4 / steady state | Weighted score ≥ 85; CI `--fail-on high` green on main |

### Portal2-specific audit (future, out of scope here)

When Portal2 needs its own UI audit:

```bash
portal-ui-audit all --scope portal \
  --project-root /var/www/workspaces/om-customer-portal \
  --base-url https://orthodoxmetrics.com/portal2/ \
  --route-prefix /portal2
```

---

## 8. Risks & out of scope

### Risks

| Risk | Mitigation |
|---|---|
| Grid/library consolidation breaks admin or `/portal` surfaces | Code-split by route scope; migrate public pages first; feature-flag bundle boundaries |
| Bootstrap removal breaks legacy account hub pages | Keep Bootstrap in admin/account chunks until Wave K; scope audit suppressions with sunset dates |
| `@om/ui` gaps block button/form unification | Track package gaps in ENDUSER checklist; temporary OM FE wrappers allowed per operator ADR |
| Display/hero fonts flagged as drift | Register Cinzel/Cormorant as intentional display variants in audit config |

### Out of scope (this plan)

- **Portal2** (`/portal2`) feature gaps — see PORTAL2-GAP-ASSESSMENT
- **Legacy `/portal`** sacramental editors, OCR studio, Wave K cutover
- **Authenticated `/account/*`** routes (excluded from public preset)
- **Performance profiling** (no perf findings in this report)
- **Console error rules** (no console-category findings in this report)
- **Broken links** — audit reported 0 broken (no remediation needed)

---

## Appendix A — Top P0 findings (complete list)

Only **2 critical (P0)** findings exist in this report:

1. **`COMP-003`** — Three competing data-grid implementations (AG Grid, MUI X Data Grid, TanStack Table).
2. **`COMP-007`** — Cross-stack styling cluster across MUI, Bootstrap, Tailwind, and 17 declared libraries.

## Appendix B — Highest-impact P1 items (for prioritization after P0)

1. **`ASSET-FAILED`** — Broken enroll images (user-visible, fix in Phase 0).
2. **`VIS-BUTTONS`** — 19 button style signatures (confirmed runtime inconsistency).
3. **`CASCADE-001`** — Mixed MUI/Bootstrap on public header.
4. **`COMP-001`** — Dual full component libraries (MUI + React Bootstrap).
5. **`COMP-004`** — Dual form libraries (Formik + React Hook Form).

---

*Document generated from audit artifact `ui-public-all-2026-07-21T02-36-58`. Counts: critical 2, high 7, medium 5, low 5, total 19, weighted score 63.*
