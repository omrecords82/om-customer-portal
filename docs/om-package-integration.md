# OM package integration — Customer Portal

## Packages consumed

| Import alias | Published package | Version |
| --- | --- | --- |
| `@om/contracts` | `@omrecords82/contracts` | `0.1.0` |
| `@om/tokens` | `@omrecords82/tokens` | `0.1.0` |
| `@om/ui` | `@omrecords82/ui` | `0.1.0` |

Registry: `https://npm.pkg.github.com` via npm aliases (Option B). Auth uses `NODE_AUTH_TOKEN` in the user/CI `~/.npmrc` (pnpm does not expand auth tokens from project-level `.npmrc`).

## Global CSS import order

Defined in `src/app/App.tsx`:

1. `@mantine/core/styles.css`
2. `@om/tokens/css`
3. `src/styles/brand-bridge.css` (`@layer om.brand` — OM navy/gold bridge)
4. `@om/tokens/css/liturgical` (`@layer om.liturgical` — calendar accent hooks; mostly reserved in `@om/tokens@0.1.0`)
5. `@om/tokens/css/accessibility` (`@layer om.accessibility` — contrast/motion/focus token hooks + `forced-colors` focus vars)
6. `@om/ui/css`
7. Portal overrides (`../styles/portal.css`)
8. Portal a11y utilities (`src/styles/a11y.css` via `main.tsx` — `@layer om.accessibility` skip link + unlayered `forced-colors` shell focus)

`OmThemeSync` mirrors Mantine light/dark onto `document.documentElement.dataset.omTheme` so `@om/tokens` `[data-om-theme]` selectors resolve.

## Ownership model

| Concern | Owner |
| --- | --- |
| Shared visual tokens | `@om/tokens` |
| Shared interactive controls | `@om/ui` |
| Shared TypeScript contracts | `@om/contracts` |
| Shell layout, surfaces, spacing, typography, responsive composition | Mantine |
| Portal-brand chrome (navy/gold sidebar, display fonts) | `brand-bridge.css` + Mantine until `@om/tokens` brand-pack ships |
| Direct React Aria Components | Only where `@om/ui` lacks a required capability |

## Migrated to `@om/ui`

| Surface | From | To |
| --- | --- | --- |
| Home primary / ghost actions | `react-aria-components` `Button` | `@om/ui/button` |
| Header burger + color-scheme toggles | `react-aria-components` `Button` | `@om/ui/icon-button` |

Portal CSS class overrides keep the previous navy / quiet chrome look on top of OM defaults.

## Remaining direct `react-aria-components` imports

| File | Imports | Why retained |
| --- | --- | --- |
| `src/shell/PortalShell.tsx` | `RouterProvider` | `@om/ui` has no router adapter; required for SPA-relative `href` navigation under `/portal2`. |
| `src/shell/Sidebar.tsx` | `Link` | `@om/ui/link` has no `onPress` (mobile drawer close) or `aria-current` public props. |
| `src/shell/TopHeader.tsx` | `Button`, `MenuTrigger`, `Menu`, `MenuItem`, `Popover`, `Separator` | Account menu needs a custom composite trigger (avatar + name + chevron) and **item icons**. `@om/ui` `Menu` is data-driven with string labels only and no item icon slot. |

## Missing `@om/ui` capabilities (discovered)

- Router-aware provider / adapter for basename-aware in-app navigation
- `Link` press callback and `aria-current` support for navigational chrome
- `Menu` item icons / rich item content (beyond label + description strings)
- Flexible menu trigger beyond Button/IconButton clones that preserve composite headers

## Token mappings completed

| Portal usage | OM token |
| --- | --- |
| Mantine `spacing.md` | `--om-primitive-space-4` |
| Mantine `radius.sm` | `--om-primitive-radius-2` |
| Focus rings (header/sidebar/ghost/primary CTA) | `--om-semantic-focus-ring` → `--om-brand-gold-5` in `@layer om.brand` |
| Borders (ghost button, menu popover/sep, header divider) | `--om-semantic-border-decorative` (fallback to Mantine border) |
| Sidebar active indicator / accent | `--om-component-navigation-active-indicator` → `--om-brand-gold-5` |
| Header avatar accent | `--om-component-header-accent` → `--om-brand-gold-5` |
| Primary CTA navy background | `--om-brand-navy-7` / `--om-brand-navy-8` (Mantine-sourced bridge aliases) |
| Sidebar surfaces (`--om-sidebar-*`) | Portal bridge vars in `brand-bridge.css`; cutover when navigation shell tokens ship |

## Wave J brand bridge (`src/styles/brand-bridge.css`)

Partial GAP-BRAND-TOKENS cutover (2026-07-19): published component/semantic tokens are overridden in `@layer om.brand` to OM gold focus/accent without adopting bootstrap red `--om-semantic-action-accent`. Navy/gold primitives and sidebar rgba surfaces remain Mantine-sourced bridge aliases until `@om/tokens` publishes brand-pack + navigation shell semantics.

Inventory helper: `src/theme/brandTokens.ts` (`BRIDGED_OM_TOKEN_PATHS`, `DEFERRED_BRAND_CSS_VARS`).

## Wave J liturgical + accessibility layers

Wired (2026-07-19): `@om/tokens/css/liturgical` and `@om/tokens/css/accessibility` import after `brand-bridge.css` so `@layer` order stays `om.brand` → `om.liturgical` → `om.accessibility`. Package `@om/tokens@0.1.0` exports are mostly Phase 1B placeholders; active rules today:

| Layer | Active in package | Portal usage |
| --- | --- | --- |
| `om.liturgical` | `[data-om-liturgical-color="red"]` sets header accent | No calendar surfaces yet — wiring only; liturgical calendar is POST-MVP (Wave G) |
| `om.accessibility` | `[data-om-focus-visibility="enhanced"]`, `@media (forced-colors)` focus vars | `a11y.css` composes skip-link (`:focus-visible`) + shell `forced-colors` focus using `--om-accessibility-focus-enhanced-width` / `--om-semantic-focus-ring`; `useDocumentTitle` + `resolvePageTitle` sync tab titles |

Deferred until tokens publish Phase 1B output: `[data-om-contrast]`, `[data-om-motion]`, `[data-om-text-scale]`, non-red liturgical colors, `prefers-contrast: more` root vars.

## Portal-local values not yet mappable

| Value | Reason |
| --- | --- |
| Navy / gold primitive scales (`--om-brand-navy-*`, `--om-brand-gold-*`) | No published navy/gold primitives in `@om/tokens@0.1.0`; bridge aliases Mantine tuples |
| Sidebar rgba surfaces (`--om-sidebar-border`, `--om-sidebar-text*`) | No navigation shell / sidebar token family yet |
| Inter / Crimson Pro / JetBrains Mono | Tokens only expose `system-ui` sans primitive |
| Soft elevation shadows (`mantine-shadow-*`) | Tokens currently expose `--om-primitive-shadow-none` only |
| Primary semantic action accent (`--om-semantic-action-accent`) | Bootstrap red in package; portal shell CSS owns navy CTAs instead |

## Follow-ups for `om-packages` (out of scope here)

1. Brand navy/gold + sidebar semantic tokens
2. `Link` `onPress` / `aria-current` (or nav-item variant)
3. `Menu` item leading icons / custom trigger composition helper
4. Optional React Router adapter for basename-aware links
