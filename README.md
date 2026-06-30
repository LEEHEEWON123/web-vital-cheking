# web-vital-kit

Next.js · React · Vue · Nuxt 프로젝트에 **Web Vitals 수집·대시보드·Lighthouse 측정** 도구를 한 번에 구축하는 오픈소스 키트입니다.

Cursor / Claude 등 AI에게 **"웹 바이탈 구축해줘"** 라고 말하면 프레임워크를 자동 감지해 설치합니다.

## 지원 프레임워크

| 프레임워크 | 라우트 스캔 대상 | API 방식 |
|-----------|-----------------|----------|
| **Next.js** App Router | `src/app/` 또는 `app/` | Route Handler (`/web-vital/api`) |
| **React** + Vite | `src/pages/` | Vite dev plugin |
| **Vue** + Vite | `src/pages/` | Vite dev plugin |
| **Nuxt** | `pages/` | Nitro server routes |

## 특징

- **라우트 prefix:** `/web-vital` (대시보드, API)
- **도메인 자동 추적:** 폴더 라우팅 구조를 스캔해 `/series`, `/alarm`, `/my-voice` 등 자동 등록
- **수집 지표:** LCP, INP, CLS, TTFB (Google `web-vitals` v5)
- **Lighthouse CLI:** Slow 4G / Fast 4G / No throttling
- **Cursor AI:** `.cursor/rules/web-vital-kit.mdc` 자동 설치

## 빠른 시작

### Cursor에서

```
웹 바이탈 구축해줘
```

### CLI

```bash
# 프레임워크 자동 감지
npx github:LEEHEEWON123/web-vital-cheking init

# 명시적 지정
npx web-vital-kit init --framework next
npx web-vital-kit init --framework react
npx web-vital-kit init --framework vue
npx web-vital-kit init --framework nuxt

yarn install && yarn dev
```

대시보드: [http://localhost:3000/web-vital/dashboard](http://localhost:3000/web-vital/dashboard)

## 핵심: 도메인 자동 추적

폴더 라우팅 구조 = 도메인. **설정 없이** 폴더만 추가하면 추적됩니다.

### Next.js (`app/`)

```
src/app/
├── page.tsx       → /
├── series/        → /series
└── my-voice/      → /my-voice
```

### React / Vue (`pages/`)

```
src/pages/
├── index.tsx      → /
├── series/        → /series
└── my-voice/      → /my-voice
```

### Nuxt (`pages/`)

```
pages/
├── index.vue      → /
├── series/        → /series
└── my-voice/      → /my-voice
```

```bash
curl http://localhost:3000/web-vital/api/domains
```

## 프레임워크별 설치 결과

### Next.js

```
src/app/web-vital/     # Route Handlers + 대시보드
layout.tsx             # WebVitalsInitializer 자동 패치
```

### React / Vue (Vite)

```
src/web-vital/         # 수집 컴포넌트 + 대시보드
src/pages/web-vital/   # /web-vital/dashboard 라우트
web-vital-kit/         # Vite plugin + route scanner
vite.config.ts         # plugin 자동 패치
web-vital.config.json  # pagesDir, extensions
```

### Nuxt

```
pages/web-vital/dashboard.vue
plugins/web-vitals.client.ts
server/routes/web-vital/api/   # GET/POST /web-vital/api
server/utils/route-scanner.ts
```

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/web-vital/api` | 지표 수집 |
| GET | `/web-vital/api` | 수집 목록 |
| GET | `/web-vital/api/domains` | 도메인 자동 스캔 |
| GET | `/web-vital/api/routes` | 전체 라우트 |
| GET | `/web-vital/dashboard` | 대시보드 |

## Lighthouse

```bash
yarn build && yarn start   # Next/Nuxt
LIGHTHOUSE_URL=http://127.0.0.1:3000 yarn perf:lighthouse:network
```

## CLI 옵션

```bash
npx web-vital-kit init --framework react --cwd ./my-app
npx web-vital-kit init --dry-run
npx web-vital-kit init --force
```

## Cursor AI

| 파일 | 용도 |
|------|------|
| `.cursor/rules/web-vital-kit.mdc` | "웹 바이탈 구축해줘" 트리거 |
| [AGENTS.md](./AGENTS.md) | AI 에이전트 설치 지침 |
| [skills/install-web-vitals/SKILL.md](./skills/install-web-vitals/SKILL.md) | Cursor Skill |

## 데이터 저장

- **dev:** `{logsDir}/{도메인폴더}/{날짜}.ndjson`
- **런타임:** 서버 메모리 (최대 500건)

## 라이선스

MIT — [LICENSE](./LICENSE)
