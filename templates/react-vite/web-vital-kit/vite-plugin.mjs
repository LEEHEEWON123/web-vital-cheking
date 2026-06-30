import fs from "node:fs";
import path from "node:path";
import { createPagesScanner } from "./route-scanner-pages.mjs";

const MAX_ENTRIES = 500;
const store = [];

function getMetricAnalysis(name, rating) {
  if (rating === "good") return { possibleCauses: [], recommendations: [] };
  const map = {
    LCP: {
      possibleCauses: ["큰 이미지/미디어", "render-blocking JS/CSS", "TTFB 지연"],
      recommendations: ["LCP 이미지 priority", "CSS/JS 최적화"],
    },
    INP: {
      possibleCauses: ["메인 스레드 블로킹", "과도한 JS"],
      recommendations: ["긴 작업 분할", "번들 축소"],
    },
    CLS: {
      possibleCauses: ["이미지 크기 미지정", "동적 콘텐츠 삽입"],
      recommendations: ["width/height 지정", "aspect-ratio"],
    },
    TTFB: {
      possibleCauses: ["서버 지연", "콜드 스타트"],
      recommendations: ["캐싱", "CDN"],
    },
  };
  return map[name] ?? { possibleCauses: ["추가 분석 필요"], recommendations: [] };
}

function readConfig(projectRoot) {
  const configPath = path.join(projectRoot, "web-vital.config.json");
  if (!fs.existsSync(configPath)) {
    return {
      pagesDir: path.join(projectRoot, "src", "pages"),
      extensions: [".tsx", ".jsx", ".ts", ".js"],
      logsDir: path.join(projectRoot, "src", "web-vital-logs"),
    };
  }
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return {
    pagesDir: path.join(projectRoot, raw.pagesDir ?? "src/pages"),
    extensions: raw.extensions ?? [".tsx", ".jsx"],
    logsDir: path.join(projectRoot, raw.logsDir ?? "src/web-vital-logs"),
  };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function appendEntry(scanner, body, logsDir) {
  const { name, value, id, delta, rating, navigationType, path: pathnamePayload, deviceType } = body;
  if (!name || typeof value !== "number") return "invalid";

  let pathNormalized = pathnamePayload ?? "/";
  try {
    pathNormalized = decodeURIComponent(pathNormalized);
  } catch {
    // keep
  }

  if (!scanner.isValidAppPath(pathNormalized)) return "skipped";

  const domain = scanner.pathnameToDomain(pathNormalized);
  const entry = {
    name,
    value,
    id: id ?? "",
    delta: delta ?? 0,
    rating: rating ?? "good",
    navigationType: navigationType ?? "",
    path: pathNormalized,
    domain,
    deviceType: ["mobile", "tablet", "desktop"].includes(deviceType) ? deviceType : "desktop",
    receivedAt: new Date().toISOString(),
  };

  store.push(entry);
  if (store.length > MAX_ENTRIES) store.splice(0, store.length - MAX_ENTRIES);

  try {
    const folder = scanner.domainToLogFolder(domain);
    const date = new Date().toISOString().slice(0, 10);
    const logDir = path.join(logsDir, folder);
    fs.mkdirSync(logDir, { recursive: true });
    const analysis = getMetricAnalysis(entry.name, entry.rating);
    fs.appendFileSync(
      path.join(logDir, `${date}.ndjson`),
      JSON.stringify({ ...entry, analysis }) + "\n"
    );
  } catch {
    // ignore
  }

  return "stored";
}

/**
 * Vite dev server용 /web-vital/api 미들웨어
 */
export function webVitalKitVitePlugin(options = {}) {
  const projectRoot = options.root ?? process.cwd();

  return {
    name: "web-vital-kit",
    configureServer(server) {
      const config = readConfig(projectRoot);
      const scanner = createPagesScanner({
        pagesDir: config.pagesDir,
        extensions: config.extensions,
      });

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (!url.startsWith("/web-vital/api")) return next();

        if (url === "/web-vital/api/domains" && req.method === "GET") {
          return sendJson(res, 200, {
            domains: scanner.getAppDomains(),
            framework: options.framework ?? "vite",
            scannedAt: new Date().toISOString(),
          });
        }

        if (url === "/web-vital/api/routes" && req.method === "GET") {
          return sendJson(res, 200, {
            routes: scanner.getAppRoutes().sort(),
            domains: scanner.getAppDomains(),
          });
        }

        if (url === "/web-vital/api" && req.method === "GET") {
          const list = [...store].reverse();
          return sendJson(res, 200, { metrics: list, domains: scanner.getAppDomains() });
        }

        if (url === "/web-vital/api" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const parsed = JSON.parse(body);
              const items = Array.isArray(parsed?.metrics) ? parsed.metrics : [parsed];
              let stored = 0;
              let skipped = 0;
              let invalid = 0;
              for (const item of items) {
                const r = appendEntry(scanner, item, config.logsDir);
                if (r === "stored") stored += 1;
                else if (r === "skipped") skipped += 1;
                else invalid += 1;
              }
              sendJson(res, 200, { ok: true, stored, skipped, invalid });
            } catch {
              sendJson(res, 400, { error: "Invalid JSON" });
            }
          });
          return;
        }

        next();
      });
    },
  };
}
