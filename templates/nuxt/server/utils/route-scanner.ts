import fs from "node:fs";
import path from "node:path";

const PAGES_DIR = path.join(process.cwd(), "pages");
const EXTENSIONS = [".vue"];

function escapeRegex(segment: string) {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRouteFile(name: string) {
  return EXTENSIONS.some((ext) => name.endsWith(ext));
}

function collectRouteFiles(dir: string, base = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectRouteFiles(full, rel));
    else if (isRouteFile(entry.name)) files.push(rel.replace(/\\/g, "/"));
  }
  return files;
}

function fileToRoute(file: string) {
  const ext = EXTENSIONS.find((e) => file.endsWith(e));
  if (!ext) return null;
  let route = file.slice(0, -ext.length);
  if (route === "index") return "/";
  if (route.endsWith("/index")) route = route.slice(0, -"/index".length);
  return `/${route}`;
}

export function getAppRoutes() {
  const routes = collectRouteFiles(PAGES_DIR).map(fileToRoute).filter(Boolean) as string[];
  return [...new Set(routes)].filter((r) => !r.startsWith("/web-vital"));
}

export function pathnameToDomain(pathname: string) {
  const normalized = (pathname || "/").replace(/\/+$/, "") || "/";
  if (normalized === "/") return "/";
  return `/${normalized.split("/").filter(Boolean)[0]}`;
}

export function domainToLogFolder(domain: string) {
  return domain === "/" ? "_root" : domain.replace(/^\/+/, "");
}

function routePathToRegex(routePath: string) {
  if (routePath === "/") return /^\/$/;
  const parts = routePath.split("/").filter(Boolean).map((segment) => {
    if (segment.startsWith("[...") && segment.endsWith("]")) return ".+";
    if (segment.startsWith("[[...") && segment.endsWith("]]")) return ".*";
    if (segment.startsWith("[") && segment.endsWith("]")) return "[^/]+";
    return escapeRegex(segment);
  });
  return new RegExp(`^/${parts.join("/")}$`);
}

function hasPageInTree(dirPath: string): boolean {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return false;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  if (entries.some((e) => isRouteFile(e.name))) return true;
  return entries.filter((e) => e.isDirectory()).some((e) => hasPageInTree(path.join(dirPath, e.name)));
}

export function getAppDomains() {
  const allRoutes = getAppRoutes();
  const domains = new Map<string, { domain: string; folder: string; routes: string[]; autoTracked: true }>();

  if (allRoutes.includes("/")) {
    domains.set("/", { domain: "/", folder: "_root", routes: ["/"], autoTracked: true });
  }

  for (const route of allRoutes) {
    if (route === "/") continue;
    const domain = pathnameToDomain(route);
    const folder = domainToLogFolder(domain);
    const existing = domains.get(domain);
    if (existing) {
      if (!existing.routes.includes(route)) existing.routes.push(route);
    } else {
      domains.set(domain, { domain, folder, routes: [route], autoTracked: true });
    }
  }

  if (fs.existsSync(PAGES_DIR)) {
    for (const entry of fs.readdirSync(PAGES_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "web-vital") continue;
      const fullPath = path.join(PAGES_DIR, entry.name);
      if (!hasPageInTree(fullPath)) continue;
      const domain = `/${entry.name}`;
      if (!domains.has(domain)) {
        domains.set(domain, {
          domain,
          folder: entry.name,
          routes: allRoutes.filter((r) => r === domain || r.startsWith(`${domain}/`)),
          autoTracked: true,
        });
      }
    }
  }

  return Array.from(domains.values())
    .map((d) => ({ ...d, routes: [...d.routes].sort() }))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

export function isValidAppPath(pathname: string) {
  const normalizedPath = pathname || "/";
  const routes = getAppRoutes();
  if (routes.some((r) => routePathToRegex(r).test(normalizedPath))) return true;
  return getAppDomains().some((d) => d.domain === pathnameToDomain(normalizedPath));
}
