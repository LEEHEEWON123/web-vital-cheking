import { NextResponse } from "next/server";
import { getAppDomains } from "../../lib/app-routes";

/**
 * GET /web-vital/api/domains
 * app/ 1뎁스 폴더를 스캔해 자동 등록된 도메인 목록을 반환합니다.
 * src/app/series/, alarm/, my-voice/ 등이 추가되면 재요청 시 자동 반영됩니다.
 */
export async function GET() {
  try {
    const domains = getAppDomains();
    return NextResponse.json({
      domains,
      scannedAt: new Date().toISOString(),
      hint: "app/ 에 page.tsx가 있는 1뎁스 폴더가 도메인으로 자동 추적됩니다.",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to scan domains", domains: [] },
      { status: 500 }
    );
  }
}
