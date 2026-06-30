import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isValidAppPath } from "../lib/app-routes";

/** POST body: web-vitals Metric 직렬화 가능한 필드만 */
export interface VitalsPayload {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: "good" | "needs-improvement" | "poor";
  navigationType: string;
  path?: string;
  deviceType?: "mobile" | "tablet" | "desktop";
}

export interface StoredMetric extends VitalsPayload {
  receivedAt: string;
}

export interface MetricAnalysis {
  possibleCauses: string[];
  recommendations: string[];
}

function getMetricAnalysis(
  name: string,
  _value: number,
  rating: "good" | "needs-improvement" | "poor"
): MetricAnalysis {
  const causes: string[] = [];
  const recommendations: string[] = [];

  if (rating === "good") {
    return { possibleCauses: [], recommendations: [] };
  }

  switch (name) {
    case "LCP":
      causes.push(
        "above-the-fold 큰 이미지/미디어",
        "render-blocking JS/CSS",
        "서버 응답 지연(TTFB)",
        "클라이언트 렌더링 지연"
      );
      recommendations.push(
        "LCP 요소 이미지에 priority 또는 fetchPriority high",
        "핵심 CSS 인라인·나머지 비동기",
        "불필요한 JS 지연 로딩"
      );
      break;
    case "INP":
      causes.push(
        "메인 스레드 장시간 블로킹",
        "과도한 JS 실행",
        "서드파티 스크립트"
      );
      recommendations.push(
        "긴 작업 분할·requestIdleCallback 활용",
        "번들/의존성 축소·코드 스플리팅",
        "인터랙션 핸들러 가벼운 처리만"
      );
      break;
    case "CLS":
      causes.push(
        "이미지/광고에 width·height 없음",
        "동적 콘텐츠 삽입",
        "웹폰트 FOIT/FOUT"
      );
      recommendations.push(
        "미디어에 명시적 크기 또는 aspect-ratio",
        "폰트 preload·font-display: optional/swap"
      );
      break;
    case "TTFB":
      causes.push("서버 처리 지연", "콜드 스타트", "느린 DB/API 호출");
      recommendations.push("서버/API 응답 시간 단축", "캐싱·CDN·가까운 리전");
      break;
    default:
      causes.push("해당 지표는 추가 분석 필요");
  }

  return { possibleCauses: causes, recommendations };
}

const MAX_ENTRIES = 500;
const store: StoredMetric[] = [];

function normalizePath(p: string): string {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

function pathToLogFolder(pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, "").trim();
  if (!trimmed) return "_root";
  return trimmed.split("/").join("-");
}

function appendVitalsEntry(body: VitalsPayload): "stored" | "skipped" | "invalid" {
  const {
    name,
    value,
    id,
    delta,
    rating,
    navigationType,
    path: pathnamePayload,
    deviceType,
  } = body;

  if (!name || typeof value !== "number") {
    return "invalid";
  }

  const pathNormalized = normalizePath(pathnamePayload ?? "/");

  if (!isValidAppPath(pathNormalized)) {
    return "skipped";
  }

  const entry: StoredMetric = {
    name,
    value,
    id: id ?? "",
    delta: delta ?? 0,
    rating: rating ?? "good",
    navigationType: navigationType ?? "",
    path: pathNormalized,
    deviceType:
      deviceType === "mobile" ||
      deviceType === "tablet" ||
      deviceType === "desktop"
        ? deviceType
        : "desktop",
    receivedAt: new Date().toISOString(),
  };

  store.push(entry);
  if (store.length > MAX_ENTRIES) store.splice(0, store.length - MAX_ENTRIES);

  if (process.env.NODE_ENV !== "production") {
    try {
      const folder = pathToLogFolder(pathNormalized);
      const date = new Date().toISOString().slice(0, 10);
      const logDir = path.join(process.cwd(), "src", "web-vital-logs", folder);
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const logPath = path.join(logDir, `${date}.ndjson`);
      const analysis = getMetricAnalysis(entry.name, entry.value, entry.rating);
      const logEntry = { ...entry, analysis };
      fs.appendFileSync(logPath, JSON.stringify(logEntry) + "\n");
    } catch {
      // 파일 쓰기 실패 시 무시
    }
  }

  return "stored";
}

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "empty body" }, { status: 400 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const items: VitalsPayload[] =
      parsed !== null &&
      typeof parsed === "object" &&
      "metrics" in parsed &&
      Array.isArray((parsed as { metrics: unknown }).metrics)
        ? (parsed as { metrics: VitalsPayload[] }).metrics
        : [parsed as VitalsPayload];

    if (items.length === 0) {
      return NextResponse.json({ error: "no metrics" }, { status: 400 });
    }

    let stored = 0;
    let skipped = 0;
    let invalid = 0;
    for (const body of items) {
      const r = appendVitalsEntry(body);
      if (r === "stored") stored += 1;
      else if (r === "skipped") skipped += 1;
      else invalid += 1;
    }

    if (invalid > 0 && stored === 0 && skipped === 0) {
      return NextResponse.json(
        { error: "name, value required on each metric" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, stored, skipped, invalid });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function GET() {
  const list = [...store].reverse();
  return NextResponse.json({ metrics: list });
}
