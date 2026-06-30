# AI Agent Instructions — web-vital-kit

이 문서는 Claude, Cursor, Codex 등 AI 코딩 에이전트가 **자연어 요청**으로 Web Vitals 도구를 자동 구축할 때 따르는 지침입니다.

## 트리거 문구 (예시)

- **"웹 바이탈 구축해줘"** ← Cursor에서 가장 많이 쓰는 문구
- "이 프로젝트에 맞는 웹 바이탈 구현해줘"
- "Web Vitals 수집·대시보드 구축해줘"
- "Core Web Vitals 모니터링 추가해줘"
- "Lighthouse 성능 측정 스크립트도 같이 넣어줘"

## 사전 조건

- **Next.js** App Router / **React+ Vite** / **Vue+Vite** / **Nuxt**
- Node.js 18+
- `package.json` 존재

## 자동 설치

```bash
npx web-vital-kit init
# 프레임워크 자동 감지: next | react | vue | nuxt
npx web-vital-kit init --framework react
```

## 핵심: 도메인 자동 추적 (프레임워크별 스캔 경로)

| 프레임워크 | 스캔 폴더 | 예시 도메인 |
|-----------|----------|------------|
| Next.js | `src/app/` | `/series`, `/my-voice` |
| React (Vite) | `src/pages/` | `/series`, `/alarm` |
| Vue (Vite) | `src/pages/` | `/series`, `/alarm` |
| Nuxt | `pages/` | `/series`, `/my-voice` |

폴더 추가 시 `GET /web-vital/api/domains` 재요청으로 자동 반영.

## 설치되는 것

| 경로 | 설명 |
|------|------|
| `src/app/web-vital/` | 수집·API·대시보드 (`/web-vital` prefix) |
| `.cursor/rules/web-vital-kit.mdc` | **Cursor AI 자연어 트리거 룰** |
| `scripts/run-lighthouse-network*.mjs` | Lighthouse CLI |
| `docs/vitals/`, `docs/lighthouse/` | 문서 |

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/web-vital/api` | 지표 수집 (LCP, INP, CLS, TTFB) |
| GET | `/web-vital/api` | 수집 목록 + domains 요약 |
| GET | `/web-vital/api/domains` | **app/ 스캔 — 도메인 자동 목록** |
| GET | `/web-vital/api/routes` | 전체 App Router 라우트 |
| GET | `/web-vital/dashboard` | 도메인·페이지별 대시보드 |

### layout.tsx 패치

```tsx
import { WebVitalsInitializer } from "./web-vital/WebVitalsInitializer";

<body>
  <WebVitalsInitializer />
  {children}
</body>
```

## Cursor AI 연동

`init` 실행 시 `.cursor/rules/web-vital-kit.mdc` 가 대상 프로젝트에 복사됩니다.

Cursor에서 **"웹 바이탈 구축해줘"** 입력 → 룰이 트리거되어 `npx web-vital-kit init` 실행.

## 검증 체크리스트

- [ ] `/web-vital/dashboard` 접속
- [ ] `/web-vital/api/domains` 에 app/ 도메인 목록 표시
- [ ] `src/app/series/` 추가 후 domains API에 `/series` 반영
- [ ] 페이지 방문 후 도메인별 지표 수집
- [ ] `src/web-vital-logs/series/` ndjson 생성 (dev)

## 관련 파일

- [skills/install-web-vitals/SKILL.md](./skills/install-web-vitals/SKILL.md) — Cursor Skill
- [.cursor/rules/web-vital-kit.mdc](./.cursor/rules/web-vital-kit.mdc) — Cursor Rule
- [README.md](./README.md) — 사용자 문서
