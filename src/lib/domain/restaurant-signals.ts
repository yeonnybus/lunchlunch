import { normalizeText } from "@/lib/domain/menu-synonyms";
import type { Json } from "@/lib/supabase/types";

export type RestaurantPriceTier = "budget" | "moderate" | "premium";

interface RestaurantSignalInput {
  name: string;
  category: string | null;
  address: string | null;
  roadAddress: string | null;
  menus: string[];
  raw: Json | null;
}

function flattenRawText(raw: Json | null) {
  if (!raw || typeof raw !== "object") {
    return "";
  }

  try {
    return JSON.stringify(raw);
  } catch {
    return "";
  }
}

const cuisineSignalRules: Array<{ tag: string; signals: string[] }> = [
  { tag: "burger", signals: ["햄버거", "버거", "버거킹", "맥도날드", "바스버거", "브루클린더버거"] },
  {
    tag: "japanese",
    signals: ["일식", "일본", "스시", "초밥", "우동", "소바", "라멘", "돈부리", "카츠", "사시미", "카이센"],
  },
  {
    tag: "korean",
    signals: [
      "한식",
      "한정식",
      "국밥",
      "찌개",
      "백반",
      "비빔밥",
      "칼국수",
      "냉면",
      "삼겹살",
      "갈비",
      "불고기",
      "족발",
      "보쌈",
      "곰탕",
      "설렁탕",
    ],
  },
  { tag: "chinese", signals: ["중식", "짜장", "짬뽕", "마라", "딤섬", "탕수육", "훠궈"] },
  { tag: "western", signals: ["양식", "파스타", "스테이크", "리조또", "브런치", "이탈리아", "샌드위치"] },
  { tag: "vietnamese", signals: ["베트남", "쌀국수", "pho"] },
];

const premiumSignals = [
  "더현대",
  "백화점",
  "오마카세",
  "파인다이닝",
  "코스",
  "카이센",
  "우니",
  "한우",
  "와인바",
  "스테이크하우스",
  "호텔",
];

const budgetSignals = [
  "가성비",
  "만원",
  "분식",
  "김밥",
  "국밥",
  "칼국수",
  "백반",
  "우동",
  "돈까스",
  "덮밥",
];

function toStringFromRawPriceCategory(raw: Json | null) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return "";
  }

  const value = (raw as Record<string, Json>).priceCategory;
  if (typeof value === "string") {
    return value;
  }

  return "";
}

function detectPriceTierByText(haystack: string): RestaurantPriceTier | null {
  if (!haystack) {
    return null;
  }

  if (["오마카세", "파인다이닝", "코스", "카이센", "우니", "한우"].some((signal) => haystack.includes(normalizeText(signal)))) {
    return "premium";
  }

  if (["만원", "가성비", "분식", "백반", "국밥"].some((signal) => haystack.includes(normalizeText(signal)))) {
    return "budget";
  }

  return null;
}

function computePremiumRiskScore(haystack: string) {
  let score = 0;

  for (const signal of premiumSignals) {
    if (haystack.includes(normalizeText(signal))) {
      score += signal === "더현대" || signal === "오마카세" || signal === "카이센" ? 2 : 1;
    }
  }

  for (const signal of budgetSignals) {
    if (haystack.includes(normalizeText(signal))) {
      score -= 1;
    }
  }

  return Math.max(0, Math.min(5, score));
}

export function inferRestaurantSignals(input: RestaurantSignalInput): {
  cuisineTags: string[];
  premiumRiskScore: number;
  priceTier: RestaurantPriceTier | null;
} {
  const normalizedParts = [
    input.name,
    input.category ?? "",
    input.address ?? "",
    input.roadAddress ?? "",
    ...input.menus,
    flattenRawText(input.raw),
    toStringFromRawPriceCategory(input.raw),
  ].map(normalizeText);

  const haystack = normalizedParts.join(" ");

  const cuisineTags = cuisineSignalRules
    .filter((rule) => rule.signals.some((signal) => haystack.includes(normalizeText(signal))))
    .map((rule) => rule.tag);

  const premiumRiskScore = computePremiumRiskScore(haystack);

  const priceTierByText = detectPriceTierByText(haystack);
  const priceTier =
    priceTierByText ?? (premiumRiskScore >= 3 ? "premium" : "moderate");

  return {
    cuisineTags,
    premiumRiskScore,
    priceTier,
  };
}
