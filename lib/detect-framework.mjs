import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * @returns {'next' | 'nuxt' | 'react' | 'vue' | null}
 */
export function detectFramework(projectRoot) {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return null;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (
    deps.next ||
    existsSync(path.join(projectRoot, "next.config.ts")) ||
    existsSync(path.join(projectRoot, "next.config.js")) ||
    existsSync(path.join(projectRoot, "next.config.mjs"))
  ) {
    if (existsSync(path.join(projectRoot, "src", "app")) || existsSync(path.join(projectRoot, "app"))) {
      return "next";
    }
  }

  if (
    deps.nuxt ||
    existsSync(path.join(projectRoot, "nuxt.config.ts")) ||
    existsSync(path.join(projectRoot, "nuxt.config.js"))
  ) {
    return "nuxt";
  }

  if (deps.react && (deps.vite || existsSync(path.join(projectRoot, "vite.config.ts")) || existsSync(path.join(projectRoot, "vite.config.js")))) {
    return "react";
  }

  if (deps.vue && (deps.vite || existsSync(path.join(projectRoot, "vite.config.ts")) || existsSync(path.join(projectRoot, "vite.config.js")))) {
    return "vue";
  }

  return null;
}

export function getFrameworkLabel(framework) {
  const labels = {
    next: "Next.js App Router",
    nuxt: "Nuxt",
    react: "React (Vite)",
    vue: "Vue (Vite)",
  };
  return labels[framework] ?? framework;
}

export function detectPagesDir(projectRoot, framework) {
  const candidates =
    framework === "nuxt"
      ? ["pages"]
      : [
          "src/pages",
          "pages",
          "src/routes",
          "src/views",
          "src/app",
        ];

  for (const rel of candidates) {
    const full = path.join(projectRoot, rel);
    if (existsSync(full)) {
      return { pagesDir: full, relativePages: rel.replace(/\\/g, "/") };
    }
  }
  return null;
}
