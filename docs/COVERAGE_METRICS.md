# Yeouido Coverage Metrics

"여의도동 식당 최대 수집" 목표를 정량 추적하기 위한 지표입니다.

## 핵심 지표
- `crawl_jobs.total_collected`: 원시 수집 건수
- `crawl_jobs.total_upserted`: 실제 저장 건수
- `중복률`: `(total_collected - total_upserted) / total_collected`
- `신규율`: `신규 restaurants 수 / total_upserted`
- `좌표완성률`: `lat/lng not null restaurants 비율`
- `근거리추천가능률`: 추천 결과 중 `walk_far` 제외 비율

## 운영 기준(권장)
- 중복률: 25% 이하 유지
- 좌표완성률: 85% 이상
- 근거리추천가능률: 70% 이상

## 예시 점검 쿼리
```sql
-- 최근 크롤링 20회 성능
select created_at, region, total_collected, total_upserted,
       case when total_collected > 0
            then round((total_collected - total_upserted)::numeric / total_collected * 100, 2)
            else 0 end as dedup_rate_percent
from crawl_jobs
order by created_at desc
limit 20;
```

```sql
-- 좌표 완성률
select
  round(
    (count(*) filter (where lat is not null and lng is not null))::numeric
    / nullif(count(*), 0) * 100,
    2
  ) as coord_fill_rate_percent
from restaurants
where region like '%여의도동%';
```
