import { getAppDomains } from "../../../utils/route-scanner";

export default defineEventHandler(() => ({
  domains: getAppDomains(),
  framework: "nuxt",
  scannedAt: new Date().toISOString(),
  hint: "pages/ 1뎁스 폴더가 도메인으로 자동 추적됩니다.",
}));
