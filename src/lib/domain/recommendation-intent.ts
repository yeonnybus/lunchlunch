import { normalizeText } from "@/lib/domain/menu-synonyms";
import type { UserPreference } from "@/lib/domain/types";

export const BUDGET_FRIENDLY_MIN_KRW = 10_000;
export const BUDGET_FRIENDLY_MAX_KRW = 18_000;

const budgetFriendlyKeywords = [
  "적당한가격",
  "적당한가격대",
  "가성비",
  "저렴",
  "합리적",
  "무난한가격",
  "부담없는",
  "만원대",
  "1만원대",
  "1.5만원",
  "1.8만원",
  "2만원이하",
  "저가",
];

const premiumIntentKeywords = ["고급", "프리미엄", "오마카세", "코스", "특식", "파인다이닝", "비싸도"];

const dinnerIntentKeywords = ["저녁", "회식", "술", "야식", "고기회식"];

const cuisineIntentRules: Array<{
  cuisine: "japanese" | "korean" | "chinese" | "western" | "vietnamese" | "burger";
  label: string;
  noteSignals: string[];
  restaurantSignals: string[];
}> = [
  {
    cuisine: "japanese",
    label: "일식",
    noteSignals: ["일식", "일본", "스시", "초밥", "우동", "소바", "라멘", "돈부리"],
    restaurantSignals: ["일식", "스시", "초밥", "우동", "소바", "라멘", "돈부리", "일본식"],
  },
  {
    cuisine: "korean",
    label: "한식",
    noteSignals: ["한식", "국밥", "찌개", "백반"],
    restaurantSignals: ["한식", "국밥", "찌개", "백반"],
  },
  {
    cuisine: "chinese",
    label: "중식",
    noteSignals: ["중식", "짜장", "짬뽕", "마라"],
    restaurantSignals: ["중식", "짜장", "짬뽕", "마라"],
  },
  {
    cuisine: "western",
    label: "양식",
    noteSignals: ["양식", "파스타", "스테이크", "브런치"],
    restaurantSignals: ["양식", "파스타", "스테이크", "브런치", "이탈리아"],
  },
  {
    cuisine: "vietnamese",
    label: "베트남식",
    noteSignals: ["베트남", "쌀국수", "포"],
    restaurantSignals: ["베트남", "쌀국수", "pho"],
  },
  {
    cuisine: "burger",
    label: "햄버거",
    noteSignals: ["햄버거", "버거", "와퍼", "빅맥", "치즈버거", "수제버거"],
    restaurantSignals: [
      "햄버거",
      "버거",
      "버거킹",
      "맥도날드",
      "브루클린더버거",
      "바스버거",
      "쉐이크쉑",
      "다운타우너",
    ],
  },
];

export type CuisineIntent = (typeof cuisineIntentRules)[number]["cuisine"];

export interface RecommendationIntent {
  normalizedNote: string;
  isOfficeLunchMode: boolean;
  isBudgetFriendlyMode: boolean;
  budgetMinKrw: number | null;
  budgetMaxKrw: number | null;
  wantsPremium: boolean;
  cuisine: CuisineIntent | null;
  cuisineLabel: string | null;
  cuisineRestaurantSignals: string[];
}

export function buildRecommendationIntent(
  manualPreferenceNote: string | undefined,
  preference: UserPreference | null,
): RecommendationIntent {
  const normalizedNote = normalizeText(manualPreferenceNote ?? "");

  const wantsPremium = premiumIntentKeywords.some((keyword) =>
    normalizedNote.includes(normalizeText(keyword)),
  );

  const hasDinnerIntent = dinnerIntentKeywords.some((keyword) =>
    normalizedNote.includes(normalizeText(keyword)),
  );

  const budgetByPreference =
    preference?.maxBudgetKrw !== null && preference?.maxBudgetKrw !== undefined
      ? preference.maxBudgetKrw <= BUDGET_FRIENDLY_MAX_KRW
      : false;

  const budgetByNote = budgetFriendlyKeywords.some((keyword) =>
    normalizedNote.includes(normalizeText(keyword)),
  );

  const isBudgetFriendlyMode = !wantsPremium && (budgetByPreference || budgetByNote);

  const cuisineRule =
    cuisineIntentRules.find((rule) =>
      rule.noteSignals.some((signal) => normalizedNote.includes(normalizeText(signal))),
    ) ?? null;

  return {
    normalizedNote,
    isOfficeLunchMode: !hasDinnerIntent,
    isBudgetFriendlyMode,
    budgetMinKrw: isBudgetFriendlyMode ? BUDGET_FRIENDLY_MIN_KRW : null,
    budgetMaxKrw: isBudgetFriendlyMode ? BUDGET_FRIENDLY_MAX_KRW : null,
    wantsPremium,
    cuisine: cuisineRule?.cuisine ?? null,
    cuisineLabel: cuisineRule?.label ?? null,
    cuisineRestaurantSignals: cuisineRule?.restaurantSignals ?? [],
  };
}
