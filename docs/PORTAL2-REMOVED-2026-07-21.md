# Portal2 removed from production (2026-07-21)

> **STOPPED / REMOVED** — see canonical doc in OM prod: `docs/PORTAL2-REMOVED-2026-07-21.md`  
> Operator copy (gitignored): `/var/www/orthodoxmetrics/prod/tmp/PORTAL2-REMOVED-2026-07-21.md`

**Decision date:** 2026-07-21

- `/portal2` returns **404** on production
- Static deploy dir cleared; archive at `prod/tmp/portal2-archive-20260721/`
- `om-customer-portal` deploy script **disabled**
- Legacy `/portal` **unchanged**
- Baptism dual-run on Portal2 **stopped**

This handoff checkpoint (`PORTAL2-HANDOFF-CHECKPOINT-2026-07-19.md`) is **historical only**.
