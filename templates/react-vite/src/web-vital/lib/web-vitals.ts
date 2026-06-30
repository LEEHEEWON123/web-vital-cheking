import { onCLS, onINP, onLCP, onTTFB, Metric } from "web-vitals";

type WebVitalMetric = Metric;

export type DeviceType = "mobile" | "tablet" | "desktop";

/** 짧은 시간에 여러 지표가 연속으로 뜰 때 POST 한 번으로 묶음 */
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
  const body =
    batch.length === 1
      ? JSON.stringify(batch[0])
      : JSON.stringify({ metrics: batch });
  fetch("/web-vital/api", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
  }).catch((err) => {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[web-vital-kit] 전송 실패", err);
    }
  });
}

function scheduleFlush() {
  if (flushTimer != null) return;
  flushTimer = setTimeout(flushVitalsQueue, FLUSH_MS);
}

function getDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))|silk/.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(ua))
    return "mobile";
  return "desktop";
}

function reportMetric(metric: WebVitalMetric) {
  if (typeof window === "undefined") return;

  let path = window.location.pathname || "/";
  try {
    path = decodeURIComponent(path);
  } catch {
    // 잘못된 인코딩이면 원본 유지
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const deviceType = getDeviceType(ua);
  const payload: VitalsPayload = {
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path,
    deviceType,
  };
  queue.push(payload);
  scheduleFlush();
}

let vitalsListenersAttached = false;
let pagehideRegistered = false;

export function initWebVitals() {
  if (typeof window === "undefined") return;
  if (vitalsListenersAttached) return;
  vitalsListenersAttached = true;

  if (!pagehideRegistered) {
    pagehideRegistered = true;
    window.addEventListener("pagehide", () => {
      if (flushTimer != null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushVitalsQueue();
    });
  }

  onCLS(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}
