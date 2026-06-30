"use client";

import { useEffect } from "react";
import { initWebVitals } from "./lib/web-vitals";

/**
 * pathname 바뀔 때마다 init 하면 web-vitals 리스너가 중복 등록되어 POST가 경로당 폭주합니다.
 * 전송 시점의 path는 reportMetric 안에서 window.location 으로 잡습니다.
 */
export function WebVitalsInitializer() {
  useEffect(() => {
    const t = setTimeout(() => {
      initWebVitals();
    }, 200);
    return () => clearTimeout(t);
  }, []);

  return null;
}
