# Yeouido Full Crawl Runbook

목표: 여의도동 식당 데이터를 현실적으로 가능한 최대치까지 수집.

## 핵심 원칙
- 네이버 노출/정책 특성상 100% 보장은 어려움
- 대신 다중 쿼리 + 반복 수집 + 증분 지표로 누락 최소화

## 1) 선행 작업
1. `supabase/migrations/202604120003_restaurant_signals.sql` 실행
2. `npm run backfill:signals` 실행

## 2) 전체 수집 배치 실행
긴 실행이므로 한 번에 크게 돌리기보다 배치 실행 권장.

```bash
npm run crawl:yeouido-full -- --region "서울 영등포구 여의도동" --max-scrolls 45 --delay-ms 350 --plateau-window 12 --plateau-threshold 3 --max-queries 30
```

위 명령을 여러 번 반복 실행하고, 아래 지표가 수렴하면 종료:
- 마지막 2~3회 배치에서 `totalNewRows`가 매우 작음(예: <= 5)

## 3) 커버리지 보강 (선택)
```bash
npm run crawl:matrix -- --region "서울 영등포구 여의도동"
```

## 4) 점검
SQL 예시:
```sql
select count(*) as restaurants
from restaurants
where region = '서울 영등포구 여의도동';
```

```sql
select created_at, query, status, total_collected, total_upserted, error_message
from crawl_jobs
where region = '서울 영등포구 여의도동'
order by created_at desc
limit 30;
```

## 운영 팁
- 네트워크/타임아웃으로 일부 job이 `running`으로 남으면 `failed`로 정리 후 재실행
- `max-scrolls`를 너무 높이면 배치당 시간이 급증하므로 35~50 범위 권장
