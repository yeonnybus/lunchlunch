# Naver Crawler Notes

## 현재 전략
- `https://pcmap.place.naver.com/restaurant/list?query={query}` 접속
- 리스트 컨테이너(`#_pcmap_list_scroll_container`) 스크롤로 결과 확장
- `window.__APOLLO_STATE__`의 `RestaurantListSummary`를 파싱해 식당 데이터 추출
- 지역 정책: `여의도동` 문자열 포함 지역만 허용
- 추천 단계에서 좌표가 비어 있으면 지오코딩 캐시 기반 보강

## 한계
- DOM/내부 상태 키 변경 가능성이 높아 유지보수가 필요
- 지역 전체 데이터 100% 보장은 현실적으로 어려움
- 비정상 트래픽 판정 시 차단 가능

## 권장 개선
- 행정동 단위 분할 검색 + 병합
- 실패 셀렉터 자동 탐지 알림
- 소스 다중화(공식 API/제휴 데이터) 검토
- 쿼리 매트릭스(한식/중식/일식/양식/분식 등)로 커버리지 확장
