# Lighthouse 네트워크 프로필 (Slow 4G / Fast 4G / No throttling)

로컬에서 `next build` 후 `next start`가 떠 있는 상태에서 측정합니다.

```bash
LIGHTHOUSE_URL=http://127.0.0.1:3000/ yarn perf:lighthouse:network
```

- 단일 실행: `yarn perf:lighthouse:slow4g` / `yarn perf:lighthouse:fast4g` / `yarn perf:lighthouse:none`
- 프리셋: `scripts/lighthouse-throttle-presets.json` (`none` = Lighthouse 권장형 에뮬·스로틀 끔)
- 요약·표: `baseline.md`, `summary-{slow4g,fast4g,none}.json`
- 원시 Lighthouse JSON: `latest-*.json` (`.gitignore`)
