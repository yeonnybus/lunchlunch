import OpenAI from "openai";

import { getServerEnv } from "@/lib/env";
import { canonicalizeMenuLabel, normalizeText } from "@/lib/domain/menu-synonyms";
import {
  BUDGET_FRIENDLY_MAX_KRW,
  BUDGET_FRIENDLY_MIN_KRW,
  buildRecommendationIntent,
} from "@/lib/domain/recommendation-intent";
import type {
  DailyContext,
  MenuRecommendation,
  Restaurant,
  UserPreference,
} from "@/lib/domain/types";

interface RecommenderInput {
  region: string;
  context: DailyContext;
  restaurants: Restaurant[];
  preference: UserPreference | null;
  manualPreferenceNote?: string;
}

function buildRestaurantSignals(restaurants: Restaurant[]) {
  const categoryCounter = new Map<string, number>();

  for (const restaurant of restaurants) {
    const category = restaurant.category?.trim();
    if (!category) continue;

    const prev = categoryCounter.get(category) ?? 0;
    categoryCounter.set(category, prev + 1);
  }

  return Array.from(categoryCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([category, count]) => `${category}(${count})`);
}

const fallbackCategoryMenus: Array<{ keyword: string; menus: string[] }> = [
  { keyword: "초밥", menus: ["초밥"] },
  { keyword: "스시", menus: ["초밥"] },
  { keyword: "일본식라면", menus: ["라멘"] },
  { keyword: "중식당", menus: ["짜장면", "짬뽕"] },
  { keyword: "이탈리아", menus: ["파스타"] },
  { keyword: "파스타", menus: ["파스타"] },
  { keyword: "햄버거", menus: ["햄버거"] },
  { keyword: "돈까스", menus: ["돈까스"] },
  { keyword: "칼국수", menus: ["칼국수"] },
  { keyword: "국밥", menus: ["국밥"] },
  { keyword: "쌀국수", menus: ["쌀국수"] },
  { keyword: "베트남", menus: ["쌀국수"] },
];

const officeLunchHeavyKeywords = [
  "삼겹살",
  "돼지갈비",
  "양꼬치",
  "곱창",
  "막창",
  "대창",
  "족발",
  "보쌈",
  "불고기전골",
  "전골",
  "오마카세",
  "회식",
];

function dedupeMenus(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const trimmed = canonicalizeMenuLabel(value);
    if (!trimmed) continue;

    const normalized = normalizeText(trimmed);
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    output.push(trimmed);
  }

  return output;
}

function isHeavyLunchMenu(menu: string) {
  const normalized = normalizeText(menu);
  return officeLunchHeavyKeywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function sanitizeMenusForPolicy(candidates: string[], input: RecommenderInput) {
  let deduped = dedupeMenus(candidates);
  const intent = buildRecommendationIntent(input.manualPreferenceNote, input.preference);

  if (!intent.isOfficeLunchMode) {
    return deduped;
  }

  deduped = deduped.filter((menu) => !isHeavyLunchMenu(menu));

  if (intent.isBudgetFriendlyMode) {
    const expensiveSignals = ["카이센", "우니", "오마카세", "코스", "한우", "장어", "참치회", "사시미", "회덮밥"];
    deduped = deduped.filter(
      (menu) => !expensiveSignals.some((keyword) => normalizeText(menu).includes(normalizeText(keyword))),
    );
  }

  return deduped;
}

function completeMenus(candidates: string[], input: RecommenderInput) {
  const output = sanitizeMenusForPolicy(candidates, input);
  const fallbackSafeMenus = sanitizeMenusForPolicy(
    [
      ...deriveFallbackMenusFromRestaurants(input.restaurants),
      "제육볶음",
      "된장찌개",
      "김치찌개",
      "국밥",
      "칼국수",
      "쌀국수",
      "우동",
      "초밥",
      "돈까스",
      "파스타",
      "짜장면",
      "짬뽕",
    ],
    input,
  );

  for (const menu of fallbackSafeMenus) {
    if (output.length >= 5) break;
    output.push(menu);
  }

  return dedupeMenus(output).slice(0, 5);
}

function deriveFallbackMenusFromRestaurants(restaurants: Restaurant[]) {
  const menus = new Set<string>();

  for (const restaurant of restaurants) {
    for (const menu of restaurant.menus ?? []) {
      if (menu.trim()) {
        menus.add(menu.trim());
      }
    }

    const category = restaurant.category ?? "";
    for (const mapping of fallbackCategoryMenus) {
      if (category.includes(mapping.keyword)) {
        for (const menu of mapping.menus) {
          menus.add(menu);
        }
      }
    }
  }

  return Array.from(menus);
}

function fallbackRecommendation(
  input: RecommenderInput,
  reason = "Fallback heuristic recommendation",
): MenuRecommendation {
  const sampleMenus = deriveFallbackMenusFromRestaurants(input.restaurants);
  const defaults = ["제육볶음", "된장찌개", "쌀국수", "파스타", "초밥", "국밥", "우동"];

  const preferred = input.preference?.favoriteMenus?.slice(0, 2) ?? [];
  const rainy = input.context.situations.includes("비오는날") ? ["칼국수"] : [];

  const menus = completeMenus([...preferred, ...rainy, ...sampleMenus, ...defaults], input);

  return {
    menus,
    reasoning: `${reason}. ${input.context.weatherSummary}, ${input.context.events.join(", ") || "일반일"} 기준`,
    modelName: "fallback-rule-based",
    confidence: "low",
  };
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function recommendMenusWithAI(
  input: RecommenderInput,
): Promise<MenuRecommendation> {
  const env = getServerEnv();
  const intent = buildRecommendationIntent(input.manualPreferenceNote, input.preference);

  if (!env.OPENAI_API_KEY) {
    return fallbackRecommendation(input, "OPENAI_API_KEY is missing");
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const payload = {
    region: input.region,
    contextDate: input.context.contextDate,
    weatherSummary: input.context.weatherSummary,
    events: input.context.events,
    situations: input.context.situations,
    userPreference: input.preference,
    manualPreferenceNote: input.manualPreferenceNote ?? null,
    restaurantCategorySignals: buildRestaurantSignals(input.restaurants),
    priceGuideline: intent.isBudgetFriendlyMode
      ? `1인 ${(BUDGET_FRIENDLY_MIN_KRW / 10000).toFixed(1)}만~${(BUDGET_FRIENDLY_MAX_KRW / 10000).toFixed(1)}만원 중심, 과도한 프리미엄 메뉴 제외`
      : "일반 가격대",
    cuisineIntent: intent.cuisineLabel,
  };

  const candidateModels = Array.from(new Set([env.OPENAI_MODEL, "gpt-4o-mini"]));
  let lastError = "OpenAI request failed";

  for (const model of candidateModels) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "너는 여의도 직장인 메뉴 추천 전문가다. 기본은 점심 제안이며 회식형/과하게 무거운 메뉴(삼겹살, 전골, 곱창류)는 우선순위를 낮춰라. 사용자가 적당한 가격대를 요청하면 카이센동/우니/오마카세/코스/한우 등 고가 메뉴는 피하고, 1.0만~1.8만원대 대중 메뉴를 우선한다. 식당 매칭이 쉬운 구체 메뉴명으로 JSON만 출력한다.",
          },
          {
            role: "user",
            content: `아래 입력을 기준으로 메뉴 5개를 추천해줘. 출력 JSON 스키마: {\"menus\": string[], \"reasoning\": string, \"confidence\": \"low\"|\"medium\"|\"high\"}. 입력: ${JSON.stringify(payload)}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        lastError = `OpenAI returned empty message (${model})`;
        continue;
      }

      const parsed = safeJsonParse<{
        menus?: string[];
        reasoning?: string;
        confidence?: "low" | "medium" | "high";
      }>(content);

      if (!parsed?.menus || parsed.menus.length === 0) {
        lastError = `OpenAI output schema mismatch (${model})`;
        continue;
      }

      const menus = completeMenus(parsed.menus.filter(Boolean), input);
      if (menus.length === 0) {
        lastError = `OpenAI menu list was empty (${model})`;
        continue;
      }

      return {
        menus,
        reasoning: parsed.reasoning ?? "AI generated recommendation",
        modelName: model,
        confidence: parsed.confidence ?? "medium",
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? `OpenAI request failed (${model}): ${error.message}`
          : `OpenAI request failed (${model})`;
    }
  }

  return fallbackRecommendation(input, lastError);
}
