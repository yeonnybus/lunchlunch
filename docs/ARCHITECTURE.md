# LunchLaunch Architecture

## 1) 목표
- 네이버 지도 기반 식당 데이터 수집 (수동 실행)
- 오늘의 컨텍스트(날씨/기념일/상황/사용자 취향) 기반 메뉴 추천
- 추천 메뉴와 실제 식당 매칭
- 여의대로66 기준 도보 버킷(5분/10분/15~20분) 우선 제시

## 2) 스택
- FE: Next.js 14 (App Router), Tailwind, shadcn/ui 스타일 컴포넌트
- BE + DB: Supabase (Postgres)
- Crawling: Playwright (수동 트리거)
- AI: OpenAI API (`OPENAI_MODEL`)
- Auth: Supabase Auth (Google OAuth, PKCE)

## 3) 모듈 구조
- `src/app/api/crawl/naver/route.ts`: 수동 크롤링 API
- `src/app/api/recommend/today/route.ts`: 당일 추천 API
- `src/app/auth/callback/route.ts`: OAuth callback 처리
- `src/lib/crawler/*`: 네이버 지도 수집 및 정규화
- `src/lib/services/*`: 크롤링/추천 유즈케이스
- `src/lib/repositories/*`: DB 접근 계층
- `src/lib/domain/recommendation-intent.ts`: 사용자 요청 의도(가격대/음식타입/점심정책) 모델
- `src/lib/domain/menu-inference.ts`: 식당명/카테고리/raw 기반 메뉴 추론
- `src/lib/domain/restaurant-signals.ts`: 식당 가격대/프리미엄 리스크/타입 태그 추출
- `src/lib/domain/walk-distance.ts`: 거리 계산/도보 버킷 분류
- `src/lib/security/rate-limit.ts`: 사용자/IP 단위 호출 제한
- `supabase/migrations/*`: 스키마

## 4) 데이터 흐름
1. 운영자가 대시보드에서 수동 크롤링 실행
2. `crawl_jobs` 기록 생성 후 Playwright 크롤러 실행
3. 수집 결과를 `restaurants` upsert
4. 추천 요청 시 `daily_context` 생성/업데이트
5. AI가 메뉴 5개 선정 (`menu_recommendations` 저장)
6. 메뉴 기반 식당 매칭
7. 좌표 보강(캐시+지오코딩) 후 거리 계산
8. 도보 버킷 반영 정렬 후 `recommendation_restaurants` 저장

## 5) 핵심 테이블
- `restaurants`: 식당 마스터 (`price_tier`, `premium_risk_score`, `cuisine_tags` 포함)
- `crawl_jobs`: 수집 실행 이력
- `daily_context`: 날짜별 컨텍스트
- `user_preferences`: 사용자 취향
- `menu_recommendations`: 추천 결과 로그
- `recommendation_restaurants`: 추천-식당 연결
- `geocode_cache`: 주소 지오코딩 캐시

## 6) 운영 주의사항
- 네이버 지도 DOM 구조가 바뀌면 셀렉터 업데이트가 필요함
- "특정 지역의 모든 식당"은 플랫폼/정책/검색 노출 제약으로 100% 보장 어려움
- ToS 및 robots 정책 검토 후 운영 필요
- 추천 API는 로그인 사용자만 허용하며 rate limit 적용
- 크롤링 API는 로그인 + 관리자 토큰 이중 검증
