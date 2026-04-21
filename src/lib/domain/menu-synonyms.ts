export function normalizeText(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

const burgerBrandSignals = [
  "버거킹",
  "맥도날드",
  "롯데리아",
  "맘스터치",
  "파파이스",
  "쉐이크쉑",
  "다운타우너",
  "브루클린더버거조인트",
  "브루클린더버거",
  "바스버거",
  "버거",
  "와퍼",
  "빅맥",
  "싸이버거",
];

const menuVariants: Record<string, string[]> = {
  "제육볶음": ["제육", "제육볶음"],
  "된장찌개": ["된장찌개", "된장"],
  김치찌개: ["김치찌개", "김치"],
  순두부찌개: ["순두부", "순두부찌개"],
  "쌀국수": ["쌀국수", "베트남", "포"],
  반미: ["반미", "샌드위치"],
  분짜: ["분짜", "베트남"],
  월남쌈: ["월남쌈", "베트남"],
  "파스타": ["파스타", "스파게티"],
  피자: ["피자"],
  "초밥": ["초밥", "스시"],
  불고기: ["불고기", "불고기전골"],
  삼겹살: ["삼겹살", "돼지고기구이"],
  닭갈비: ["닭갈비", "닭구이"],
  짜장면: ["짜장", "자장", "중식당"],
  짬뽕: ["짬뽕", "중식당"],
  칼국수: ["칼국수", "국수"],
  국밥: ["국밥"],
  라멘: ["라멘", "일본식라면"],
  우동: ["우동"],
  돈부리: ["돈부리", "덮밥"],
  "돈까스": ["돈까스", "돈카츠"],
  리조또: ["리조또"],
  햄버거: ["햄버거", "버거", "치즈버거", "치킨버거", "와퍼", "빅맥", "싸이버거"],
};

export function canonicalizeMenuLabel(menu: string) {
  const trimmed = menu.trim();
  const normalized = normalizeText(trimmed);

  if (!normalized) {
    return trimmed;
  }

  if (burgerBrandSignals.some((signal) => normalized.includes(normalizeText(signal)))) {
    return "햄버거";
  }

  if (normalized.includes("돈부리") || normalized.includes("규동") || normalized.includes("가츠동")) {
    return "돈부리";
  }

  if (normalized.includes("스시") || normalized.includes("초밥")) {
    return "초밥";
  }

  if (normalized.includes("알리오") || normalized.includes("까르보") || normalized.includes("라자냐")) {
    return "파스타";
  }

  if (normalized.includes("마르게리타")) {
    return "피자";
  }

  if (normalized.includes("반미")) {
    return "반미";
  }

  if (normalized.includes("월남쌈")) {
    return "월남쌈";
  }

  if (normalized.includes("분짜")) {
    return "분짜";
  }

  if (normalized.includes("라멘")) {
    return "라멘";
  }

  if (normalized.includes("우동")) {
    return "우동";
  }

  return trimmed;
}

export function expandMenuTokenVariants(menu: string) {
  const normalizedMenu = normalizeText(menu);
  const base = [normalizedMenu];
  const extra = menuVariants[menu]?.map(normalizeText) ?? [];

  const inferred = Object.entries(menuVariants)
    .filter(([canonicalMenu, aliases]) => {
      const normalizedCanonical = normalizeText(canonicalMenu);
      if (normalizedMenu.includes(normalizedCanonical)) {
        return true;
      }

      return aliases.some((alias) => normalizedMenu.includes(normalizeText(alias)));
    })
    .flatMap(([canonicalMenu, aliases]) => [canonicalMenu, ...aliases])
    .map(normalizeText);

  return Array.from(new Set([...base, ...extra, ...inferred]));
}
