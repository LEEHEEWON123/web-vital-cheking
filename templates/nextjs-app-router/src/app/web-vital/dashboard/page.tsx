"use client";

import { useEffect, useState } from "react";

type DeviceType = "mobile" | "tablet" | "desktop";

interface AppDomain {
  domain: string;
  folder: string;
  routes: string[];
  autoTracked: true;
}

interface StoredMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: "good" | "needs-improvement" | "poor";
  navigationType: string;
  path?: string;
  domain?: string;
  deviceType?: DeviceType;
  receivedAt: string;
}

const DEVICE_LABEL: Record<DeviceType, string> = {
  mobile: "모바일",
  tablet: "태블릿",
  desktop: "웹",
};

const RATING_STYLE: Record<string, string> = {
  good: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "needs-improvement":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  poor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const UNIT: Record<string, string> = {
  LCP: "ms",
  INP: "ms",
  CLS: "",
  TTFB: "ms",
};

function formatValue(name: string, value: number): string {
  if (name === "CLS") return value.toFixed(3);
  return Math.round(value).toLocaleString();
}

function metricDomain(m: StoredMetric): string {
  return m.domain ?? (m.path === "/" ? "/" : `/${(m.path ?? "/").split("/").filter(Boolean)[0] ?? ""}`);
}

export default function WebVitalDashboardPage() {
  const [metrics, setMetrics] = useState<StoredMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedPath, setSelectedPath] = useState<string>("all");
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [appDomains, setAppDomains] = useState<AppDomain[]>([]);
  const [scannedAt, setScannedAt] = useState<string>("");

  useEffect(() => {
    fetch("/web-vital/api/domains")
      .then((res) => res.json())
      .then((data) => {
        setAppDomains(data.domains ?? []);
        setScannedAt(data.scannedAt ?? "");
      })
      .catch(() => setAppDomains([]));
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/web-vital/api");
      const data = await res.json();
      setMetrics(data.metrics ?? []);
    } finally {
      setLoading(false);
    }
  }

  const domainFiltered =
    selectedDomain === "all"
      ? metrics
      : metrics.filter((m) => metricDomain(m) === selectedDomain);

  const routesInDomain =
    selectedDomain === "all"
      ? []
      : (appDomains.find((d) => d.domain === selectedDomain)?.routes ?? []);

  const pathOptions = [
    "all",
    ...Array.from(
      new Set([
        ...routesInDomain,
        ...domainFiltered.map((m) => m.path ?? "/"),
      ])
    ).sort(),
  ];

  const filtered = domainFiltered.filter((m) => {
    if (selectedPath !== "all" && (m.path ?? "/") !== selectedPath) return false;
    if (
      selectedDevice !== "all" &&
      (m.deviceType ?? "desktop") !== selectedDevice
    )
      return false;
    return true;
  });

  const deviceOptions: Array<"all" | DeviceType> = [
    "all",
    "mobile",
    "tablet",
    "desktop",
  ];

  const latestByType = filtered.reduce<Record<string, StoredMetric>>(
    (acc, m) => {
      if (!acc[m.name]) acc[m.name] = m;
      return acc;
    },
    {}
  );

  const order = ["LCP", "INP", "CLS", "TTFB"];

  return (
    <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Web Vitals 대시보드
        </h1>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">app/</code>{" "}
          1뎁스 폴더를 자동 스캔해 도메인별 추적합니다.{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">/series</code>,{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">/alarm</code>,{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">/my-voice</code>{" "}
          등 폴더가 추가되면 재스캔 시 자동 반영됩니다.
        </p>

        {appDomains.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {appDomains.map((d) => (
              <span
                key={d.domain}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                title={`폴더: app/${d.folder === "_root" ? "page.tsx" : d.folder}/ · 라우트 ${d.routes.length}개`}
              >
                {d.domain}
                {d.routes.length > 1 ? ` (+${d.routes.length - 1})` : ""}
              </span>
            ))}
            {scannedAt && (
              <span className="self-center text-xs text-zinc-400">
                스캔: {new Date(scannedAt).toLocaleString("ko-KR")}
              </span>
            )}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "조회 중…" : "조회"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              도메인
            </span>
            <select
              value={selectedDomain}
              onChange={(e) => {
                setSelectedDomain(e.target.value);
                setSelectedPath("all");
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="all">전체</option>
              {appDomains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.domain}
                </option>
              ))}
            </select>
          </div>
          {pathOptions.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                페이지
              </span>
              <select
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {pathOptions.map((p) => (
                  <option key={p} value={p}>
                    {p === "all" ? "전체" : p || "/"}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              기기
            </span>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {deviceOptions.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "전체" : DEVICE_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && metrics.length === 0 ? (
          <p className="text-zinc-500">불러오는 중…</p>
        ) : (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {order.map((name) => {
                const m = latestByType[name];
                const rating = m?.rating ?? "good";
                return (
                  <div
                    key={name}
                    className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="mb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {name}
                    </div>
                    <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                      {m
                        ? `${formatValue(name, m.value)}${UNIT[name] ?? ""}`
                        : "—"}
                    </div>
                    {m && (
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RATING_STYLE[rating] ?? RATING_STYLE.good}`}
                      >
                        {rating === "good"
                          ? "좋음"
                          : rating === "needs-improvement"
                            ? "개선 필요"
                            : "나쁨"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <section>
              <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                최근 수집 이력 (최신 순)
                {selectedDomain !== "all" ? ` · ${selectedDomain}` : ""}
                {selectedPath !== "all" ? ` · ${selectedPath}` : ""}
                {selectedDevice !== "all"
                  ? ` · ${DEVICE_LABEL[selectedDevice as DeviceType]}`
                  : ""}
              </h2>
              {filtered.length === 0 ? (
                <p className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  아직 수집된 지표 없음. 다른 탭에서 사이트를 열거나 새로고침하면 전송됨.
                </p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                          도메인
                        </th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                          페이지
                        </th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                          기기
                        </th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                          지표
                        </th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                          값
                        </th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                          평가
                        </th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                          수신 시각
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 50).map((m, i) => (
                        <tr
                          key={`${m.id}-${m.receivedAt}-${i}`}
                          className="border-b border-zinc-100 dark:border-zinc-800"
                        >
                          <td className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                            {metricDomain(m)}
                          </td>
                          <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                            {m.path ?? "/"}
                          </td>
                          <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                            {DEVICE_LABEL[(m.deviceType ?? "desktop") as DeviceType]}
                          </td>
                          <td className="px-4 py-2 font-medium">{m.name}</td>
                          <td className="px-4 py-2">
                            {formatValue(m.name, m.value)}
                            {UNIT[m.name] ?? ""}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${RATING_STYLE[m.rating] ?? RATING_STYLE.good}`}
                            >
                              {m.rating === "good"
                                ? "좋음"
                                : m.rating === "needs-improvement"
                                  ? "개선 필요"
                                  : "나쁨"}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                            {new Date(m.receivedAt).toLocaleString("ko-KR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
