# web-vital-kit

Next.js App Router 프로젝트에 **Web Vitals 수집·대시보드·Lighthouse 측정** 도구를 한 번에 구축하는 오픈소스 키트입니다.

Claude / Cursor 등 AI 에이전트에게 **"이 프로젝트에 맞는 웹 바이탈 구현해줘"** 라고 말하면, 이 패키지가 프로젝트 구조에 맞게 도구를 자동 설치합니다.

## 특징

- **라우트 prefix:** `/web-vital` (대시보드, API, 라우트 스캔)
- **수집 지표:** LCP, INP, CLS, TTFB (`web-vitals` v5)
- **대시보드:** `/web-vital/dashboard` — 페이지·기기별 필터
- **Lighthouse CLI:** Slow 4G / Fast 4G / No throttling 3종 네트워크 프로필
- **AI 친화:** `AGENTS.md` + Cursor Skill (`skills/install-web-vitals/`)

## 빠른 시작

### 1. AI에게 자연어로 요청

```
이 프로젝트에 맞는 웹 바이탈 구현해줘
```

에이전트는 `npx web-vital-kit init` 을 실행하고 `layout.tsx`를 패치합니다.

### 2. CLI로 직접 설치

```bash
# 대상 Next.js 프로젝트 루트에서
npx web-vital-kit init

# 또는 GitHub에서
npx github:LEEHEEWON123/web-vital-cheking init

yarn install
yarn dev
```

브라우저에서 [http://localhost:3000/web-vital/dashboard](http://localhost:3000/web-vital/dashboard) 를 열고, 다른 페이지를 방문한 뒤 **조회** 버튼으로 지표를 확인합니다.

## 설치되는 구조

```text
your-next-app/
├─ src/app/web-vital/          # 또는 app/web-vital/
│  ├─ WebVitalsInitializer.tsx
│  ├─ api/route.ts             # POST /web-vital/api
│  ├─ api/routes/route.ts
│  ├─ dashboard/page.tsx       # GET /web-vital/dashboard
│  └─ lib/
│     ├─ web-vitals.ts
│     └─ app-routes.ts
├─ scripts/
│  ├─ run-lighthouse-network.mjs
│  ├─ run-lighthouse-network-all.mjs
│  └─ lighthouse-throttle-presets.json
├─ docs/vitals/                # Core Web Vitals 기준 문서
└─ docs/lighthouse/            # Lighthouse 결과 아카이브
```

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/web-vital/api` | 지표 수집 (단건 또는 `{ metrics: [] }` 배치) |
| GET | `/web-vital/api` | 수집 목록 (메모리, 최대 500건) |
| GET | `/web-vital/api/routes` | App Router 라우트 목록 |
| GET | `/web-vital/dashboard` | 대시보드 UI |

## Lighthouse 측정

```bash
yarn build && yarn start

LIGHTHOUSE_URL=http://127.0.0.1:3000 yarn perf:lighthouse:network
# 또는 단일: perf:lighthouse:slow4g | fast4g | none
```

결과: `docs/lighthouse/network-profiles/baseline.md`, `summary-*.json`

## CLI 옵션

```bash
npx web-vital-kit init --cwd ./my-app   # 대상 디렉터리 지정
npx web-vital-kit init --dry-run      # 변경 없이 미리보기
npx web-vital-kit init --force        # 기존 web-vital 폴더 덮어쓰기
```

## AI 에이전트 연동

| 파일 | 용도 |
|------|------|
| [AGENTS.md](./AGENTS.md) | Claude / Codex / Cursor 공통 설치 지침 |
| [skills/install-web-vitals/SKILL.md](./skills/install-web-vitals/SKILL.md) | Cursor Skill (자연어 트리거) |

### Cursor에 Skill 등록

`skills/install-web-vitals/SKILL.md` 를 Cursor skills 폴더에 복사하거나, 이 레포를 참조하도록 설정합니다.

## 요구사항

- Node.js 18+
- Next.js App Router (`src/app` 또는 `app`)
- Tailwind CSS 권장 (대시보드 UI — 없어도 동작은 함)

## 데이터 저장

- **개발:** `src/web-vital-logs/{경로}/{날짜}.ndjson` (rating별 개선 제안 포함)
- **런타임:** 서버 메모리 (최대 500건, 재시작 시 초기화)
- 운영 영구 보관이 필요하면 `api/route.ts`에 DB/외부 저장소를 연동하세요.

## 라이선스

MIT — [LICENSE](./LICENSE)

## 기여

이슈·PR 환영합니다. `vogopang_front` 프로덕션 경험을 바탕으로 `/web-vital` prefix로 정리한 오픈소스 버전입니다.
