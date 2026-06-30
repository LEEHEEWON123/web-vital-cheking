import fs from "fs";
import path from "path";

const APP_DIR = path.join(process.cwd(), "src", "app");

function escapeRegex(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

/** 실제 존재하는 라우트 경로 Set (대시보드 제외). POST 시 이 목록에 있는 path만 저장 */
export function getValidPathSet(): Set<string> {
  const routes = getAppRoutes("").filter((p) => p !== "/web-vital/dashboard");
  return new Set(routes);
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
  const routes = getAppRoutes("").filter((p) => p !== "/web-vital/dashboard");

  return routes.some((routePath) => routePathToRegex(routePath).test(normalizedPath));
}
