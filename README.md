# ⛔ ARCHIVED / STOPPED — Portal2 removed from production (2026-07-21)

**Operator decision:** Portal2 (`/portal2`) is **no longer served** on Orthodox Metrics production. Do **not** run `pnpm deploy:static` or `./scripts/deploy-static.sh` against OM prod.

| Item | Status |
| --- | --- |
| Production URL `/portal2` | **Removed** — nginx returns 404 |
| Static deploy dir `/var/www/orthodoxmetrics/portal` | **Cleared** — archive at `prod/tmp/portal2-archive-20260721/` |
| Legacy parish portal `/portal` | **Unchanged** — OM front-end SPA |
| Baptism dual-run on `/portal2` | **Stopped** — no redeploy wiring |
| This git repo | **Historical source only** — abandoned for prod cutover |

See `docs/PORTAL2-REMOVED-2026-07-21.md` (if present) and `/var/www/orthodoxmetrics/prod/docs/PORTAL2-REMOVED-2026-07-21.md`.

---

# Orthodox Metrics Customer Portal (historical)

Greenfield parish end-user UI. **Was** a parallel preview at `/portal2`; legacy `/portal` SPA remains the production parish portal.

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
| `pnpm dev` | Vite dev server (local only) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc -b` |
| `pnpm test` | Vitest |
| `pnpm validate:deps` | Fail on prohibited UI libs |
| `pnpm validate:auth-pilot` | Auth pilot env dry-run (no API calls) |
| `pnpm build` | Production build |
| ~~`pnpm deploy:static`~~ | **DISABLED for prod** — script exits with error |

## Base path & deploy (historical)

~~Preview URL: `https://orthodoxmetrics.com/portal2/`~~  
~~Static output directory: `/var/www/orthodoxmetrics/portal`~~  
Default env: `VITE_PORTAL_BASE_PATH=/portal2` (see `.env.example`) — local dev only.

**Do not deploy to production.** `scripts/deploy-static.sh` refuses to run unless `PORTAL2_DEPLOY_OVERRIDE=I_UNDERSTAND_ARCHIVED` is set (emergency archive recovery only).

## Auth modes (Wave B)

| Env | Default | Meaning |
| --- | --- | --- |
| `VITE_PORTAL_AUTH_MODE` | `mock` | Local session for dev |
| `VITE_PORTAL_REQUIRE_AUTH` | `false` | When `true`, shell routes redirect to `/auth/login` |

Live mode posts to OM `/api/auth/oidc/orthodoxmetrics/credentials` and checks `/api/auth/check`. Production auth pilot on `/portal2` is **stopped**.

### Records editor dual-run (Wave H — stopped)

Dual-run env flags (`VITE_PORTAL_RECORDS_EDITOR_*`) are **not deployed** to production. Legacy `/portal` editors remain source of truth.

See `docs/WAVE-H-RECORDS-GATES.md` and `recordsEditorFlags.ts` for historical design.

## Stack ownership

- **Mantine** — layout, surfaces, spacing, typography, responsive shell
- **`@om/ui` / `@om/tokens` / `@om/contracts`** — shared controls & tokens (GitHub Packages)
- **React Aria Components** — only where `@om/ui` lacks a required capability (ESLint allowlist)

See `docs/om-package-integration.md` and `docs/ENDUSER-OM-PACKAGES-MIGRATION-CHECKLIST.md`.
