# 라운드 진행 보고서 (2026-04-21)

## 이번 라운드 목표
- 추천 품질을 단발 수정이 아니라 운영 가능한 수준으로 끌어올리고, 재발 방지 점검 체계를 구축

## 수행한 작업
1. **서브 에이전트 병렬 점검 수행**
   - 추천 품질 리스크, 크롤링 안정성, 문서/운영 정합성 점검
2. **추천 안전장치 강화**
   - 매칭 0건 시 의도 기반 폴백 추가
   - 매칭 결과가 너무 적을 때 의도 기반 후보 자동 보강
   - 파일: `src/lib/services/recommendation-service.ts`
3. **브랜드형/변형 메뉴 정규화 강화**
   - 햄버거 계열 브랜드 표현, 서양/베트남 메뉴 변형 정규화 추가
   - 파일: `src/lib/domain/menu-synonyms.ts`
4. **매칭 로직 보정**
   - 카테고리 generic 처리 기준 조정으로 중식당/일식당 매칭 회복
   - 파일: `src/lib/domain/restaurant-matcher.ts`
5. **회귀 점검 체계 확장**
   - 20개 시나리오 회귀 스위트 추가(한식/중식/일식/양식/버거/베트남/가성비/거리)
   - 파일: `src/lib/quality/recommendation-scenarios.ts`
   - 감사 스크립트 개선: smoke/full, 결과 파일 출력
   - 파일: `scripts/audit-recommendation-integrity.ts`
6. **운영 자동 점검 추가**
   - `ops:daily` 스크립트 도입 및 smoke 시나리오 기반 판정
   - 파일: `scripts/ops-daily-healthcheck.ts`
7. **메뉴 추론 모듈 통합**
   - 크롤링 정규화가 `menu-inference`를 사용하도록 교체
   - 백필 스크립트에서 메뉴 추론 + 시그널 재계산을 함께 수행하도록 확장
   - 파일: `src/lib/domain/menu-inference.ts`, `src/lib/crawler/normalizer.ts`, `scripts/backfill-restaurant-signals.ts`
8. **DB 보강 + CI 게이트 연동**
    - `backfill:signals` 실행으로 846건 재계산 반영
    - `ops:daily`를 GitHub Actions PR 게이트로 추가
    - 파일: `.github/workflows/ops-daily-gate.yml`, `src/lib/domain/restaurant-signals.ts`
9. **품질 게이트 강화 + API 회귀 스크립트 추가**
   - `ops:daily` 기본 임계치 `maxEmptyMenusPct`를 50으로 상향
   - `/api/recommend/today` 계약 점검용 API 회귀 스크립트 추가(smoke/full)
   - 파일: `scripts/ops-daily-healthcheck.ts`, `scripts/audit-recommend-api.ts`

## 검증 결과
- `npm run check` 통과
- `npm run build` 통과
- `npm run ops:daily -- --region "서울 영등포구 여의도동"` 결과: `ok: true`
- `npm run audit:recommendation:full` 결과: `ok: true` (20개 시나리오 전부 통과)
- `npm run audit:api` 결과: `ok: true` (401 계약 스모크)
- 회귀 결과 저장: `docs/reports/recommendation-regression-latest.json`
- `backfill:signals` 이후 `emptyMenusPct`: 71.5% -> 26.7%, `emptyCuisineTagsPct`: 54.7% -> 0.2%

## 현재 상태 평가
- 햄버거/일식/중식/한식/양식/베트남 기본 회귀 시나리오에서 재현 이슈 없음
- 운영 자동 점검이 붙어 재발 탐지 속도 향상
- `menus` 공백률은 개선됐지만(26.7%) 25% 이하를 목표로 추가 보강 여지 있음

## 다음 라운드 권장 작업
1. `audit:api:full`을 스테이징(인증 쿠키 주입) 정기 점검으로 운영화
2. `menus` 공백률 25% 목표로 크롤링 쿼리 확장 + 백필 루프 반복
3. 점검 결과를 PR/배포 파이프라인에서 required check로 지정
