# Security & Auth

## 인증 원칙
- 추천 API는 로그인 사용자만 허용
- 크롤링 API는 로그인 + `MANUAL_TRIGGER_TOKEN` 이중 검증
- Google OAuth(PKCE) 기반으로 모바일 세션 갱신 자동화

## 세션/토큰 관리
- 브라우저 클라이언트: `persistSession`, `autoRefreshToken`, `flowType: pkce`
- 미들웨어에서 `supabase.auth.getUser()`를 호출해 세션 갱신 유지
- 로그아웃 시 세션 폐기 및 UI 상태 초기화

## API 보호
- 추천 API: 사용자+IP 기준 메모리 rate limit
- 지역 제한: `ALLOWED_REGION_KEYWORD`(기본 `여의도동`) 외 요청 차단
- 관리자 API: 토큰 불일치 시 즉시 401

## DB 정책
- `202604120002_security_and_distance.sql`에서 RLS 활성화
- `restaurants`, `daily_context`: 인증 사용자 읽기 허용
- `user_preferences`: 본인 데이터만 읽기/쓰기
- `menu_recommendations`: 본인 데이터만 읽기/쓰기
- `recommendation_restaurants`: 본인 추천 레코드에 연결된 데이터만 읽기
- `geocode_cache`, `crawl_jobs`: 서비스 롤 중심 운용

## 운영 체크
- Supabase Auth Provider에 Google만 우선 활성화
- 운영 도메인 callback URL 등록
- 서비스 롤 키는 서버에서만 사용
- `MANUAL_TRIGGER_TOKEN`은 32자 이상 랜덤 문자열 권장
