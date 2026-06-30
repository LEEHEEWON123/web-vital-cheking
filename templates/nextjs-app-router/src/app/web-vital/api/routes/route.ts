import { NextResponse } from "next/server";
import { getAppRoutes } from "../../lib/app-routes";

export async function GET() {
  try {
    const routes = getAppRoutes("")
      .filter((p) => p !== "/web-vital/dashboard")
      .sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ routes });
  } catch {
    return NextResponse.json(
      { error: "Failed to scan routes", routes: [] },
      { status: 500 }
    );
  }
}
