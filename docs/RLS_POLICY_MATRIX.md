# RLS Policy Matrix

적용 SQL: `supabase/migrations/202604120002_security_and_distance.sql`

## 공통
- 모든 주요 테이블에서 RLS 활성화
- 서버 내부 로직은 `SUPABASE_SERVICE_ROLE_KEY`로 우회 처리

## 테이블별 정책

### `restaurants`
- `SELECT`: `authenticated` 허용
- `INSERT/UPDATE/DELETE`: 클라이언트 직접 허용 안 함(서비스 롤 전용)

### `daily_context`
- `SELECT`: `authenticated` 허용
- 쓰기: 서비스 롤 전용

### `user_preferences`
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id`

### `menu_recommendations`
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`

### `recommendation_restaurants`
- `SELECT`: 연결된 `menu_recommendations.user_id = auth.uid()`인 경우만 허용

### `crawl_jobs`
- 현재 정책 없음(서비스 롤 중심 운용)

### `geocode_cache`
- 현재 정책 없음(서비스 롤 중심 운용)

## 점검 쿼리
```sql
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```
