# Recommendation Quality Plan

## 배경
- 요청 의도(예: "적당한 가격대의 일식")와 실제 추천 식당이 불일치하는 문제가 반복됨
- 대표적으로 프리미엄 식당(더현대/카이센/오마카세)이 가성비 요청에도 상위 노출됨

## 목표 KPI
- 의도 일치율(Top3): 90%+
- 가격대 누수율(Top3에 프리미엄 포함): 5% 이하
- 메뉴-식당 정합률(Top1): 85%+

## 실행 액션 플랜

### Phase A (완료) - 정책 엔진/필터 안정화
1. **Intent 모델 도입**
   - 파일: `src/lib/domain/recommendation-intent.ts`
   - 수집 항목: 점심/저녁 의도, 음식 타입, 가격대 모드, 프리미엄 허용 여부
2. **가성비 범위 고정**
   - `적당한 가격대`를 `1.0만 ~ 1.8만`으로 고정
   - 상수: `BUDGET_FRIENDLY_MIN_KRW`, `BUDGET_FRIENDLY_MAX_KRW`
3. **추천 단계 제약 강화**
   - 파일: `src/lib/domain/menu-recommender.ts`
   - 고가 메뉴(카이센/우니/오마카세/한우 등) 후처리 제거
   - 점심 정책에서 회식형 메뉴 필터링
4. **식당 랭킹 단계 제약 강화**
   - 파일: `src/lib/services/recommendation-service.ts`
   - 가격대 리스크(더현대/오마카세/카이센) 감점 강화
   - 음식 타입 의도(일식/한식/중식...) 불일치 강감점
5. **과매칭 축소**
   - 파일: `src/lib/domain/menu-synonyms.ts`, `src/lib/crawler/normalizer.ts`
   - 일반 토큰(한식/고기류 광의어) 기반 과매칭 줄임

### Phase B (완료) - 데이터 품질 강화
1. restaurants에 가격/타입 메타 컬럼 추가
   - `price_tier`, `premium_risk_score`, `cuisine_tags`
   - 마이그레이션: `supabase/migrations/202604120003_restaurant_signals.sql`
2. 크롤링 정규화 시 해당 메타 채우기
   - 파일: `src/lib/crawler/normalizer.ts`, `src/lib/domain/restaurant-signals.ts`
3. 매칭에서 문자열 휴리스틱 비중 축소, 데이터 기반 스코어 비중 확대
   - 파일: `src/lib/services/recommendation-service.ts`
4. 기존 데이터 백필 스크립트 추가
    - 파일: `scripts/backfill-restaurant-signals.ts`
    - 명령: `npm run backfill:signals`
   - 동작: 메뉴 추론(`menu-inference`) + 시그널 재계산을 함께 반영

### Phase C (다음 작업) - 운영 안정화
1. 품질 회귀 테스트 스크립트 추가 (`eval:recommend`)
2. `menu_recommendations.input_snapshot`에 정책 추적값 저장
3. 실패/누수 케이스 운영 대시보드 지표화

## 완료 내역 요약
- [x] Intent 구조화
- [x] 가성비 범위 1.0~1.8만 반영
- [x] 가격대/타입 후처리 필터 적용
- [x] 매칭 과적합 규칙 완화
- [x] 식당 메타(가격/프리미엄/타입) DB 컬럼 반영
- [x] 기존 데이터 백필 스크립트 추가
- [x] 문서화

## 검증 방법
```bash
npm run check
npm run recommend:dry -- --region "서울 영등포구 여의도동" --user-id "<UUID>" --note "적당한 가격대의 일식"
```

검증 시 확인 포인트:
- 추천 메뉴에 고가 키워드(카이센/우니/오마카세/한우)가 포함되지 않는지
- 식당 이유에 `일식 선호 반영`이 상위에 나타나는지
- 프리미엄 후보가 Top1로 노출되지 않는지
6. **브랜드형 메뉴 정규화 추가**
   - `버거킹 와퍼 세트`, `빅맥 세트` 같은 표현을 `햄버거`로 정규화
   - 파일: `src/lib/domain/menu-synonyms.ts`, `src/lib/domain/menu-recommender.ts`
