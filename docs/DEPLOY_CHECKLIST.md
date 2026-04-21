# Deploy Checklist

## 1) 환경변수
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MANUAL_TRIGGER_TOKEN`
- [ ] `OPENAI_API_KEY` (선택)
- [ ] `ALLOWED_REGION_KEYWORD=여의도동`
- [ ] `WORKPLACE_ADDRESS/WORKPLACE_LAT/WORKPLACE_LNG`

## 2) Supabase
- [ ] `202604120001_init.sql` 적용
- [ ] `202604120002_security_and_distance.sql` 적용
- [ ] RLS 정책 확인(`pg_policies`)

## 3) Auth (Google)
- [ ] Google Provider 활성화
- [ ] Google Client ID/Secret 입력
- [ ] Site URL 설정
- [ ] Redirect URL 설정(`.../auth/callback`)

## 4) 앱 검증
- [ ] `npm run check` 통과
- [ ] `npm run build` 통과
- [ ] 로그인 후 추천 API `200`
- [ ] 미로그인 추천 API `401`
- [ ] 과도 호출 시 `429`
- [ ] 여의도동 외 지역 요청 `400`

## 5) 운영 검증
- [ ] 수동 크롤링 정상 완료(`collected/upserted` 확인)
- [ ] 추천 결과에 도보 버킷 표기
- [ ] 최소 1개 추천 피치 문구 검수
