import type { DailyContext, MatchedRestaurant, MenuRecommendation } from "@/lib/domain/types";
import { expandMenuTokenVariants, normalizeText } from "@/lib/domain/menu-synonyms";

function buildWeatherPrefix(situations: string[]) {
  if (situations.includes("비오는날")) {
    return "오늘 비가 와서";
  }

  if (situations.includes("한파")) {
    return "오늘 날이 많이 추워서";
  }

  if (situations.includes("무더위")) {
    return "오늘 더운 날씨라";
  }

  return "오늘은";
}

function buildDistancePhrase(restaurant: MatchedRestaurant | null) {
  if (!restaurant?.walkBucketLabel) {
    return "회사 근처";
  }

  return `${restaurant.walkBucketLabel} 거리`;
}

function withSubjectParticle(name: string) {
  const lastChar = name.charCodeAt(name.length - 1);
  const isHangul = lastChar >= 0xac00 && lastChar <= 0xd7a3;

  if (!isHangul) {
    return `${name}가`;
  }

  const hasFinalConsonant = (lastChar - 0xac00) % 28 !== 0;
  return hasFinalConsonant ? `${name}이` : `${name}가`;
}

function pickBestMenuForRestaurant(
  menus: string[],
  restaurant: MatchedRestaurant | null,
): string {
  if (!restaurant || menus.length === 0) {
    return menus[0] ?? "한식";
  }

  const texts = [
    restaurant.restaurant.name,
    restaurant.restaurant.category ?? "",
    ...restaurant.restaurant.menus,
  ].map(normalizeText);

  for (const menu of menus) {
    const variants = expandMenuTokenVariants(menu);
    const isMatch = variants.some((variant) => texts.some((text) => text.includes(variant)));
    if (isMatch) {
      return menu;
    }
  }

  return menus[0] ?? "한식";
}

export function buildRecommendationPitches(
  context: DailyContext,
  recommendation: MenuRecommendation,
  restaurants: MatchedRestaurant[],
) {
  const topRestaurant = restaurants[0] ?? null;
  const topMenu = pickBestMenuForRestaurant(recommendation.menus, topRestaurant);
  const secondMenu = recommendation.menus.find((menu) => menu !== topMenu) ?? topMenu;
  const weatherPrefix = buildWeatherPrefix(context.situations);
  const event = context.events[0];
  const distancePhrase = buildDistancePhrase(topRestaurant);

  const firstLine = topRestaurant
    ? `${weatherPrefix} ${distancePhrase}에서 ${topMenu} 어떠세요? ${withSubjectParticle(topRestaurant.restaurant.name)} 무난합니다.`
    : `${weatherPrefix} ${topMenu} 계열이 오늘 분위기에 잘 맞아요.`;

  const secondLine = event
    ? `오늘은 ${event} 이슈도 있어서 ${secondMenu}처럼 가볍게 제안하기 좋습니다.`
    : `${secondMenu}도 함께 제안하면 팀 취향을 넓게 커버할 수 있습니다.`;

  const thirdLine = topRestaurant
    ? `추천 이유: ${topRestaurant.reason} · 예상 도보 ${topRestaurant.walkMinutes ?? "-"}분`
    : `추천 이유: ${recommendation.reasoning}`;

  return [firstLine, secondLine, thirdLine];
}
