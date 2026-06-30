import fs from "node:fs";
import path from "node:path";
import {
  domainToLogFolder,
  isValidAppPath,
  pathnameToDomain,
} from "./route-scanner";

const MAX_ENTRIES = 500;
const store: Array<Record<string, unknown>> = [];

export function getMetrics() {
  return [...store].reverse();
}

export function appendVitalsEntry(body: Record<string, unknown>) {
  const { name, value, path: pathnamePayload, deviceType, id, delta, rating, navigationType } = body;
  if (!name || typeof value !== "number") return "invalid";

  let pathNormalized = (pathnamePayload as string) ?? "/";
  try {
    pathNormalized = decodeURIComponent(pathNormalized);
  } catch {
    // keep
  }

  if (!isValidAppPath(pathNormalized)) return "skipped";

  const domain = pathnameToDomain(pathNormalized);
  const entry = {
    name,
    value,
    id: id ?? "",
    delta: delta ?? 0,
    rating: rating ?? "good",
    navigationType: navigationType ?? "",
    path: pathNormalized,
    domain,
    deviceType: ["mobile", "tablet", "desktop"].includes(deviceType as string)
      ? deviceType
      : "desktop",
    receivedAt: new Date().toISOString(),
  };

  store.push(entry);
  if (store.length > MAX_ENTRIES) store.splice(0, store.length - MAX_ENTRIES);

  if (process.env.NODE_ENV !== "production") {
    try {
      const folder = domainToLogFolder(domain);
      const date = new Date().toISOString().slice(0, 10);
      const logDir = path.join(process.cwd(), "web-vital-logs", folder);
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(path.join(logDir, `${date}.ndjson`), JSON.stringify(entry) + "\n");
    } catch {
      // ignore
    }
  }

  return "stored";
}
