---
name: install-web-vitals
description: Next.js App Router 프로젝트에 web-vital-kit으로 Web Vitals 수집·대시보드·Lighthouse 측정 도구를 자동 구축합니다. 사용자가 "웹 바이탈 구축해줘", "웹 바이탈 구현해줘", "Core Web Vitals 추가", "성능 모니터링 구축" 등을 요청할 때 사용하세요.
---

# Web Vitals 자동 구축 (web-vital-kit)

## When to use

- 사용자가 **"웹 바이탈 구축해줘"** 등 자연어로 Web Vitals 구현을 요청할 때
- Next.js App Router 프로젝트에 `/web-vital` 라우트 기반 도구가 필요할 때
- `app/series`, `app/alarm`, `app/my-voice` 등 **도메인별 자동 추적**이 필요할 때

## Quick path (preferred)

1. 대상이 Next.js App Router인지 확인 (`src/app` 또는 `app`, `next` 의존성)
2. 프로젝트 루트에서 실행:

```bash
npx web-vital-kit init
```

또는:

```bash
npx github:LEEHEEWON123/web-vital-cheking init
```

3. 의존성 설치: `yarn install`
4. `layout.tsx`에 `WebVitalsInitializer` 확인
5. 검증: `yarn dev` → `/web-vital/dashboard`

## 핵심: 도메인 자동 추적

`src/app/` **1뎁스 폴더 = 도메인**으로 자동 인식됩니다.

```
src/app/
├── page.tsx          → 도메인 /
├── series/           → 도메인 /series  (자동 추적)
├── alarm/            → 도메인 /alarm   (자동 추적)
└── my-voice/         → 도메인 /my-voice (자동 추적)
```

- `src/app/series/` 폴더를 추가하면 `/series` 도메인이 **설정 없이** 자동 등록
- `GET /web-vital/api/domains` — 스캔된 도메인 목록
- dev 로그: `src/web-vital-logs/series/`, `src/web-vital-logs/my-voice/` 등 도메인별 폴더

## Route prefix (fixed)

| URL | 역할 |
|-----|------|
| `/web-vital/dashboard` | 도메인·페이지별 대시보드 |
| `/web-vital/api` | POST 수집 / GET 조회 |
| `/web-vital/api/domains` | app/ 스캔 — 도메인 자동 목록 |
| `/web-vital/api/routes` | 전체 App Router 라우트 |

## Cursor 연동

설치 시 `.cursor/rules/web-vital-kit.mdc` 가 복사됩니다.  
Cursor에서 "웹 바이탈 구축해줘"만 입력해도 이 스킬/룰이 트리거됩니다.

## Do not

- `/vitals` 등 다른 prefix 사용 금지 (표준: `/web-vital`)
- 도메인을 수동 등록 파일로 관리하지 말 것 — `app/` 폴더 스캔이 소스 of truth

## Reference

- [AGENTS.md](../../AGENTS.md)
- [README.md](../../README.md)
