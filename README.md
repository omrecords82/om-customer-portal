# Orthodox Metrics Customer Portal

Greenfield parish end-user UI. Source of truth for the new portal experience; legacy `/portal` SPA remains in parallel during cutover.

## Requirements

- Node `24.18.0` (see `.nvmrc`) — engines: `>=24.18.0 <25`
- pnpm `11.10.0` via Corepack
- GitHub Packages token with `read:packages` for `@omrecords82/*`

```bash
export NODE_AUTH_TOKEN=<pat-with-read:packages>
# pnpm expands auth from ~/.npmrc (not project .npmrc):
echo '@omrecords82:registry=https://npm.pkg.github.com' >> ~/.npmrc
echo "//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}" >> ~/.npmrc

corepack enable
corepack prepare pnpm@11.10.0 --activate
pnpm install
```

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc -b` |
| `pnpm test` | Vitest |
| `pnpm validate:deps` | Fail on prohibited UI libs |
| `pnpm validate:auth-pilot` | Auth pilot env dry-run (no API calls) |
| `pnpm build` | Production build |
| `pnpm deploy:static` | Build `/portal2` + rsync to deploy dir |

## Base path & deploy

Preview URL: `https://orthodoxmetrics.com/portal2/`  
Static output directory: `/var/www/orthodoxmetrics/portal`  
Default env: `VITE_PORTAL_BASE_PATH=/portal2` (see `.env.example`)

```bash
pnpm deploy:static
# or:
VITE_PORTAL_BASE_PATH=/portal2 ./scripts/deploy-static.sh
```

## Auth modes (Wave B)

| Env | Default | Meaning |
| --- | --- | --- |
| `VITE_PORTAL_AUTH_MODE` | `mock` | Local session for `/portal2` pilots |
| `VITE_PORTAL_REQUIRE_AUTH` | `false` | When `true`, shell routes redirect to `/auth/login` |

Live mode posts to OM `/api/auth/oidc/orthodoxmetrics/credentials` and checks `/api/auth/check`. Do **not** flip global login from `/portal` to `/portal2` without an explicit cutover decision.

Per-tenant pilot enablement runbook: `docs/AUTH-PILOT-CHECKLIST.md` · env dry-run: `pnpm validate:auth-pilot`

### Records editor dual-run (Wave H prep)

| Env | Default | Meaning |
| --- | --- | --- |
| `VITE_PORTAL_RECORDS_EDITOR_BAPTISM` | `false` | Enable baptism editor dual-run when UI ships |
| `VITE_PORTAL_RECORDS_EDITOR_MARRIAGE` | `false` | Enable marriage editor dual-run when UI ships |
| `VITE_PORTAL_RECORDS_EDITOR_FUNERAL` | `false` | Enable funeral editor dual-run when UI ships |

Enable **at most one** type during pilot (Baptism first). See `docs/WAVE-H-RECORDS-GATES.md` and `recordsEditorFlags.ts`.

Routes: `/portal2/auth/login`, `/auth/forgot-password`, `/auth/unauthorized`, `/account`.

## Stack ownership

- **Mantine** — layout, surfaces, spacing, typography, responsive shell
- **`@om/ui` / `@om/tokens` / `@om/contracts`** — shared controls & tokens (GitHub Packages)
- **React Aria Components** — only where `@om/ui` lacks a required capability (ESLint allowlist)

See `docs/om-package-integration.md` and `docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md`.
