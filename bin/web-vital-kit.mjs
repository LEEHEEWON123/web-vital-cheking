#!/usr/bin/env node
/**
 * web-vital-kit CLI — Next.js / React (Vite) / Vue (Vite) / Nuxt 지원
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectFramework, detectPagesDir, getFrameworkLabel } from "../lib/detect-framework.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname, "..");
const ROUTE_PREFIX = "/web-vital";

const TEMPLATE_MAP = {
  next: "nextjs-app-router",
  react: "react-vite",
  vue: "vue-vite",
  nuxt: "nuxt",
};

function parseArgs(argv) {
  const args = { command: null, cwd: process.cwd(), dryRun: false, force: false, framework: null };
  const rest = [...argv];
  if (rest.length > 0 && !rest[0].startsWith("-")) args.command = rest.shift();
  while (rest.length > 0) {
    const a = rest.shift();
    if (a === "--cwd" && rest[0]) args.cwd = path.resolve(rest.shift());
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--framework" && rest[0]) args.framework = rest.shift();
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function log(msg) { console.log(`[web-vital-kit] ${msg}`); }
function warn(msg) { console.warn(`[web-vital-kit] ⚠ ${msg}`); }
function fail(msg) { console.error(`[web-vital-kit] ✗ ${msg}`); process.exit(1); }

function readJson(filePath) { return JSON.parse(readFileSync(filePath, "utf8")); }
function writeJson(filePath, data) { writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8"); }

function copyDirRecursive(src, dest, dryRun) {
  if (!existsSync(src)) return;
  if (!dryRun) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (statSync(srcPath).isDirectory()) copyDirRecursive(srcPath, destPath, dryRun);
    else if (!dryRun) {
      mkdirSync(path.dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
    }
  }
}

function mergePackageJson(projectRoot, dryRun) {
  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = readJson(pkgPath);
  const next = {
    ...pkg,
    dependencies: { ...(pkg.dependencies ?? {}), "web-vitals": pkg.dependencies?.["web-vitals"] ?? "^5.1.0" },
    devDependencies: { ...(pkg.devDependencies ?? {}), lighthouse: pkg.devDependencies?.lighthouse ?? "12.8.2" },
    scripts: {
      ...(pkg.scripts ?? {}),
      "perf:lighthouse:slow4g": "node scripts/run-lighthouse-network.mjs slow4g",
      "perf:lighthouse:fast4g": "node scripts/run-lighthouse-network.mjs fast4g",
      "perf:lighthouse:none": "node scripts/run-lighthouse-network.mjs none",
      "perf:lighthouse:network": "node scripts/run-lighthouse-network-all.mjs",
    },
  };
  if (!dryRun) writeJson(pkgPath, next);
}

function mergeGitignore(projectRoot, templateRoot, dryRun) {
  const additionsPath = path.join(templateRoot, ".web-vital-kit.gitignore");
  if (!existsSync(additionsPath)) return;
  const additions = readFileSync(additionsPath, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const gitignorePath = path.join(projectRoot, ".gitignore");
  let existing = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : "";
  const missing = additions.filter((line) => !existing.includes(line));
  if (missing.length === 0) return;
  if (!dryRun) writeFileSync(gitignorePath, existing + "\n# web-vital-kit\n" + missing.join("\n") + "\n", "utf8");
  log(`Updated .gitignore (+${missing.length} lines)`);
}

function writeWebVitalConfig(projectRoot, framework, pagesInfo, dryRun) {
  const config = {
    framework,
    pagesDir: pagesInfo?.relativePages ?? (framework === "nuxt" ? "pages" : "src/pages"),
    extensions: framework === "vue" || framework === "nuxt" ? [".vue"] : [".tsx", ".jsx", ".ts", ".js"],
    logsDir: framework === "nuxt" ? "web-vital-logs" : "src/web-vital-logs",
  };
  if (!dryRun) writeJson(path.join(projectRoot, "web-vital.config.json"), config);
  log(`Wrote web-vital.config.json (pagesDir: ${config.pagesDir})`);
}

function patchViteConfig(projectRoot, framework, dryRun) {
  const candidates = ["vite.config.ts", "vite.config.js", "vite.config.mjs"];
  const target = candidates.map((f) => path.join(projectRoot, f)).find(existsSync);
  if (!target) {
    warn("vite.config not found — see vite.config.example.ts and add webVitalKitVitePlugin manually");
    return;
  }
  let content = readFileSync(target, "utf8");
  if (content.includes("webVitalKitVitePlugin") || content.includes("web-vital-kit/vite-plugin")) {
    log("vite.config already includes web-vital-kit plugin — skipped");
    return;
  }
  const importLine = `import { webVitalKitVitePlugin } from "./web-vital-kit/vite-plugin.mjs";`;
  if (!content.includes(importLine)) {
    content = importLine + "\n" + content;
  }
  const pluginCall = `webVitalKitVitePlugin({ framework: "${framework}" })`;
  if (content.match(/plugins:\s*\[/)) {
    content = content.replace(/plugins:\s*\[/, `plugins: [${pluginCall}, `);
  } else {
    warn("Could not auto-patch plugins array in vite.config — add plugin manually");
    if (!dryRun) writeFileSync(target, content, "utf8");
    return;
  }
  if (!dryRun) writeFileSync(target, content, "utf8");
  log(`Patched ${path.basename(target)} with web-vital-kit Vite plugin`);
}

function patchNextLayout(appDir, dryRun) {
  const target = ["layout.tsx", "layout.js"].map((f) => path.join(appDir, f)).find(existsSync);
  if (!target) { warn("layout.tsx not found — add WebVitalsInitializer manually"); return; }
  let content = readFileSync(target, "utf8");
  if (content.includes("WebVitalsInitializer")) { log("layout already has WebVitalsInitializer"); return; }
  const imp = 'import { WebVitalsInitializer } from "./web-vital/WebVitalsInitializer";';
  const anchor = content.match(/^import .+$/m);
  content = anchor ? content.slice(0, content.indexOf(anchor[0]) + anchor[0].length) + "\n" + imp + content.slice(content.indexOf(anchor[0]) + anchor[0].length) : imp + "\n" + content;
  const body = content.match(/<body[^>]*>/);
  if (body) {
    const at = content.indexOf(body[0]) + body[0].length;
    content = content.slice(0, at) + "\n          <WebVitalsInitializer />" + content.slice(at);
  }
  if (!dryRun) writeFileSync(target, content, "utf8");
  log("Patched layout.tsx with WebVitalsInitializer");
}

function patchNextAppRoutes(appDir, relativeApp, dryRun) {
  const p = path.join(appDir, "web-vital", "lib", "app-routes.ts");
  if (!existsSync(p)) return;
  const lit = `path.join(process.cwd(), ${relativeApp.split("/").map((s) => JSON.stringify(s)).join(", ")})`;
  let c = readFileSync(p, "utf8");
  const n = c.replace(/const APP_DIR = path\.join\(process\.cwd\(\),[\s\S]*?\);/, `const APP_DIR = ${lit};`);
  if (n !== c && !dryRun) { writeFileSync(p, n, "utf8"); log(`Patched app-routes.ts → ${relativeApp}`); }
}

function patchReactMain(projectRoot, dryRun) {
  const candidates = ["src/main.tsx", "src/main.ts", "src/main.jsx", "src/main.js"];
  const target = candidates.map((f) => path.join(projectRoot, f)).find(existsSync);
  if (!target) { warn("main.tsx not found — add <WebVitalsInitializer /> manually"); return; }
  let content = readFileSync(target, "utf8");
  if (content.includes("WebVitalsInitializer")) return;
  if (!content.includes('from "./web-vital/WebVitalsInitializer"') && !content.includes("from '@/web-vital/WebVitalsInitializer'")) {
    content = `import { WebVitalsInitializer } from "./web-vital/WebVitalsInitializer";\n` + content;
  }
  if (content.includes("<App")) {
    content = content.replace(/<App(\s|\/|>)/, "<>\n    <WebVitalsInitializer />\n    <App$1");
    if (!content.includes("</>")) content = content.replace(/<\/StrictMode>/, "  </>\n  </StrictMode>");
  }
  if (!dryRun) writeFileSync(target, content, "utf8");
  log("Patched main.tsx with WebVitalsInitializer");
}

function patchVueMain(projectRoot, dryRun) {
  const candidates = ["src/main.ts", "src/main.js"];
  const target = candidates.map((f) => path.join(projectRoot, f)).find(existsSync);
  if (!target) { warn("main.ts not found — register WebVitalsInitializer in App.vue manually"); return; }
  let content = readFileSync(target, "utf8");
  if (content.includes("WebVitalsInitializer")) return;
  if (!content.includes("WebVitalsInitializer")) {
    content = `import WebVitalsInitializer from "./web-vital/WebVitalsInitializer.vue";\n` + content;
  }
  if (content.includes(".mount(") && !content.includes("WebVitalsInitializer")) {
    warn("Add <WebVitalsInitializer /> to App.vue template manually");
  }
  if (!dryRun) writeFileSync(target, content, "utf8");
  log("Imported WebVitalsInitializer in main.ts — add component to App.vue");
}

function installNext(projectRoot, templateRoot, { dryRun, force }) {
  const srcApp = path.join(projectRoot, "src", "app");
  const app = path.join(projectRoot, "app");
  const appDir = existsSync(srcApp) ? srcApp : app;
  const relativeApp = existsSync(srcApp) ? "src/app" : "app";
  const dest = path.join(appDir, "web-vital");
  if (existsSync(dest) && !force) fail(`${dest} exists — use --force`);
  const src = path.join(templateRoot, "src", "app", "web-vital");
  if (!dryRun) copyDirRecursive(src, dest, false);
  log(`Copied → ${relativeApp}/web-vital`);
  if (!dryRun) { patchNextAppRoutes(appDir, relativeApp, false); patchNextLayout(appDir, false); }
  return { routesDir: relativeApp };
}

function installViteSpa(projectRoot, templateRoot, framework, { dryRun, force }) {
  const destKit = path.join(projectRoot, "web-vital-kit");
  if (existsSync(path.join(projectRoot, "src", "web-vital")) && !force) {
    fail("src/web-vital exists — use --force");
  }
  if (!dryRun) {
    copyDirRecursive(path.join(templateRoot, "web-vital-kit"), destKit, false);
    copyDirRecursive(path.join(templateRoot, "src", "web-vital"), path.join(projectRoot, "src", "web-vital"), false);
    copyDirRecursive(path.join(templateRoot, "src", "pages"), path.join(projectRoot, "src", "pages"), false);
  }
  log("Copied src/web-vital, src/pages/web-vital, web-vital-kit/");
  const pagesInfo = detectPagesDir(projectRoot, framework);
  if (!dryRun) {
    writeWebVitalConfig(projectRoot, framework, pagesInfo, false);
    patchViteConfig(projectRoot, framework, false);
    if (framework === "react") patchReactMain(projectRoot, false);
    else patchVueMain(projectRoot, false);
  }
  return { routesDir: pagesInfo?.relativePages ?? "src/pages" };
}

function installNuxt(projectRoot, templateRoot, { dryRun, force }) {
  const checks = ["plugins/web-vitals.client.ts", "pages/web-vital/dashboard.vue"];
  if (checks.some((f) => existsSync(path.join(projectRoot, f))) && !force) {
    fail("Nuxt web-vital files exist — use --force");
  }
  const dirs = ["plugins", "pages/web-vital", "server/utils", "server/routes/web-vital/api", "utils"];
  for (const d of dirs) {
    const src = path.join(templateRoot, d);
    const dest = path.join(projectRoot, d);
    if (existsSync(src) && !dryRun) copyDirRecursive(src, dest, false);
  }
  log("Copied plugins/, pages/web-vital/, server/routes/web-vital/, utils/");
  if (!dryRun) writeWebVitalConfig(projectRoot, "nuxt", { relativePages: "pages" }, false);
  return { routesDir: "pages" };
}

function install(projectRoot, opts) {
  const { dryRun, force, framework: forced } = opts;
  if (!existsSync(path.join(projectRoot, "package.json"))) fail("package.json not found");

  const framework = forced ?? detectFramework(projectRoot);
  if (!framework) fail("Framework not detected. Supported: next, nuxt, react (vite), vue (vite). Use --framework.");

  const templateName = TEMPLATE_MAP[framework];
  const templateRoot = path.join(KIT_ROOT, "templates", templateName);
  if (!existsSync(templateRoot)) fail(`Template not found: ${templateName}`);

  log(`Framework: ${getFrameworkLabel(framework)}`);
  log(`Installing to ${projectRoot}`);
  log(`Route prefix: ${ROUTE_PREFIX}`);

  let routesDir;
  if (framework === "next") routesDir = installNext(projectRoot, templateRoot, opts).routesDir;
  else if (framework === "nuxt") routesDir = installNuxt(projectRoot, templateRoot, opts).routesDir;
  else routesDir = installViteSpa(projectRoot, templateRoot, framework, opts).routesDir;

  if (!dryRun) {
    copyDirRecursive(path.join(templateRoot, "scripts"), path.join(projectRoot, "scripts"), false);
    copyDirRecursive(path.join(templateRoot, "docs"), path.join(projectRoot, "docs"), false);
    const cursorSrc = path.join(templateRoot, ".cursor", "rules");
    if (existsSync(cursorSrc)) copyDirRecursive(cursorSrc, path.join(projectRoot, ".cursor", "rules"), false);
    mergePackageJson(projectRoot, false);
    mergeGitignore(projectRoot, templateRoot, false);
  }

  log("");
  log("✓ web-vital-kit install complete");
  log(`  Framework : ${getFrameworkLabel(framework)}`);
  log(`  Routes dir: ${routesDir}`);
  log(`  Dashboard : ${ROUTE_PREFIX}/dashboard`);
  log(`  Domains   : GET ${ROUTE_PREFIX}/api/domains`);
}

function printHelp() {
  console.log(`
web-vital-kit — Web Vitals 자동 구축 (Next.js / React / Vue / Nuxt)

Commands:
  init              Install into current project (auto-detect framework)

Options:
  --framework <f>   next | react | vue | nuxt
  --cwd <path>      Target directory
  --dry-run         Preview only
  --force           Overwrite existing files
  -h, --help

Supported frameworks:
  next   Next.js App Router  → scans src/app/ or app/
  react  React + Vite         → scans src/pages/ (vite plugin API)
  vue    Vue + Vite           → scans src/pages/ (vite plugin API)
  nuxt   Nuxt                 → scans pages/

Natural language (Cursor):
  "웹 바이탈 구축해줘" → npx web-vital-kit init
`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.command) { printHelp(); process.exit(args.help ? 0 : 1); }
if (args.command === "init") install(args.cwd, args);
else fail(`Unknown command: ${args.command}`);
