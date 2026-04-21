import { buildRecommendationPitches } from "@/lib/domain/recommendation-pitch";
import { buildDailyContext } from "@/lib/domain/daily-context";
import { recommendMenusWithAI } from "@/lib/domain/menu-recommender";
import { assertAllowedRegion } from "@/lib/domain/region-policy";
import { matchRestaurantsByMenus } from "@/lib/domain/restaurant-matcher";
import { classifyWalkDistance, haversineMeters } from "@/lib/domain/walk-distance";
import { getServerEnv } from "@/lib/env";
import { geocodeAddress, normalizeGeocodeQuery } from "@/lib/integrations/geocoding";
import {
  listGeocodeCacheByQueries,
  upsertGeocodeCache,
} from "@/lib/repositories/geocode-cache-repository";
import { getUserPreference } from "@/lib/repositories/preferences-repository";
import {
  listRestaurantsByMenus,
  listRestaurantsByRegion,
  updateRestaurantCoordinates,
} from "@/lib/repositories/restaurants-repository";
import { normalizeText } from "@/lib/domain/menu-synonyms";
import {
  BUDGET_FRIENDLY_MAX_KRW,
  BUDGET_FRIENDLY_MIN_KRW,
  buildRecommendationIntent,
  type RecommendationIntent,
} from "@/lib/domain/recommendation-intent";
import type { MatchedRestaurant } from "@/lib/domain/types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/domain/types";

interface RecommendationInput {
  region: string;
  userId: string;
  manualPreferenceNote?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

const premiumRestaurantSignals = [
  "더현대",
  "백화점",
  "오마카세",
  "코스",
  "파인다이닝",
  "한우오마카세",
  "카이센",
  "우니",
  "스테이크하우스",
  "와인바",
];

function computePremiumRisk(item: MatchedRestaurant) {
  if ((item.restaurant.premiumRiskScore ?? 0) > 0) {
    return Math.max(0, Math.min(5, item.restaurant.premiumRiskScore));
  }

  const haystack = normalizeText(
    [item.restaurant.name, item.restaurant.category ?? "", item.restaurant.address ?? "", item.restaurant.roadAddress ?? ""].join(" "),
  );

  let risk = 0;
  for (const signal of premiumRestaurantSignals) {
    if (haystack.includes(normalizeText(signal))) {
      risk += signal === "더현대" || signal === "오마카세" || signal === "카이센" ? 2 : 1;
    }
  }

  return risk;
}

function applyBudgetAwareScoring(
  matched: MatchedRestaurant[],
  intent: RecommendationIntent,
) {
  if (!intent.isBudgetFriendlyMode) {
    return matched;
  }

  const adjusted = matched
    .map((item) => {
      const premiumRisk = computePremiumRisk(item);
      if (premiumRisk === 0) {
        const tierBonus = item.restaurant.priceTier === "budget" ? 1.2 : 0;
        if (tierBonus <= 0) {
          return item;
        }

        return {
          ...item,
          score: item.score + tierBonus,
          reason: `${item.reason} / 가성비 보정(+${tierBonus.toFixed(1)})`,
        };
      }

      const penalty = premiumRisk * 3.1;
      return {
        ...item,
        score: item.score - penalty,
        reason: `${item.reason} / 가격대 조정(-${penalty.toFixed(1)})`,
      };
    })
    .sort((a, b) => b.score - a.score);

  const moderate = adjusted.filter(
    (item) => computePremiumRisk(item) < 2 && item.restaurant.priceTier !== "premium",
  );
  const selected = moderate.length >= 2 ? moderate : adjusted;

  return selected.slice(0, 12).map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}

function applyCuisineIntentScoring(
  matched: MatchedRestaurant[],
  intent: RecommendationIntent,
) {
  if (!intent.cuisine || intent.cuisineRestaurantSignals.length === 0) {
    return matched;
  }

  const adjusted = matched
    .map((item) => {
      const haystack = normalizeText(
        [
          item.restaurant.name,
          item.restaurant.category ?? "",
          item.restaurant.roadAddress ?? "",
          ...item.restaurant.menus,
        ].join(" "),
      );

      const isIntentMatch = intent.cuisineRestaurantSignals.some((signal) =>
        haystack.includes(normalizeText(signal)),
      ) || item.restaurant.cuisineTags.includes(intent.cuisine!);

      if (isIntentMatch) {
        return {
          ...item,
          score: item.score + 0.8,
          reason: `${item.reason} / ${intent.cuisineLabel} 선호 반영`,
          isIntentMatch,
        };
      }

      return {
        ...item,
        score: item.score - 3.2,
        reason: `${item.reason} / ${intent.cuisineLabel} 선호 불일치`,
        isIntentMatch,
      };
    })
    .sort((a, b) => b.score - a.score);

  const intentMatched = adjusted.filter((item) => item.isIntentMatch);
  const selectedBase = intentMatched.length >= 1 ? intentMatched : adjusted;

  return selectedBase
    .slice(0, 12)
    .map(({ isIntentMatch: _isIntentMatch, ...item }, idx) => ({
      ...item,
      rank: idx + 1,
    }));
}

function buildFallbackByIntent(regionRestaurants: Restaurant[], intent: RecommendationIntent, limit = 12) {
  const scoped = regionRestaurants.filter((restaurant) => {
    if (intent.isBudgetFriendlyMode && restaurant.priceTier === "premium") {
      return false;
    }

    if (!intent.cuisine || intent.cuisineRestaurantSignals.length === 0) {
      return true;
    }

    const haystack = normalizeText(
      [restaurant.name, restaurant.category ?? "", ...restaurant.menus, ...restaurant.cuisineTags].join(" "),
    );

    const signalMatch = intent.cuisineRestaurantSignals.some((signal) =>
      haystack.includes(normalizeText(signal)),
    );

    return signalMatch || restaurant.cuisineTags.includes(intent.cuisine);
  });

  const ranked = [...scoped]
    .map((restaurant) => {
      const base = (restaurant.rating ?? 0) * 0.8 + Math.min(2.5, (restaurant.reviewCount ?? 0) / 1000);
      const budgetBonus = intent.isBudgetFriendlyMode && restaurant.priceTier === "budget" ? 0.6 : 0;

      return {
        restaurant,
        score: Number((base + budgetBonus).toFixed(2)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map((item, idx) => ({
    restaurant: item.restaurant,
    score: item.score,
    reason: intent.cuisineLabel
      ? `${intent.cuisineLabel} 의도 기반 폴백`
      : "지역 상위 식당 폴백",
    rank: idx + 1,
    distanceMeters: null,
    walkMinutes: null,
    walkBucket: null,
    walkBucketLabel: null,
  }));
}

function getDistanceBonus(distanceMeters: number) {
  if (distanceMeters <= 400) return 2.4;
  if (distanceMeters <= 800) return 1.5;
  if (distanceMeters <= 1600) return 0.6;
  return -1.6;
}

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getAddressQuery(item: MatchedRestaurant) {
  return item.restaurant.roadAddress ?? item.restaurant.address;
}

async function enrichWithDistance(
  matched: MatchedRestaurant[],
  workplace: Coordinates,
): Promise<MatchedRestaurant[]> {
  try {
    const env = getServerEnv();
    const supabase = createServiceRoleClient();

    const geocodeTargets = matched
      .filter((item) => item.restaurant.lat === null || item.restaurant.lng === null)
      .map((item) => getAddressQuery(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, env.GEOCODING_MAX_PER_REQUEST);

    const uniqueQueries = Array.from(new Set(geocodeTargets.map((item) => normalizeGeocodeQuery(item))));

    const cached = await listGeocodeCacheByQueries(supabase, uniqueQueries);
    const resolvedMap = new Map<string, Coordinates>();

    for (const [query, item] of cached.entries()) {
      resolvedMap.set(query, { lat: item.lat, lng: item.lng });
    }

    const newCacheRows: Array<{ query: string; lat: number; lng: number; provider: string | null }> = [];

    for (const query of uniqueQueries) {
      if (resolvedMap.has(query)) {
        continue;
      }

      const resolved = await geocodeAddress(query);
      if (resolved) {
        resolvedMap.set(query, {
          lat: resolved.lat,
          lng: resolved.lng,
        });

        newCacheRows.push({
          query,
          lat: resolved.lat,
          lng: resolved.lng,
          provider: resolved.provider,
        });
      }

      await sleep(280);
    }

    if (newCacheRows.length > 0) {
      await upsertGeocodeCache(supabase, newCacheRows);
    }

    const coordinateUpdates = new Map<string, Coordinates>();

    const withDistance = matched.map((item) => {
      let lat = item.restaurant.lat;
      let lng = item.restaurant.lng;

      if ((lat === null || lng === null) && getAddressQuery(item)) {
        const query = normalizeGeocodeQuery(getAddressQuery(item) ?? "");
        const resolved = resolvedMap.get(query);
        if (resolved) {
          lat = resolved.lat;
          lng = resolved.lng;
          coordinateUpdates.set(item.restaurant.id, resolved);
        }
      }

      if (lat === null || lng === null) {
        return {
          ...item,
          restaurant: {
            ...item.restaurant,
            lat,
            lng,
          },
        };
      }

      const distanceMeters = haversineMeters(workplace.lat, workplace.lng, lat, lng);
      const walk = classifyWalkDistance(distanceMeters);

      return {
        ...item,
        score: item.score + getDistanceBonus(distanceMeters),
        reason: `${item.reason} / ${walk.bucketLabel}(${distanceMeters}m)`,
        distanceMeters,
        walkMinutes: walk.walkMinutes,
        walkBucket: walk.bucket,
        walkBucketLabel: walk.bucketLabel,
        restaurant: {
          ...item.restaurant,
          lat,
          lng,
        },
      };
    });

    for (const [restaurantId, point] of coordinateUpdates.entries()) {
      await updateRestaurantCoordinates(supabase, restaurantId, point.lat, point.lng);
    }

    const sorted = [...withDistance].sort((a, b) => b.score - a.score);
    const nearFirst = sorted.filter((item) => item.walkBucket !== "walk_far");

    const selected = (nearFirst.length >= 8 ? nearFirst : sorted).slice(0, 12);

    return selected.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  } catch {
    return matched;
  }
}

export async function recommendTodayMenus(input: RecommendationInput) {
  const env = getServerEnv();
  const supabase = createServiceRoleClient();

  assertAllowedRegion(input.region);

  const context = await buildDailyContext(input.region);

  await supabase.from("daily_context").upsert(
    {
      context_date: context.contextDate,
      location: context.location,
      weather: context.weatherRaw,
      events: context.events,
      situations: context.situations,
      raw: {
        weatherSummary: context.weatherSummary,
      },
    },
    { onConflict: "context_date,location" },
  );

  const preference = await getUserPreference(supabase, input.userId);
  const intent = buildRecommendationIntent(input.manualPreferenceNote, preference);

  const regionRestaurants = await listRestaurantsByRegion(supabase, input.region, 700);

  const recommendation = await recommendMenusWithAI({
    region: input.region,
    context,
    restaurants: regionRestaurants,
    preference,
    manualPreferenceNote: input.manualPreferenceNote,
  });

  let matched = matchRestaurantsByMenus(regionRestaurants, recommendation.menus, 12);

  if (matched.length === 0) {
    const fallbackRows = await listRestaurantsByMenus(
      supabase,
      input.region,
      recommendation.menus,
      12,
    );

    matched = fallbackRows.map((restaurant, idx) => ({
      restaurant,
      score: 1,
      reason: "메뉴 배열 중첩 기반 매칭",
      rank: idx + 1,
      distanceMeters: null,
      walkMinutes: null,
      walkBucket: null,
      walkBucketLabel: null,
    }));

    if (matched.length === 0) {
      matched = buildFallbackByIntent(regionRestaurants, intent, 12);
    }
  }

  if (matched.length > 0 && matched.length < 3) {
    const supplement = buildFallbackByIntent(regionRestaurants, intent, 6).filter(
      (candidate) =>
        !matched.some((existing) => existing.restaurant.id === candidate.restaurant.id),
    );

    matched = [...matched, ...supplement].slice(0, 12).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }

  matched = await enrichWithDistance(matched, {
    lat: env.WORKPLACE_LAT,
    lng: env.WORKPLACE_LNG,
  });

  matched = applyBudgetAwareScoring(matched, intent);
  matched = applyCuisineIntentScoring(matched, intent);

  const pitches = buildRecommendationPitches(context, recommendation, matched);

  const { data: insertedRecommendation, error: recommendationError } = await supabase
    .from("menu_recommendations")
    .insert({
      user_id: input.userId,
      region: input.region,
      context_date: context.contextDate,
      recommended_menus: recommendation.menus,
      reasoning: recommendation.reasoning,
      model_name: recommendation.modelName,
      confidence: recommendation.confidence,
      input_snapshot: {
        weatherSummary: context.weatherSummary,
        events: context.events,
        situations: context.situations,
        manualPreferenceNote: input.manualPreferenceNote,
        intent: {
          isOfficeLunchMode: intent.isOfficeLunchMode,
          isBudgetFriendlyMode: intent.isBudgetFriendlyMode,
          budgetMinKrw: intent.budgetMinKrw,
          budgetMaxKrw: intent.budgetMaxKrw,
          wantsPremium: intent.wantsPremium,
          cuisine: intent.cuisine,
          cuisineLabel: intent.cuisineLabel,
          cuisineRestaurantSignals: intent.cuisineRestaurantSignals,
        },
        policy: {
          budgetFriendlyRangeKrw: [BUDGET_FRIENDLY_MIN_KRW, BUDGET_FRIENDLY_MAX_KRW],
        },
        workplace: {
          address: env.WORKPLACE_ADDRESS,
          lat: env.WORKPLACE_LAT,
          lng: env.WORKPLACE_LNG,
        },
      },
    })
    .select("id")
    .single();

  if (recommendationError || !insertedRecommendation) {
    throw new Error(
      `Failed to write recommendation history: ${recommendationError?.message ?? "unknown"}`,
    );
  }

  if (matched.length > 0) {
    const { error: linkError } = await supabase
      .from("recommendation_restaurants")
      .insert(
        matched.map((item) => ({
          recommendation_id: insertedRecommendation.id,
          restaurant_id: item.restaurant.id,
          rank: item.rank,
          score: item.score,
          match_reason: item.reason,
          distance_meters: item.distanceMeters,
          walk_bucket: item.walkBucket,
        })),
      );

    if (linkError) {
      throw new Error(`Failed to write matched restaurants: ${linkError.message}`);
    }
  }

  return {
    recommendationId: insertedRecommendation.id,
    context,
    recommendation,
    restaurants: matched,
    pitches,
    workplace: {
      address: env.WORKPLACE_ADDRESS,
      lat: env.WORKPLACE_LAT,
      lng: env.WORKPLACE_LNG,
    },
  };
}
