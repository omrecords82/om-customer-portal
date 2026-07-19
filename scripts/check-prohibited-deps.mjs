#!/usr/bin/env node
/**
 * Fail if prohibited UI libraries appear in package manifests or source imports.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const prohibitedNameFragments = [
  "@mui/",
  "@emotion/",
  "@radix-ui/",
  "tailwindcss",
  "bootstrap",
  "@chakra-ui/",
  "antd",
  "ant-design",
  "shadcn",
];

const prohibitedImportPatterns = [
  /from\s+['"]@mui\//,
  /from\s+['"]@emotion\//,
  /from\s+['"]@radix-ui\//,
  /from\s+['"]tailwindcss['"]/,
  /from\s+['"]bootstrap['"]/,
  /from\s+['"]@chakra-ui\//,
  /from\s+['"]antd['"]/,
  /from\s+['"]ant-design/,
  /from\s+['"]shadcn/,
  /orthodoxmetrics\/prod\/front-end/,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name)) out.push(full);
  }
  return out;
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const depHits = Object.keys(deps).filter((name) =>
  prohibitedNameFragments.some((frag) => name.includes(frag)),
);

if (depHits.length > 0) {
  console.error("Prohibited dependencies in package.json:\n" + depHits.join("\n"));
  process.exit(1);
}

const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
for (const frag of prohibitedNameFragments) {
  if (lock.includes(frag)) {
    console.error(`Prohibited fragment "${frag}" found in pnpm-lock.yaml`);
    process.exit(1);
  }
}

const files = walk(join(root, "src"));
const importHits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const pattern of prohibitedImportPatterns) {
    if (pattern.test(text)) {
      importHits.push(`${relative(root, file)} matches ${pattern}`);
    }
  }
}

if (importHits.length > 0) {
  console.error("Prohibited imports:\n" + importHits.join("\n"));
  process.exit(1);
}

console.log("validate:deps OK — no prohibited UI libraries detected.");
