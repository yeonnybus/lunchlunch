# API Spec

## POST `/api/recommend/today`

로그인 사용자 전용 추천 API입니다.

### Request
```json
{
  "region": "서울 영등포구 여의도동",
  "manualPreferenceNote": "오늘은 국물 위주"
}
```

### Success `200`
```json
{
  "ok": true,
  "recommendationId": "uuid",
  "context": {
    "contextDate": "2026-04-12",
    "location": "서울 영등포구 여의도동",
    "weatherSummary": "비 / 14°C",
    "events": ["블랙데이"],
    "situations": ["평일점심", "비오는날", "비"]
  },
  "recommendation": {
    "menus": ["칼국수", "국밥", "짬뽕"],
    "reasoning": "...",
    "modelName": "gpt-5-mini",
    "confidence": "medium"
  },
  "pitches": ["...", "...", "..."],
  "restaurants": [
    {
      "rank": 1,
      "score": 7.3,
      "reason": "...",
      "distanceMeters": 380,
      "walkMinutes": 6,
      "walkBucketLabel": "도보 5분",
      "restaurant": {
        "name": "식당명",
        "category": "한식",
        "address": "...",
        "roadAddress": "..."
      }
    }
  ]
}
```

### Error
- `400`: 요청 스키마 오류 또는 지원 지역 외 요청
- `401`: 미로그인
- `429`: rate limit 초과
- `500`: 내부 오류

---

## POST `/api/crawl/naver`

로그인 + 관리자 토큰 이중 검증 API입니다.

### Request
헤더
- `x-admin-token: <MANUAL_TRIGGER_TOKEN>`

바디
```json
{
  "region": "서울 영등포구 여의도동",
  "query": "서울 영등포구 여의도동 맛집"
}
```

### Success `200`
```json
{
  "ok": true,
  "jobId": "uuid",
  "query": "서울 영등포구 여의도동 맛집",
  "collected": 123,
  "upserted": 97,
  "warning": null
}
```

### Error
- `400`: 요청 스키마 오류 또는 지원 지역 외 요청
- `401`: 미로그인 또는 관리자 토큰 불일치
- `500`: 크롤링/DB 처리 오류
