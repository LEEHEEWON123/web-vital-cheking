import { initWebVitals } from "../utils/web-vitals";

export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    setTimeout(() => initWebVitals(), 200);
  }
});
