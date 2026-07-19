#!/usr/bin/env node
/**
 * Auth pilot dry-run — inspect build/env flags and print operator verification steps.
 * Does NOT call OM APIs or invent tenant/church IDs.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;

const PILOT_ENV_KEYS = [
  "VITE_PORTAL_BASE_PATH",
  "VITE_PORTAL_AUTH_MODE",
  "VITE_PORTAL_REQUIRE_AUTH",
];

const RELATED_ENV_KEYS = [
  "VITE_PORTAL_RECORDS_EDITOR_BAPTISM",
  "VITE_PORTAL_RECORDS_EDITOR_MARRIAGE",
  "VITE_PORTAL_RECORDS_EDITOR_FUNERAL",
  "VITE_CEMETERY_ENABLED",
];

const MANUAL_CHECKS = [
  "Login with an allowlisted pilot user",
  "Logout clears session and returns to /auth/login when requireAuth=true",
  "Expired session redirects to login (wait or revoke session server-side)",
  "Unauthorized role lands on /auth/unauthorized when applicable",
  "GET /api/me (via Account page) shows user id, email, role",
  "Session churchId > 0 on Account diagnostics card",
  "Parish chrome loads from GET /api/my/church-settings (live source)",
  "Role-gated nav items match pilot user role",
  "CSRF: mutating API calls succeed after login (profile save smoke test)",
  "Deep link: /portal2/records?type=baptism while logged out → login?next= → restores path",
  "Production error logging observed for one intentional 403/404 (optional)",
  "Rollback rehearsed: revert env to mock / REQUIRE_AUTH=false, redeploy",
];

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function mergeEnvLayers() {
  const layers = [
    join(root, ".env.example"),
    join(root, ".env"),
    join(root, ".env.local"),
    join(root, ".env.production"),
    join(root, ".env.production.local"),
  ];
  const merged = {};
  for (const file of layers) {
    Object.assign(merged, parseEnvFile(file));
  }
  for (const key of [...PILOT_ENV_KEYS, ...RELATED_ENV_KEYS]) {
    if (process.env[key] !== undefined) merged[key] = process.env[key];
  }
  return { merged, layers: layers.filter((f) => existsSync(f)) };
}

function readAuthMode(value) {
  return typeof value === "string" && value.trim().toLowerCase() === "live"
    ? "live"
    : "mock";
}

function readBool(value, fallback) {
  if (typeof value !== "string") return fallback;
  const n = value.trim().toLowerCase();
  if (["1", "true", "yes"].includes(n)) return true;
  if (["0", "false", "no"].includes(n)) return false;
  return fallback;
}

function flagLine(key, value, fallback) {
  const display = value ?? `(unset → default ${fallback})`;
  return `  ${key}=${display}`;
}

function countEnabledEditors(env) {
  const keys = [
    "VITE_PORTAL_RECORDS_EDITOR_BAPTISM",
    "VITE_PORTAL_RECORDS_EDITOR_MARRIAGE",
    "VITE_PORTAL_RECORDS_EDITOR_FUNERAL",
  ];
  return keys.filter((k) => readBool(env[k], false)).length;
}

function main() {
  const { merged, layers } = mergeEnvLayers();
  const authMode = readAuthMode(merged.VITE_PORTAL_AUTH_MODE);
  const requireAuth = readBool(merged.VITE_PORTAL_REQUIRE_AUTH, false);
  const basePath = merged.VITE_PORTAL_BASE_PATH ?? "/portal2";
  const editorCount = countEnabledEditors(merged);

  console.log("Auth pilot dry-run (no API calls)\n");
  console.log("Env layers read:");
  for (const file of layers) console.log(`  - ${file}`);
  if (layers.length === 0) console.log("  (none — using defaults + process.env only)");
  console.log("");

  console.log("Effective pilot flags:");
  console.log(flagLine("VITE_PORTAL_BASE_PATH", merged.VITE_PORTAL_BASE_PATH, "/portal2"));
  console.log(flagLine("VITE_PORTAL_AUTH_MODE", merged.VITE_PORTAL_AUTH_MODE, "mock"));
  console.log(
    flagLine("VITE_PORTAL_REQUIRE_AUTH", merged.VITE_PORTAL_REQUIRE_AUTH, "false"),
  );
  console.log("");

  const warnings = [];
  const notes = [];

  if (authMode === "live" && requireAuth) {
    notes.push(
      "Live + requireAuth detected — ensure this deploy targets internal users or an explicitly allowlisted pilot tenant only.",
    );
  } else if (authMode === "live" && !requireAuth) {
    notes.push(
      "Live auth without requireAuth: session APIs active but shell routes stay open to anonymous preview.",
    );
  } else {
    notes.push("Default mock/preview posture — safe for general /portal2 traffic.");
  }

  if (authMode === "live" && basePath !== "/portal2") {
    warnings.push(
      `VITE_PORTAL_BASE_PATH=${basePath} — confirm deploy path matches operator pilot URL plan.`,
    );
  }

  if (editorCount > 1) {
    warnings.push(
      `${editorCount} records editor flags enabled — pilot policy allows at most one (Baptism first). See docs/WAVE-H-RECORDS-GATES.md`,
    );
  }

  if (notes.length) {
    console.log("Assessment:");
    for (const note of notes) console.log(`  • ${note}`);
    console.log("");
  }

  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    console.log("");
  }

  console.log("Per-tenant enablement (operator fills evidence in docs/AUTH-PILOT-CHECKLIST.md):");
  console.log("  Allowlist entry:     <tenant-slug> / <church-id> — do not commit real IDs until verified");
  console.log("  Deploy env scope:    per-tenant build or env injection per operator runbook");
  console.log("  Evidence owner:      <operator-name>");
  console.log("  Verification date:   YYYY-MM-DD");
  console.log("");

  console.log("Manual verification checklist (after enablement for one tenant):");
  for (const [i, step] of MANUAL_CHECKS.entries()) {
    console.log(`  ${String(i + 1).padStart(2, "0")}. [ ] ${step}`);
  }
  console.log("");

  console.log("Automated unit evidence (Wave B — not a substitute for per-tenant enablement):");
  console.log("  pnpm test -- src/auth/safeNext.test.ts src/auth/RequireAuth.test.tsx");
  console.log("  pnpm test -- src/auth/apiFetch.test.ts src/features/records/recordsDeepLink.test.ts");
  console.log("");

  console.log("Next steps:");
  console.log("  1. Record allowlist + verification rows in docs/AUTH-PILOT-CHECKLIST.md");
  console.log("  2. Apply live flags only for the target pilot deploy (never global /portal cutover)");
  console.log("  3. Run manual checklist with a real pilot user; attach notes/screenshots to evidence table");
  console.log("  4. Rollback: VITE_PORTAL_AUTH_MODE=mock, VITE_PORTAL_REQUIRE_AUTH=false, pnpm deploy:static");
  console.log("");

  process.exit(warnings.length > 0 ? 1 : 0);
}

main();
