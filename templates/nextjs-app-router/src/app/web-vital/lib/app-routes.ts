import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "src", "app");

/** app/ 1뎁스 폴더 = 도메인 (예: series → /series, my-voice → /my-voice) */
export interface AppDomain {
  /** URL 도메인 prefix. 예: /series, /my-voice, / */
  domain: string;
  /** app 폴더명. 로그 디렉터리명으로 사용 */
  folder: string;
  /** 이 도메인에 속하는 라우트 목록 */
  routes: string[];
  /** app/ 스캔으로 자동 등록됨 */
  autoTracked: true;
}

function escapeRegex(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPageInTree(dirPath: string): boolean {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return false;
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  if (entries.some((e) => e.name === "page.tsx" || e.name === "page.js")) {
    return true;
  }
  return entries
    .filter((e) => e.isDirectory())
    .some((e) => hasPageInTree(path.join(dirPath, e.name)));
}

/**
 * Next.js app 디렉터리를 스캔해 page.tsx가 있는 라우트 경로 목록 반환.
 * - _ 로 시작하는 폴더: 라우트 아님 (스킵)
 * - (그룹명) 폴더: URL에 포함 안 됨 (스킵)
 */
export function getAppRoutes(
  dir: string,
  segments: string[] = []
): string[] {
  const fullPath = path.join(APP_DIR, dir);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    return [];
  }

  const routes: string[] = [];
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  if (entries.some((e) => e.name === "page.tsx" || e.name === "page.js")) {
    const routePath = "/" + segments.join("/") || "/";
    routes.push(routePath === "//" ? "/" : routePath);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith("_")) continue;
    if (name.startsWith("(") && name.endsWith(")")) {
      const childDir = path.join(dir, name);
      routes.push(...getAppRoutes(childDir, segments));
    } else {
      const childDir = path.join(dir, name);
      routes.push(...getAppRoutes(childDir, [...segments, name]));
    }
  }

  return routes;
}

const WEB_VITAL_PREFIX = "/web-vital";

function isWebVitalRoute(routePath: string): boolean {
  return (
    routePath === WEB_VITAL_PREFIX ||
    routePath.startsWith(`${WEB_VITAL_PREFIX}/`)
  );
}

function trackedRoutes(): string[] {
  return getAppRoutes("").filter((p) => !isWebVitalRoute(p));
}

/** pathname → 도메인 prefix. /series/abc → /series, / → / */
export function pathnameToDomain(pathname: string): string {
  const normalized = (pathname || "/").replace(/\/+$/, "") || "/";
  if (normalized === "/") return "/";
  const first = normalized.split("/").filter(Boolean)[0];
  return `/${first}`;
}

/** 도메인 → 로그 폴더명. / → _root, /my-voice → my-voice */
export function domainToLogFolder(domain: string): string {
  if (domain === "/") return "_root";
  return domain.replace(/^\/+/, "");
}

/**
 * app/ 1뎁스 폴더를 스캔해 도메인 목록을 반환합니다.
 * src/app/series/, src/app/alarm/, src/app/my-voice/ 등이 추가되면
 * 재스캔 시 자동으로 /series, /alarm, /my-voice 도메인이 등록됩니다.
 */
export function getAppDomains(): AppDomain[] {
  const allRoutes = trackedRoutes();
  const domains = new Map<string, AppDomain>();

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

  if (fs.existsSync(APP_DIR)) {
    for (const entry of fs.readdirSync(APP_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (name.startsWith("_") || (name.startsWith("(") && name.endsWith(")")))
        continue;
      if (name === "web-vital") continue;

      const fullPath = path.join(APP_DIR, name);
      if (!hasPageInTree(fullPath)) continue;

      const domain = `/${name}`;
      if (!domains.has(domain)) {
        domains.set(domain, {
          domain,
          folder: name,
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

export function getValidPathSet(): Set<string> {
  return new Set(trackedRoutes());
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]");
}

function routePathToRegex(routePath: string): RegExp {
  if (routePath === "/") {
    return /^\/$/;
  }

  const parts = routePath
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith("[...") && segment.endsWith("]")) {
        return ".+";
      }

      if (segment.startsWith("[[...") && segment.endsWith("]]")) {
        return ".*";
      }

      if (isDynamicSegment(segment)) {
        return "[^/]+";
      }

      return escapeRegex(segment);
    });

  return new RegExp(`^/${parts.join("/")}$`);
}

export function isValidAppPath(pathname: string): boolean {
  const normalizedPath = pathname || "/";
  const routes = trackedRoutes();

  if (routes.some((routePath) => routePathToRegex(routePath).test(normalizedPath))) {
    return true;
  }

  const domain = pathnameToDomain(normalizedPath);
  return getAppDomains().some((d) => d.domain === domain);
}

export function isPathInDomain(pathname: string, domain: string): boolean {
  const normalizedPath = pathname || "/";
  if (domain === "/") return normalizedPath === "/";
  return (
    normalizedPath === domain || normalizedPath.startsWith(`${domain}/`)
  );
}
