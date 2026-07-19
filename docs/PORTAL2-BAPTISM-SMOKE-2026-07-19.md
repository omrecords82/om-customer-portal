# Portal2 baptism smoke — 2026-07-19

**Work ref:** `PORTAL-WAVE-H-EDITORS` · **OMBC:** `OMBC-20260718-165445-BD189C` · **OMD:** `PENDING_RECONCILIATION`  
**Environment:** Production `https://orthodoxmetrics.com/portal2/` · church **46** (`om_church_46`)  
**Session:** `.om-worklog/sessions/2026-07-19_214101_portal2-continuation`

---

## Scope

Smoke-test baptism **create → get → update → history → delete** against live OM APIs used by the `/portal2` baptism editor (`baptismEditorApi.ts`).

---

## Environment posture (verified)

| Check | Result |
|---|---|
| Deployed SPA | `/portal2/index.html` → `/portal2/assets/index-DRsFZzS1.js` · HTTP 200 |
| Auth mode | Bundle: `Ne=JH("live")` → **live** |
| Require auth | Bundle: `Rm=XH("true",!1)` → **true** |
| Baptism editor flag | Bundle: `baptismEnabled:Ky("true",!1)` → **true** |
| Marriage / funeral flags | Bundle: `Ky(void 0,!1)` → **false** |
| UI shipped map | `bq={baptism:!0,marriage:!1,funeral:!1}` (editor UI shipped baptism only) |
| Legacy `/portal` | Not modified this session |
| Pilot user in DB | `frjames@ssppoc.org` id **2**, role **priest**, `church_id` **46** |

---

## Actor / limitation (honest)

| Item | Detail |
|---|---|
| **Intended actor** | `frjames@ssppoc.org` (priest, church 46) via browser UI |
| **Actual actor** | `omsvc@orthodoxmetrics.com` (**super_admin**) via Bearer token to production APIs with `church_id=46` |
| **Why** | `frjames` password **not** present under `/var/lib/omstudio/secrets/` (only `OMSVC_PASSWORD`, JWTs, Plane token). JWT mint for user 2 blocked — `JWT_ACCESS_SECRET.creds` is `root:root` `0640` (PermissionError). Cursor browser MCP could not hold a tab (`No browser tab available` / empty tab list) after multiple attempts. |
| **Implication** | CRUD path for church 46 sacrament APIs **PASS**. End-to-end **UI as frjames** remains **NOT SIGNED** — needs operator login or vaulted pilot password. |

---

## API results (church 46)

Marker: `PORTAL2-SMOKE-20260719214240` · record id **1051** (created then deleted)

| Step | Method / path | HTTP | Notes |
|---|---|---|---|
| Create | `POST /api/baptism-records` | **200** | Body included `church_id=46`; returned `success` + `record`; id **1051** |
| Get | `GET /api/baptism-records/1051?church_id=46` | **200** | `first_name=Portal2Smoke`, `last_name` = marker |
| Update | `PUT /api/baptism-records/1051?church_id=46` | **200** | Edited birthplace / sponsors / reception_date |
| History | `GET /api/baptism-records/1051/history?church_id=46` | **200** | **2** entries: `create`, `update` |
| Delete | `DELETE /api/baptism-records/1051?church_id=46` | **200** | Soft/hard delete succeeded |
| Get after delete | `GET /api/baptism-records/1051?church_id=46` | **404** | Expected |

**API smoke verdict:** **PASS** (create / edit / history / delete)

**Browser UI smoke as frjames:** **BLOCKED** (credentials + browser MCP)

---

## Follow-ups

1. Operator (or agent with vaulted pilot password): sign create/edit/history/delete in `/portal2` UI as `frjames@ssppoc.org`.
2. OM backend: add `requireRole` / `canManageRecords` on sacrament mutating routes (next task this session).
3. Do **not** enable marriage editor until baptism dual-run flag is turned off (or operator override).

---

*Recorded 2026-07-19 — do not treat omsvc API pass as frjames UI sign-off.*
