import { NextResponse } from "next/server";
import { getAppDomains, getAppRoutes } from "../../lib/app-routes";

export async function GET() {
  try {
    const routes = getAppRoutes("")
      .filter((p) => !p.startsWith("/web-vital"))
      .sort((a, b) => a.localeCompare(b));
    const domains = getAppDomains();
    return NextResponse.json({ routes, domains });
  } catch {
    return NextResponse.json(
      { error: "Failed to scan routes", routes: [], domains: [] },
      { status: 500 }
    );
  }
}
