import { getAppDomains, getAppRoutes } from "../../../utils/route-scanner";

export default defineEventHandler(() => ({
  routes: getAppRoutes().sort(),
  domains: getAppDomains(),
}));
