import type { MatchedRestaurant, Restaurant } from "@/lib/domain/types";
import { expandMenuTokenVariants, normalizeText } from "@/lib/domain/menu-synonyms";

function normalizeToken(value: string) {
  return normalizeText(value);
}

function isGenericCategory(category: string) {
  const genericKeywords = ["음식점", "식당", "한식", "일식", "중식", "양식"];
  return genericKeywords.some((keyword) => category === keyword);
}

export function matchRestaurantsByMenus(
  restaurants: Restaurant[],
  menus: string[],
  limit = 10,
): MatchedRestaurant[] {
  const menuSignals = menus.map((menu) => ({
    menu,
    variants: expandMenuTokenVariants(menu),
  }));

  const scored = restaurants
    .map((restaurant) => {
      let score = 0;
      const reasons: string[] = [];
      let semanticHits = 0;

      const menuPool = restaurant.menus.map(normalizeToken);
      const category = normalizeToken(restaurant.category ?? "");
      const name = normalizeToken(restaurant.name);

      for (const signal of menuSignals) {
        const isMenuMatch = signal.variants.some(
          (variant) =>
            menuPool.includes(variant) || menuPool.some((menuToken) => menuToken.includes(variant)),
        );

        if (isMenuMatch) {
          score += 4;
          semanticHits += 1;
          reasons.push(`${signal.menu}: 메뉴 직접 일치`);
          continue;
        }

        const isCategoryMatch =
          !isGenericCategory(category) && signal.variants.some((variant) => category.includes(variant));

        if (isCategoryMatch) {
          score += 2.5;
          semanticHits += 1;
          reasons.push(`${signal.menu}: 카테고리 유사`);
          continue;
        }

        const isNameMatch = signal.variants.some((variant) => name.includes(variant));

        if (isNameMatch) {
          score += 1.5;
          semanticHits += 1;
          reasons.push(`${signal.menu}: 상호명 연관`);
        }
      }

      if (semanticHits > 0) {
        if ((restaurant.rating ?? 0) >= 4.5) {
          score += 1;
          reasons.push("높은 평점");
        }

        if ((restaurant.reviewCount ?? 0) >= 100) {
          score += 0.7;
          reasons.push("리뷰 수 충분");
        }
      }

      return {
        restaurant,
        score,
        semanticHits,
        reason: reasons.join(" / ") || "지역 기반 후보",
      };
    })
    .filter((item) => item.semanticHits > 0 && item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ semanticHits: _semanticHits, ...item }, idx) => ({
      ...item,
      rank: idx + 1,
      distanceMeters: null,
      walkMinutes: null,
      walkBucket: null,
      walkBucketLabel: null,
    }));

  return scored;
}
