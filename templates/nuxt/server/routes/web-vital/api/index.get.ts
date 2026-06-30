import { getAppDomains } from "../../utils/route-scanner";
import { getMetrics } from "../../utils/vitals-store";

export default defineEventHandler(() => ({
  metrics: getMetrics(),
  domains: getAppDomains(),
}));
