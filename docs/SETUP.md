# Setup Guide

## 1) 설치
```bash
npm install
```

## 2) 환경변수
```bash
cp .env.example .env.local
```

필수 값:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MANUAL_TRIGGER_TOKEN`

선택 값:
- `OPENAI_API_KEY` (없으면 룰 기반 fallback)

권장 값:
- `ALLOWED_REGION_KEYWORD=여의도동`
- `WORKPLACE_ADDRESS=서울 영등포구 여의대로 66`
- `WORKPLACE_LAT`, `WORKPLACE_LNG`

## 3) Supabase 마이그레이션
`supabase/migrations/202604120001_init.sql`를 SQL Editor에서 실행

이어서 아래 마이그레이션도 실행:
- `supabase/migrations/202604120002_security_and_distance.sql`
- `supabase/migrations/202604120003_restaurant_signals.sql`

## 4) Supabase Auth - Google OAuth 설정
1. Supabase Dashboard → Authentication → Providers → Google 활성화
2. Google Cloud Console에서 OAuth Client 생성
3. Authorized redirect URI에 Supabase Callback URL 등록
4. Supabase에 Google Client ID/Secret 입력

권장 Redirect URL:
- `http://localhost:3000/auth/callback`
- 운영 도메인 `https://<your-domain>/auth/callback`

## 5) Playwright 브라우저 설치
```bash
npx playwright install chromium
```

## 6) 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 7) 수동 크롤링 실행
### UI
- 메인 페이지에서 지역, 토큰 입력 후 실행

### CLI
```bash
npm run crawl:naver -- --region "서울 영등포구 여의도동"
```

데이터 품질 향상을 위한 다중 쿼리 수집:
```bash
npm run crawl:matrix -- --region "서울 영등포구 여의도동"
```

## 8) 추천 Dry Run
```bash
npm run recommend:dry -- --region "서울 영등포구 여의도동" --user-id "<UUID>"
```

## 8-1) 기존 데이터 시그널 백필(권장)
```bash
npm run backfill:signals
```

## 9) 로그인/API 동작 확인
1. UI에서 Google 로그인
2. 추천 생성 버튼 클릭
3. 401/429 에러 없이 응답되는지 확인
4. 결과 카드에 도보 버킷(5분/10분/15~20분) 노출 확인
