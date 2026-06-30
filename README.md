# web-vital-kit

Next.js App Router 프로젝트에 **Web Vitals 수집·대시보드·Lighthouse 측정** 도구를 한 번에 구축하는 오픈소스 키트입니다.

Cursor / Claude 등 AI에게 **"웹 바이탈 구축해줘"** 라고 말하면 자동 설치됩니다.

## 특징

- **라우트 prefix:** `/web-vital` (대시보드, API)
- **도메인 자동 추적:** `src/app/` 1뎁스 폴더를 스캔해 `/series`, `/alarm`, `/my-voice` 등 자동 등록
- **수집 지표:** LCP, INP, CLS, TTFB (`web-vitals` v5)
- **대시보드:** 도메인·페이지·기기별 필터
- **Lighthouse CLI:** Slow 4G / Fast 4G / No throttling
- **Cursor AI:** `.cursor/rules/web-vital-kit.mdc` 자동 설치

## 빠른 시작

### Cursor에서 자연어로

```
웹 바이탈 구축해줘
```

에이전트가 `npx web-vital-kit init` 을 실행하고, Cursor 룰·도메인 자동 추적이 적용됩니다.

### CLI로 직접 설치

```bash
npx github:LEEHEEWON123/web-vital-cheking init
yarn install
yarn dev
```

[http://localhost:3000/web-vital/dashboard](http://localhost:3000/web-vital/dashboard)

## 핵심: 도메인 자동 추적

`app/` 폴더 구조 = 도메인. **설정 파일 없이** 폴더만 추가하면 추적됩니다.

```
src/app/
├── page.tsx          → 도메인 /
├── series/           → /series   ← 폴더 추가 시 자동 추적
│   └── [id]/page.tsx
├── alarm/            → /alarm
└── my-voice/         → /my-voice
```

| app 폴더 추가 | 자동 등록 도메인 | dev 로그 폴더 |
|---------------|------------------|---------------|
| `app/series/` | `/series` | `src/web-vital-logs/series/` |
| `app/alarm/` | `/alarm` | `src/web-vital-logs/alarm/` |
| `app/my-voice/` | `/my-voice` | `src/web-vital-logs/my-voice/` |

```bash
# 등록된 도메인 확인 (매 요청마다 app/ 재스캔)
curl http://localhost:3000/web-vital/api/domains
```

응답 예시:

```json
{
  "domains": [
    { "domain": "/", "folder": "_root", "routes": ["/"], "autoTracked": true },
    { "domain": "/series", "folder": "series", "routes": ["/series", "/series/[id]"], "autoTracked": true },
    { "domain": "/my-voice", "folder": "my-voice", "routes": ["/my-voice"], "autoTracked": true }
  ],
  "scannedAt": "2026-06-30T12:00:00.000Z"
}
```

## 설치되는 구조

```text
your-next-app/
├─ .cursor/rules/
│  └─ web-vital-kit.mdc         # Cursor "웹 바이탈 구축해줘" 트리거
├─ src/app/web-vital/
│  ├─ WebVitalsInitializer.tsx
│  ├─ api/route.ts
│  ├─ api/domains/route.ts      # 도메인 자동 스캔 API
│  ├─ api/routes/route.ts
│  ├─ dashboard/page.tsx
│  └─ lib/app-routes.ts         # app/ 폴더 스캔 엔진
├─ scripts/                     # Lighthouse
└─ docs/vitals/
```

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/web-vital/api` | 지표 수집 |
| GET | `/web-vital/api` | 수집 목록 |
| GET | `/web-vital/api/domains` | **도메인 자동 스캔** |
| GET | `/web-vital/api/routes` | 전체 라우트 목록 |
| GET | `/web-vital/dashboard` | 대시보드 UI |

## Lighthouse

```bash
yarn build && yarn start
LIGHTHOUSE_URL=http://127.0.0.1:3000 yarn perf:lighthouse:network
```

## Cursor AI 연동

| 파일 | 용도 |
|------|------|
| `.cursor/rules/web-vital-kit.mdc` | `init` 시 자동 복사 — "웹 바이탈 구축해줘" 트리거 |
| [AGENTS.md](./AGENTS.md) | Claude / Codex 공통 지침 |
| [skills/install-web-vitals/SKILL.md](./skills/install-web-vitals/SKILL.md) | Cursor Skill |

## CLI 옵션

```bash
npx web-vital-kit init --cwd ./my-app
npx web-vital-kit init --dry-run
npx web-vital-kit init --force
```

## 데이터 저장

- **dev:** `src/web-vital-logs/{도메인폴더}/{날짜}.ndjson`
- **런타임:** 서버 메모리 (최대 500건)

## 라이선스

MIT — [LICENSE](./LICENSE)
