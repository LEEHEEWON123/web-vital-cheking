---
name: install-web-vitals
description: Next.js App Router 프로젝트에 web-vital-kit으로 Web Vitals 수집·대시보드·Lighthouse 측정 도구를 자동 구축합니다. 사용자가 "웹 바이탈 구현해줘", "Core Web Vitals 추가", "성능 모니터링 구축" 등을 요청할 때 사용하세요.
---

# Web Vitals 자동 구축 (web-vital-kit)

## When to use

- 사용자가 자연어로 Web Vitals / Core Web Vitals / 성능 모니터링 구현을 요청할 때
- Next.js App Router 프로젝트에 `/web-vital` 라우트 기반 도구가 필요할 때
- Lighthouse 네트워크 프로필 측정 스크립트까지 함께 넣어야 할 때

## Quick path (preferred)

1. 대상이 Next.js App Router인지 확인 (`src/app` 또는 `app`, `next` 의존성)
2. 프로젝트 루트에서 실행:

```bash
npx web-vital-kit init
```

로컬에 이 레포가 있으면:

```bash
node /path/to/web-vital-cheking/bin/web-vital-kit.mjs init --cwd .
```

3. 의존성 설치: `yarn install` (또는 npm/pnpm)
4. `layout.tsx`에 `WebVitalsInitializer`가 없으면 추가 (CLI가 대부분 처리)
5. 검증: `yarn dev` → `/web-vital/dashboard` 접속, 다른 페이지 방문 후 지표 수집 확인

## Route prefix (fixed)

모든 라우트는 **`/web-vital`** prefix를 사용합니다.

| URL | 역할 |
|-----|------|
| `/web-vital/dashboard` | 대시보드 |
| `/web-vital/api` | POST 수집 / GET 조회 |
| `/web-vital/api/routes` | 앱 라우트 목록 |

## Manual fallback

CLI 실패 시 `AGENTS.md` 및 `templates/nextjs-app-router/`를 참고해 파일을 직접 복사합니다.

## After install

- README 또는 프로젝트 docs에 Web Vitals 섹션 추가 권장
- `.gitignore`에 `src/web-vital-logs/` 포함 확인
- Lighthouse: `LIGHTHOUSE_URL=http://127.0.0.1:3000 yarn perf:lighthouse:network`

## Do not

- `/vitals` 등 다른 prefix로 설치하지 말 것 (이 키트 표준은 `/web-vital`)
- 프로덕션 영구 저장을 약속하지 말 것 (현재는 인메모리 + dev ndjson 로그)

## Reference

- Full agent guide: [AGENTS.md](../../AGENTS.md)
- User docs: [README.md](../../README.md)
