# AI Agent Instructions — web-vital-kit

이 문서는 Claude, Cursor, Codex 등 AI 코딩 에이전트가 **자연어 요청**으로 Web Vitals 도구를 자동 구축할 때 따르는 지침입니다.

## 트리거 문구 (예시)

사용자가 아래와 비슷하게 요청하면 이 키트를 설치합니다.

- "이 프로젝트에 맞는 웹 바이탈 구현해줘"
- "Web Vitals 수집·대시보드 구축해줘"
- "Core Web Vitals 모니터링 추가해줘"
- "Lighthouse 성능 측정 스크립트도 같이 넣어줘"

## 사전 조건

- **Next.js App Router** 프로젝트 (`src/app` 또는 `app` 디렉터리 존재)
- Node.js 18+
- `package.json` 존재

## 자동 설치 (권장)

프로젝트 루트에서:

```bash
npx web-vital-kit init
```

또는 로컬 클론에서:

```bash
node /path/to/web-vital-cheking/bin/web-vital-kit.mjs init --cwd .
```

설치 후 패키지 매니저로 의존성 설치:

```bash
yarn install   # 또는 npm install / pnpm install
```

## 설치되는 것

| 경로 | 설명 |
|------|------|
| `src/app/web-vital/` | 수집·API·대시보드 (라우트 prefix: `/web-vital`) |
| `scripts/run-lighthouse-network*.mjs` | Lighthouse CLI 측정 |
| `scripts/lighthouse-throttle-presets.json` | Slow4G / Fast4G / None 프리셋 |
| `docs/vitals/` | Core Web Vitals 기준 문서 |
| `docs/lighthouse/` | Lighthouse 결과 아카이브 |

### API 엔드포인트

- `POST /web-vital/api` — 지표 수집 (LCP, INP, CLS, TTFB)
- `GET /web-vital/api` — 수집 목록 조회 (메모리, 최대 500건)
- `GET /web-vital/api/routes` — 앱 라우트 스캔
- `GET /web-vital/dashboard` — 대시보드 UI

### package.json 변경

**dependencies:** `web-vitals`  
**devDependencies:** `lighthouse`  
**scripts:**

```json
{
  "perf:lighthouse:slow4g": "node scripts/run-lighthouse-network.mjs slow4g",
  "perf:lighthouse:fast4g": "node scripts/run-lighthouse-network.mjs fast4g",
  "perf:lighthouse:none": "node scripts/run-lighthouse-network.mjs none",
  "perf:lighthouse:network": "node scripts/run-lighthouse-network-all.mjs"
}
```

### layout.tsx 패치

`WebVitalsInitializer`를 루트 `layout.tsx`의 `<body>` 안에 추가합니다.

```tsx
import { WebVitalsInitializer } from "./web-vital/WebVitalsInitializer";

// ...
<body>
  <WebVitalsInitializer />
  {children}
</body>
```

CLI가 자동 패치합니다. 실패 시 위 코드를 수동 추가하세요.

## 수동 설치 (CLI 없이)

1. `templates/nextjs-app-router/` 내용을 대상 프로젝트에 복사
2. `package.json`에 의존성·스크립트 추가
3. `.gitignore`에 `src/web-vital-logs/`, `docs/lighthouse/network-profiles/latest-*.json` 추가
4. `layout.tsx`에 `WebVitalsInitializer` 추가

## 검증 체크리스트

- [ ] `yarn dev` 후 `/web-vital/dashboard` 접속 가능
- [ ] 다른 페이지 방문 후 대시보드에서 LCP/INP/CLS/TTFB 수집 확인
- [ ] dev 환경에서 `src/web-vital-logs/` ndjson 생성 확인
- [ ] `yarn build && yarn start` 후 Lighthouse 스크립트 실행 가능

## 주의사항

- 수집 데이터는 **서버 메모리**에만 저장 (재시작 시 초기화). 운영 영구 저장은 DB 연동 필요.
- `src/app/web-vital/lib/app-routes.ts`는 `src/app` 기준으로 라우트를 스캔합니다. `app/` only 구조면 해당 파일의 `APP_DIR`을 수정하세요.
- 이미 `/web-vital` 폴더가 있으면 `npx web-vital-kit init --force` 사용.

## 관련 파일

- [skills/install-web-vitals/SKILL.md](./skills/install-web-vitals/SKILL.md) — Cursor Skill
- [README.md](./README.md) — 사용자 문서
