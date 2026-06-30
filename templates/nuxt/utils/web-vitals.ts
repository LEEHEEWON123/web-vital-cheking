import { onCLS, onINP, onLCP, onTTFB, Metric } from "web-vitals";

type WebVitalMetric = Metric;
export type DeviceType = "mobile" | "tablet" | "desktop";

const FLUSH_MS = 80;
type VitalsPayload = {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: string;
  navigationType: string;
  path: string;
  deviceType: DeviceType;
};

const queue: VitalsPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushVitalsQueue() {
  flushTimer = null;
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const body = batch.length === 1 ? JSON.stringify(batch[0]) : JSON.stringify({ metrics: batch });
  fetch("/web-vital/api", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
  }).catch(() => {});
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = setTimeout(flushVitalsQueue, FLUSH_MS);
}

function getDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua)) return "mobile";
  return "desktop";
}

function reportMetric(metric: WebVitalMetric) {
  if (typeof window === "undefined") return;
  let p = window.location.pathname || "/";
  try { p = decodeURIComponent(p); } catch { /* keep */ }
  queue.push({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: p,
    deviceType: getDeviceType(typeof navigator !== "undefined" ? navigator.userAgent : ""),
  });
  scheduleFlush();
}

let attached = false;
export function initWebVitals() {
  if (typeof window === "undefined" || attached) return;
  attached = true;
  window.addEventListener("pagehide", () => {
    if (flushTimer != null) { clearTimeout(flushTimer); flushTimer = null; }
    flushVitalsQueue();
  });
  onCLS(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}
