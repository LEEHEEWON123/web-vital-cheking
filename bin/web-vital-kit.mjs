#!/usr/bin/env node
/**
 * web-vital-kit CLI
 * Next.js App Router 프로젝트에 Web Vitals 수집·대시보드·Lighthouse 도구를 자동 구축합니다.
 *
 * Usage:
 *   npx web-vital-kit init
 *   npx web-vital-kit init --cwd ./my-next-app
 *   npx web-vital-kit init --dry-run
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "..");
const TEMPLATE_ROOT = path.join(KIT_ROOT, "templates", "nextjs-app-router");

const ROUTE_PREFIX = "/web-vital";
const INITIALIZER_IMPORT =
  'import { WebVitalsInitializer } from "./web-vital/WebVitalsInitializer";';
const INITIALIZER_COMPONENT = "<WebVitalsInitializer />";

function parseArgs(argv) {
  const args = { command: null, cwd: process.cwd(), dryRun: false, force: false };
  const rest = [...argv];
  if (rest.length > 0 && !rest[0].startsWith("-")) {
    args.command = rest.shift();
  }
  while (rest.length > 0) {
    const a = rest.shift();
    if (a === "--cwd" && rest[0]) args.cwd = path.resolve(rest.shift());
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function log(msg) {
  console.log(`[web-vital-kit] ${msg}`);
}

function warn(msg) {
  console.warn(`[web-vital-kit] ⚠ ${msg}`);
}

function fail(msg) {
  console.error(`[web-vital-kit] ✗ ${msg}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function detectAppDir(projectRoot) {
  const srcApp = path.join(projectRoot, "src", "app");
  const app = path.join(projectRoot, "app");
  if (existsSync(srcApp)) return { appDir: srcApp, relativeApp: "src/app", usesSrc: true };
  if (existsSync(app)) return { appDir: app, relativeApp: "app", usesSrc: false };
  return null;
}

function copyDirRecursive(src, dest, dryRun) {
  if (!existsSync(src)) return;
  if (!dryRun) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath, dryRun);
    } else if (!dryRun) {
      mkdirSync(path.dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
    }
  }
}

function mergePackageJson(projectRoot, dryRun) {
  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = readJson(pkgPath);

  const deps = {
  ...(pkg.dependencies ?? {}),
    "web-vitals": pkg.dependencies?.["web-vitals"] ?? "^5.1.0",
  };
  const devDeps = {
    ...(pkg.devDependencies ?? {}),
    lighthouse: pkg.devDependencies?.lighthouse ?? "12.8.2",
  };

  const scripts = {
    ...(pkg.scripts ?? {}),
    "perf:lighthouse:slow4g": "node scripts/run-lighthouse-network.mjs slow4g",
    "perf:lighthouse:fast4g": "node scripts/run-lighthouse-network.mjs fast4g",
    "perf:lighthouse:none": "node scripts/run-lighthouse-network.mjs none",
    "perf:lighthouse:network": "node scripts/run-lighthouse-network-all.mjs",
  };

  const next = { ...pkg, dependencies: deps, devDependencies: devDeps, scripts };
  if (!dryRun) writeJson(pkgPath, next);
  return next;
}

function mergeGitignore(projectRoot, dryRun) {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const additionsPath = path.join(TEMPLATE_ROOT, ".web-vital-kit.gitignore");
  const additions = readFileSync(additionsPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  let existing = "";
  if (existsSync(gitignorePath)) {
    existing = readFileSync(gitignorePath, "utf8");
  }

  const missing = additions.filter((line) => !existing.includes(line));
  if (missing.length === 0) return;

  const block = [
    "",
    "# web-vital-kit",
    ...missing,
    "",
  ].join("\n");

  if (!dryRun) {
    writeFileSync(gitignorePath, existing + block, "utf8");
  }
  log(`Updated .gitignore (+${missing.length} lines)`);
}

function patchAppRoutes(projectRoot, appInfo, dryRun) {
  const appRoutesPath = path.join(appInfo.appDir, "web-vital", "lib", "app-routes.ts");
  if (!existsSync(appRoutesPath)) return;

  const relativeAppFromCwd = appInfo.relativeApp.split(path.sep).join("/");
  const appDirLiteral = `path.join(process.cwd(), ${relativeAppFromCwd
    .split("/")
    .map((s) => JSON.stringify(s))
    .join(", ")})`;

  let content = readFileSync(appRoutesPath, "utf8");
  const next = content.replace(
    /const APP_DIR = path\.join\(process\.cwd\(\),[\s\S]*?\);/,
    `const APP_DIR = ${appDirLiteral};`,
  );

  if (next !== content && !dryRun) {
    writeFileSync(appRoutesPath, next, "utf8");
    log(`Patched app-routes.ts APP_DIR → ${relativeAppFromCwd}`);
  }
}

function patchLayout(appDir, dryRun) {
  const layoutPath = path.join(appDir, "layout.tsx");
  const layoutJsPath = path.join(appDir, "layout.js");

  const target = existsSync(layoutPath)
    ? layoutPath
    : existsSync(layoutJsPath)
      ? layoutJsPath
      : null;

  if (!target) {
    warn("layout.tsx/js not found — add WebVitalsInitializer manually (see AGENTS.md)");
    return false;
  }

  let content = readFileSync(target, "utf8");
  if (content.includes("WebVitalsInitializer")) {
    log("layout already includes WebVitalsInitializer — skipped");
    return true;
  }

  if (!content.includes(INITIALIZER_IMPORT.split(" from ")[0])) {
    const importAnchor = content.match(/^import .+$/m);
    if (importAnchor) {
      const idx = content.indexOf(importAnchor[0]) + importAnchor[0].length;
      content = content.slice(0, idx) + "\n" + INITIALIZER_IMPORT + content.slice(idx);
    } else {
      content = INITIALIZER_IMPORT + "\n" + content;
    }
  }

  const bodyOpen = content.match(/<body[^>]*>/);
  if (!bodyOpen) {
    warn("Could not find <body> in layout — add <WebVitalsInitializer /> manually");
    if (!dryRun) writeFileSync(target, content, "utf8");
    return false;
  }

  const insertAt = content.indexOf(bodyOpen[0]) + bodyOpen[0].length;
  content =
    content.slice(0, insertAt) +
    "\n          " +
    INITIALIZER_COMPONENT +
    content.slice(insertAt);

  if (!dryRun) writeFileSync(target, content, "utf8");
  log(`Patched ${path.basename(target)} with WebVitalsInitializer`);
  return true;
}

function install(projectRoot, { dryRun, force }) {
  if (!existsSync(path.join(projectRoot, "package.json"))) {
    fail("package.json not found. Run this inside a Node.js project root.");
  }

  const pkg = readJson(path.join(projectRoot, "package.json"));
  const hasNext =
    pkg.dependencies?.next ||
    pkg.devDependencies?.next ||
    existsSync(path.join(projectRoot, "next.config.ts")) ||
    existsSync(path.join(projectRoot, "next.config.js")) ||
    existsSync(path.join(projectRoot, "next.config.mjs"));

  if (!hasNext) {
    fail("Next.js project not detected. web-vital-kit currently supports Next.js App Router only.");
  }

  const appInfo = detectAppDir(projectRoot);
  if (!appInfo) {
    fail("App Router directory not found (expected src/app or app).");
  }

  const webVitalDest = path.join(appInfo.appDir, "web-vital");
  if (existsSync(webVitalDest) && !force) {
    fail(
      `${webVitalDest} already exists. Use --force to overwrite template files (layout patch is still skipped if already present).`,
    );
  }

  log(`Installing to ${projectRoot}`);
  log(`Route prefix: ${ROUTE_PREFIX}`);
  log(`App directory: ${appInfo.relativeApp}`);

  const templateWebVital = path.join(TEMPLATE_ROOT, "src", "app", "web-vital");
  if (!dryRun) {
    copyDirRecursive(templateWebVital, webVitalDest, false);
    log(`Copied web-vital routes → ${path.relative(projectRoot, webVitalDest)}`);
  } else {
    log(`[dry-run] Would copy ${templateWebVital} → ${webVitalDest}`);
  }

  const scriptsSrc = path.join(TEMPLATE_ROOT, "scripts");
  const scriptsDest = path.join(projectRoot, "scripts");
  if (!dryRun) {
    copyDirRecursive(scriptsSrc, scriptsDest, false);
    log("Copied Lighthouse scripts → scripts/");
  } else {
    log(`[dry-run] Would copy scripts/`);
  }

  const docsSrc = path.join(TEMPLATE_ROOT, "docs");
  const docsDest = path.join(projectRoot, "docs");
  if (!dryRun) {
    copyDirRecursive(docsSrc, docsDest, false);
    log("Copied docs → docs/vitals, docs/lighthouse");
  } else {
    log(`[dry-run] Would copy docs/`);
  }

  const cursorRulesSrc = path.join(TEMPLATE_ROOT, ".cursor", "rules");
  const cursorRulesDest = path.join(projectRoot, ".cursor", "rules");
  if (!dryRun) {
    copyDirRecursive(cursorRulesSrc, cursorRulesDest, false);
    log("Copied Cursor rule → .cursor/rules/web-vital-kit.mdc");
  } else {
    log(`[dry-run] Would copy .cursor/rules/`);
  }

  if (!dryRun) {
    mergePackageJson(projectRoot, false);
    log("Updated package.json (web-vitals, lighthouse, perf:* scripts)");
    mergeGitignore(projectRoot, false);
    patchAppRoutes(projectRoot, appInfo, false);
    patchLayout(appInfo.appDir, false);
  } else {
    log("[dry-run] Would update package.json and .gitignore");
    log("[dry-run] Would patch layout.tsx");
  }

  log("");
  log("✓ web-vital-kit install complete");
  log("");
  log("Next steps:");
  log("  1. yarn install  (or npm install / pnpm install)");
  log("  2. yarn dev");
  log(`  3. Open ${ROUTE_PREFIX}/dashboard`);
  log("  4. Browse other pages — metrics POST to /web-vital/api");
  log(`  5. GET ${ROUTE_PREFIX}/api/domains — app/ 폴더 자동 스캔 (도메인 추적)`);
  log("");
  log("Lighthouse (after build + start):");
  log("  LIGHTHOUSE_URL=http://127.0.0.1:3000 yarn perf:lighthouse:network");
}

function printHelp() {
  console.log(`
web-vital-kit — Next.js Web Vitals 자동 구축 도구

Commands:
  init              Install Web Vitals into the current Next.js project

Options:
  --cwd <path>      Target project directory (default: cwd)
  --dry-run         Show what would be done without writing files
  --force           Overwrite existing web-vital route folder
  -h, --help        Show this help

Routes installed:
  ${ROUTE_PREFIX}/dashboard     Metrics dashboard
  ${ROUTE_PREFIX}/api           POST collect / GET list
  ${ROUTE_PREFIX}/api/routes    App route list

Natural language (Claude / Cursor):
  "웹 바이탈 구축해줘" / "이 프로젝트에 맞는 웹 바이탈 구현해줘"
  → Run: npx web-vital-kit init
  → Cursor: .cursor/rules/web-vital-kit.mdc 자동 설치
  → Or follow AGENTS.md / skills/install-web-vitals/SKILL.md
`);
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.command) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

if (args.command === "init") {
  install(args.cwd, args);
} else {
  fail(`Unknown command: ${args.command}`);
}
