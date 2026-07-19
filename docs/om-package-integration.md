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
3. `@om/ui/css`
4. Portal overrides (`../styles/portal.css`)

`OmThemeSync` mirrors Mantine light/dark onto `document.documentElement.dataset.omTheme` so `@om/tokens` `[data-om-theme]` selectors resolve.

## Ownership model

| Concern | Owner |
| --- | --- |
| Shared visual tokens | `@om/tokens` |
| Shared interactive controls | `@om/ui` |
| Shared TypeScript contracts | `@om/contracts` |
| Shell layout, surfaces, spacing, typography, responsive composition | Mantine |
| Portal-brand chrome (navy/gold sidebar, display fonts) | Portal-local until OM tokens exist |
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
| Focus rings (header/sidebar/ghost) | `--om-semantic-focus-ring` (fallback to prior Mantine/portal values) |
| Borders (ghost button, menu popover/sep, header divider) | `--om-semantic-border-decorative` (fallback to Mantine border) |

## Portal-local values not yet mappable

| Value | Reason |
| --- | --- |
| Navy / gold Mantine color tuples | No `--om-*-navy` / brand gold palette in published tokens |
| Sidebar CSS vars (`--om-sidebar-*`) | No sidebar/nav surface token family yet |
| Inter / Crimson Pro / JetBrains Mono | Tokens only expose `system-ui` sans primitive |
| Soft elevation shadows (`mantine-shadow-*`) | Tokens currently expose `--om-primitive-shadow-none` only |
| Primary CTA navy/gold focus styling | OM primary action accent is bootstrap red, overridden by Portal CSS |

## Follow-ups for `om-packages` (out of scope here)

1. Brand navy/gold + sidebar semantic tokens
2. `Link` `onPress` / `aria-current` (or nav-item variant)
3. `Menu` item leading icons / custom trigger composition helper
4. Optional React Router adapter for basename-aware links
