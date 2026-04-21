# LunchLaunch

AI 기반 "오늘의 메뉴 추천 + 식당 매칭" 서비스입니다.

- FE: Next.js 14 + Tailwind + shadcn/ui 스타일
- BE/DB: Supabase
- Crawling: Naver Map 수동 크롤링 (Playwright)
- AI: OpenAI (미설정 시 fallback 규칙 추천)
- Auth: Supabase Auth (Google OAuth)

## 빠른 시작
```bash
npm install
cp .env.example .env.local
npm run dev
```

## 주요 커맨드
```bash
npm run dev
npm run check
npm run crawl:naver -- --region "서울 영등포구 여의도동"
npm run crawl:matrix -- --region "서울 영등포구 여의도동"
npm run crawl:yeouido-full -- --region "서울 영등포구 여의도동" --max-queries 30
npm run backfill:signals
npm run recommend:dry -- --region "서울 영등포구 여의도동" --user-id "<UUID>"
npm run ops:daily -- --region "서울 영등포구 여의도동"
npm run audit:recommendation:full
```

## 문서
- [Architecture](./docs/ARCHITECTURE.md)
- [Setup](./docs/SETUP.md)
- [API Spec](./docs/API_SPEC.md)
- [Crawler Notes](./docs/CRAWLER_NOTES.md)
- [Security & Auth](./docs/SECURITY_AND_AUTH.md)
- [RLS Policy Matrix](./docs/RLS_POLICY_MATRIX.md)
- [Coverage Metrics](./docs/COVERAGE_METRICS.md)
- [Recommendation Quality Plan](./docs/RECOMMENDATION_QUALITY_PLAN.md)
- [Recommendation Audit Report](./docs/AUDIT_RECOMMENDATION_RISK_REPORT.md)
- [Round Report 2026-04-21](./docs/ROUND_REPORT_2026-04-21.md)
- [Yeouido Full Crawl](./docs/YEOUIDO_FULL_CRAWL.md)
- [Mobile UX Spec](./docs/MOBILE_UX_SPEC.md)
- [Operations Runbook](./docs/OPERATIONS_RUNBOOK.md)
- [Deploy Checklist](./docs/DEPLOY_CHECKLIST.md)

## Supabase
- 마이그레이션: `supabase/migrations/202604120001_init.sql`
- 보안/거리/캐시: `supabase/migrations/202604120002_security_and_distance.sql`
- 시그널/가격대 메타: `supabase/migrations/202604120003_restaurant_signals.sql`

## 구현 상태
- [x] 수동 크롤링 API + CLI
- [x] 오늘의 컨텍스트 기반 AI 메뉴 추천
- [x] 추천 메뉴 기반 식당 매칭 및 기록
- [x] 운영 대시보드 UI
- [x] 로그인 사용자 전용 추천 API + Google OAuth
- [x] 여의대로66 기준 도보 버킷(5분/10분/15~20분)
