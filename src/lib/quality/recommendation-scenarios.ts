export interface RecommendationScenario {
  id: string;
  category:
    | "한식"
    | "중식"
    | "일식"
    | "양식"
    | "버거"
    | "베트남"
    | "가성비"
    | "프리미엄제외"
    | "거리선호";
  menus: string[];
  minMatches: number;
}

export const recommendationRegressionScenarios: RecommendationScenario[] = [
  { id: "KR_01_jeyuk_variant_collision", category: "한식", menus: ["제육볶음", "제육덮밥", "돼지불백", "쌈밥"], minMatches: 2 },
  { id: "KR_02_stew_cluster_disambiguation", category: "한식", menus: ["김치찌개", "순두부찌개", "된장찌개", "부대찌개"], minMatches: 2 },
  { id: "KR_03_rice_noodle_boundary", category: "한식", menus: ["비빔밥", "돌솥비빔밥", "비빔국수", "막국수"], minMatches: 2 },
  { id: "CN_01_jajang_spelling_variants", category: "중식", menus: ["짜장면", "자장면", "간짜장", "삼선짜장"], minMatches: 2 },
  { id: "CN_02_jjamppong_mala_confusion", category: "중식", menus: ["짬뽕", "차돌짬뽕", "마라탕", "마라샹궈"], minMatches: 2 },
  { id: "JP_01_donburi_token_normalization", category: "일식", menus: ["규동", "가츠동", "사케동", "돈부리"], minMatches: 2 },
  { id: "JP_02_ramen_udon_soba_split", category: "일식", menus: ["돈코츠라멘", "미소라멘", "우동", "냉모밀"], minMatches: 2 },
  { id: "WS_01_pasta_pizza_cafe_noise", category: "양식", menus: ["알리오올리오", "까르보나라", "마르게리타", "라자냐"], minMatches: 1 },
  { id: "WS_02_brunch_western_boundary", category: "양식", menus: ["파스타", "리조또", "피자", "브런치"], minMatches: 1 },
  { id: "BG_01_core_burger_variants", category: "버거", menus: ["치즈버거", "불고기버거", "치킨버거", "더블버거"], minMatches: 2 },
  { id: "BG_02_burger_side_item_leakage", category: "버거", menus: ["새우버거", "베이컨버거", "감자튀김", "밀크셰이크"], minMatches: 2 },
  { id: "VN_01_pho_bun_rice_noodle_conflict", category: "베트남", menus: ["쌀국수", "소고기쌀국수", "분짜", "분보남보"], minMatches: 2 },
  { id: "VN_02_banhmi_snack_meal_boundary", category: "베트남", menus: ["반미", "치킨반미", "월남쌈", "쌀국수"], minMatches: 1 },
  { id: "VAL_01_under_10000_mixed_set", category: "가성비", menus: ["김밥", "라면", "덮밥", "돈까스"], minMatches: 3 },
  { id: "VAL_02_lunch_special_keyword_drift", category: "가성비", menus: ["점심특선", "런치세트", "오늘의메뉴", "정식"], minMatches: 2 },
  { id: "VAL_03_price_phrase_variation", category: "가성비", menus: ["김밥", "우동", "국밥", "돈까스"], minMatches: 2 },
  { id: "NOPREMIUM_01_casual_korean_guardrail", category: "프리미엄제외", menus: ["국밥", "백반", "칼국수", "김치찌개"], minMatches: 2 },
  { id: "NOPREMIUM_02_casual_global_guardrail", category: "프리미엄제외", menus: ["우동", "버거", "쌀국수", "파스타"], minMatches: 2 },
  { id: "DIST_01_fast_lunch_nearby_preference", category: "거리선호", menus: ["김밥", "우동", "샌드위치", "버거"], minMatches: 2 },
  { id: "DIST_02_rainyday_short_walk_bias", category: "거리선호", menus: ["국밥", "돈까스", "덮밥", "쌀국수"], minMatches: 2 },
];

export const recommendationSmokeScenarioIds = [
  "BG_01_core_burger_variants",
  "JP_01_donburi_token_normalization",
  "CN_01_jajang_spelling_variants",
  "KR_02_stew_cluster_disambiguation",
] as const;
