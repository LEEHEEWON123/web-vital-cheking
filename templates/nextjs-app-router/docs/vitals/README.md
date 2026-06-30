# Web Vitals · 성능 베이스라인

MCP와 무관한 **수집 지표·베이스라인** 문서만 둔다. 구현 코드는 `src/app/web-vital/` 참고.

| 파일 | 설명 |
|------|------|
| [core-web-vitals-baseline.md](./core-web-vitals-baseline.md) | LCP/INP/CLS 등 기준·프로젝트 베이스라인 |

## 도메인 자동 추적

`src/app/` 1뎁스 폴더가 도메인으로 자동 등록됩니다 (`/series`, `/alarm`, `/my-voice` 등).  
`GET /web-vital/api/domains` 로 확인.

Lighthouse 원시 리포트(json/txt)는 `docs/lighthouse/**` 아카이브를 보면 된다.
