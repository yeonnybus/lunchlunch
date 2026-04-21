# Operations Runbook

## 1) 일일 체크
- 로그인/추천 API 정상 여부 확인(401/429 비율)
- 최근 `crawl_jobs` 실패 여부 확인
- 추천 결과에 도보 버킷이 정상 표기되는지 확인

자동 점검(권장):
```bash
npm run ops:daily -- --region "서울 영등포구 여의도동"
```

CI 게이트:
- GitHub Actions `Ops Daily Gate`에서 `ops:daily`를 PR 기준으로 자동 실행
- 필요 시크릿: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

회귀 점검(권장, 배포 전):
```bash
npm run audit:recommendation:full
```

결과 파일:
- `docs/reports/recommendation-regression-latest.json`

## 2) 수동 크롤링 절차
1. Google 로그인 상태 확인
2. 지역 입력: `서울 영등포구 여의도동`
3. 관리자 토큰 입력 후 실행
4. `collected/upserted` 수치와 warning 메시지 확인

데이터 커버리지가 낮을 때(추천 후보 부족):
- `npm run crawl:matrix -- --region "서울 영등포구 여의도동"` 실행 후 다시 추천
- 기존 데이터 보강이 필요하면 `npm run backfill:signals` 실행 (메뉴 추론 + 시그널 재계산)

## 3) 추천 점검 절차
1. 취향 메모 입력 후 추천 생성
2. 피치 문장 3개 생성 여부 확인
3. 식당 카드의 거리/도보시간/버킷 확인

## 4) 장애 대응
- 크롤링 결과 0건: 네이버 DOM 셀렉터 변경 여부 우선 점검
- 추천 401: 세션 만료, OAuth callback URL, 쿠키 정책 점검
- 추천 429: `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_SEC` 조정
- 거리 미표기: 주소 공백 여부, 지오코딩 API 응답/캐시 상태 점검
- 가성비/일식 요청인데 프리미엄 식당 노출: 입력 메모, `max_budget_krw`, 최근 크롤링 데이터 품질 점검

## 5) 정기 유지보수
- 월 1회: 쿼리 매트릭스 점검(한식/중식/일식/양식/분식 등)
- 월 1회: RLS 정책 및 키 회전 점검
- 분기 1회: 추천 문장 톤(신입사원 제안 스타일) 재검토
