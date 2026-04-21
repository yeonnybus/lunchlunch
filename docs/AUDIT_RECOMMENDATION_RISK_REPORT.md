# 추천 리스크 자체 점검 보고서

작성일: 2026-04-12

## 점검 범위
- 최근 추천 품질 개선 이후 동일 이슈 재발 가능성 점검
- 대상: 메뉴 정규화, 의도 스코어링, 매처 신뢰성, 데이터 준비 상태

## 점검 방법
1. 코드 점검
   - `src/lib/domain/menu-synonyms.ts`
   - `src/lib/domain/menu-recommender.ts`
   - `src/lib/domain/restaurant-matcher.ts`
   - `src/lib/services/recommendation-service.ts`
   - `src/lib/domain/restaurant-signals.ts`
2. 여의도동 데이터 품질 스냅샷 점검
3. 고정 시나리오 무결성 점검
   - `scripts/audit-recommendation-integrity.ts`

## 실행 명령
```bash
npm run audit:recommendation
```

## 점검 결과
- 시나리오 통과: 4/4 (햄버거/일식/중식/한식)
- 햄버거 브랜드형 메뉴 정규화 확인
  - `버거킹 와퍼 세트`, `빅맥 세트` -> `햄버거`로 정규화
  - 식당 매칭이 빈 배열이 아닌 상태로 확인

### 데이터 현황(현재)
- 전체 식당: 846
- `menus` 공백: 226 (26.7%)
- `cuisine_tags` 공백: 2 (0.2%)

## 리스크 평가

### 이번 이슈 기준 해소됨
- 브랜드형 햄버거 메뉴로 인한 `restaurants: []` 재현 경로 차단

### 여전히 높은 리스크
1. **메뉴 메타 공백 잔존(26.7%)**
   - 롱테일 카테고리에서 매칭 품질 편차 가능
2. **롱테일 요청 취약성**
   - 기본 시나리오는 통과했지만 복합 요청(예: 가격+상황+세부취향)에서 회귀 가능

## 추가 권장 조치
1. 주기적 수집/백필 실행
   - `npm run crawl:matrix -- --region "서울 영등포구 여의도동"`
   - `npm run backfill:signals`
2. 운영용 회귀 시나리오를 20개 이상으로 확대
3. 식당 매칭 0건 또는 2건 미만일 때 의도 기반 자동 보강 경로 유지

## 최종 판단
- **조건부 Go**: 현재 수정 사항으로 핵심 이슈(햄버거 공백)는 해결
- **완전 안정화는 아님**: 메뉴/태그 공백률 개선 및 회귀 시나리오 확장 필요
