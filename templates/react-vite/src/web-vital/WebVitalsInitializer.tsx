import { useEffect } from "react";
import { initWebVitals } from "./lib/web-vitals";

export function WebVitalsInitializer() {
  useEffect(() => {
    const t = setTimeout(() => initWebVitals(), 200);
    return () => clearTimeout(t);
  }, []);
  return null;
}
