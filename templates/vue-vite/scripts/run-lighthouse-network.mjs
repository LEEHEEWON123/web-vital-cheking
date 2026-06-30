#!/usr/bin/env node
/**
 * Lighthouse performance run: Slow 4G / Fast 4G (devtools) 또는 No throttling.
 *
 *   LIGHTHOUSE_URL=http://127.0.0.1:3000 node scripts/run-lighthouse-network.mjs slow4g|fast4g|none
 *
 * Writes JSON under docs/lighthouse/network-profiles/ and prints a one-line summary.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const profileArg = process.argv[2];
const url = process.env.LIGHTHOUSE_URL || "http://127.0.0.1:3000";

const presetsPath = path.join(__dirname, "lighthouse-throttle-presets.json");
const raw = JSON.parse(await readFile(presetsPath, "utf8"));
const preset = raw[profileArg];

const validNone = preset?.noEmulation === true && preset?.throttlingMethod === "provided";
const validDevtools =
  preset?.throttlingMethod === "devtools" &&
  typeof preset.downloadThroughputKbps === "number";

if (!preset || (!validNone && !validDevtools)) {
  console.error(
    "Usage: LIGHTHOUSE_URL=http://127.0.0.1:3000 node scripts/run-lighthouse-network.mjs <slow4g|fast4g|none>",
  );
  process.exit(1);
}

const outDir = path.join(REPO_ROOT, "docs", "lighthouse", "network-profiles");
await mkdir(outDir, { recursive: true });
const outJson = path.join(outDir, `latest-${profileArg}.json`);

const lhCli = path.join(REPO_ROOT, "node_modules", "lighthouse", "cli", "index.js");

const baseArgs = [
  lhCli,
  url,
  "--only-categories=performance",
  "--output=json",
  `--output-path=${outJson}`,
  "--quiet",
  "--chrome-flags=--headless=new",
  "--max-wait-for-load=90000",
];

const args = validNone
  ? [
      ...baseArgs,
      "--screenEmulation.disabled",
      "--throttling-method=provided",
      "--no-emulated-user-agent",
    ]
  : [
      ...baseArgs,
      `--throttling-method=${preset.throttlingMethod}`,
      `--throttling.downloadThroughputKbps=${preset.downloadThroughputKbps}`,
      `--throttling.uploadThroughputKbps=${preset.uploadThroughputKbps}`,
      `--throttling.requestLatencyMs=${preset.requestLatencyMs}`,
      `--throttling.cpuSlowdownMultiplier=${preset.cpuSlowdownMultiplier}`,
    ];

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, {
    cwd: REPO_ROOT,
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`lighthouse exited ${code}`));
  });
});

const report = JSON.parse(await readFile(outJson, "utf8"));

function auditMs(id) {
  const a = report.audits[id];
  if (!a || a.numericValue == null) return null;
  return Math.round(a.numericValue);
}

function scorePct(cat) {
  const s = report.categories[cat]?.score;
  if (s == null) return null;
  return Math.round(s * 100);
}

const throttle = validNone
  ? {
      method: "provided",
      noEmulation: true,
      screenEmulationDisabled: true,
      downloadThroughputKbps: null,
      uploadThroughputKbps: null,
      requestLatencyMs: null,
      cpuSlowdownMultiplier: null,
    }
  : {
      method: preset.throttlingMethod,
      downloadThroughputKbps: preset.downloadThroughputKbps,
      uploadThroughputKbps: preset.uploadThroughputKbps,
      requestLatencyMs: preset.requestLatencyMs,
      cpuSlowdownMultiplier: preset.cpuSlowdownMultiplier,
    };

const row = {
  profile: profileArg,
  url: report.finalUrl || url,
  fetchedAt: new Date().toISOString(),
  lighthouseVersion: report.lighthouseVersion,
  throttle,
  performanceScore: scorePct("performance"),
  fcpMs: auditMs("first-contentful-paint"),
  lcpMs: auditMs("largest-contentful-paint"),
  siMs: auditMs("speed-index"),
  tbtMs: auditMs("total-blocking-time"),
  ttiMs: auditMs("interactive"),
};

const summaryPath = path.join(outDir, `summary-${profileArg}.json`);
await writeFile(summaryPath, `${JSON.stringify(row, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify({
    ok: true,
    profile: profileArg,
    summaryPath,
    fullJson: outJson,
    ...row,
  }),
);
