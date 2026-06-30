import fs from "node:fs";
import path from "node:path";

const DEFAULT_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js", ".vue"];

/**
 * React / Vue / Nuxt pages 디렉터리 스캐너
 * pages/series/[id].vue → /series/[id]
 */
export function createPagesScanner(options) {
  const {
    pagesDir,
    extensions = DEFAULT_EXTENSIONS,
    excludePrefixes = ["/web-vital"],
  } = options;

  function escapeRegex(segment) {
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function isRouteFile(name) {
    return extensions.some((ext) => name.endsWith(ext));
  }

  function collectRouteFiles(dir, base = "") {
    if (!fs.existsSync(dir)) return [];
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectRouteFiles(full, rel));
      } else if (isRouteFile(entry.name)) {
        files.push(rel.replace(/\\/g, "/"));
      }
    }
    return files;
  }

  function fileToRoute(file) {
    const ext = extensions.find((e) => file.endsWith(e));
    if (!ext) return null;
    let route = file.slice(0, -ext.length);
    if (route === "index") return "/";
    if (route.endsWith("/index")) route = route.slice(0, -"/index".length);
    return `/${route}`;
  }

  function getAppRoutes() {
    const files = collectRouteFiles(pagesDir);
    const routes = files.map(fileToRoute).filter(Boolean);
    return [...new Set(routes)].filter(
      (r) => !excludePrefixes.some((p) => r === p || r.startsWith(`${p}/`))
    );
  }

  function pathnameToDomain(pathname) {
    const normalized = (pathname || "/").replace(/\/+$/, "") || "/";
    if (normalized === "/") return "/";
    const first = normalized.split("/").filter(Boolean)[0];
    return `/${first}`;
  }

  function domainToLogFolder(domain) {
    if (domain === "/") return "_root";
    return domain.replace(/^\/+/, "");
  }

  function routePathToRegex(routePath) {
    if (routePath === "/") return /^\/$/;
    const parts = routePath
      .split("/")
      .filter(Boolean)
      .map((segment) => {
        if (segment.startsWith("[...") && segment.endsWith("]")) return ".+";
        if (segment.startsWith("[[...") && segment.endsWith("]]")) return ".*";
        if (segment.startsWith("[") && segment.endsWith("]")) return "[^/]+";
        return escapeRegex(segment);
      });
    return new RegExp(`^/${parts.join("/")}$`);
  }

  function hasPageInTree(dirPath) {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return false;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    if (entries.some((e) => isRouteFile(e.name))) return true;
    return entries
      .filter((e) => e.isDirectory())
      .some((e) => hasPageInTree(path.join(dirPath, e.name)));
  }

  function getAppDomains() {
    const allRoutes = getAppRoutes();
    const domains = new Map();

    if (allRoutes.includes("/")) {
      domains.set("/", {
        domain: "/",
        folder: "_root",
        routes: ["/"],
        autoTracked: true,
      });
    }

    for (const route of allRoutes) {
      if (route === "/") continue;
      const domain = pathnameToDomain(route);
      const folder = domainToLogFolder(domain);
      const existing = domains.get(domain);
      if (existing) {
        if (!existing.routes.includes(route)) existing.routes.push(route);
      } else {
        domains.set(domain, {
          domain,
          folder,
          routes: [route],
          autoTracked: true,
        });
      }
    }

    if (fs.existsSync(pagesDir)) {
      for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (entry.name === "web-vital") continue;
        const fullPath = path.join(pagesDir, entry.name);
        if (!hasPageInTree(fullPath)) continue;
        const domain = `/${entry.name}`;
        if (!domains.has(domain)) {
          domains.set(domain, {
            domain,
            folder: entry.name,
            routes: allRoutes.filter(
              (r) => r === domain || r.startsWith(`${domain}/`)
            ),
            autoTracked: true,
          });
        }
      }
    }

    return Array.from(domains.values())
      .map((d) => ({
        ...d,
        routes: [...d.routes].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }

  function isValidAppPath(pathname) {
    const normalizedPath = pathname || "/";
    const routes = getAppRoutes();
    if (routes.some((r) => routePathToRegex(r).test(normalizedPath))) return true;
    const domain = pathnameToDomain(normalizedPath);
    return getAppDomains().some((d) => d.domain === domain);
  }

  return {
    getAppRoutes,
    getAppDomains,
    isValidAppPath,
    pathnameToDomain,
    domainToLogFolder,
  };
}
