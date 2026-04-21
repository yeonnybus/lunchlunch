import type { RestaurantInsert } from "@/lib/repositories/restaurants-repository";
import type { CrawledRestaurant } from "@/lib/crawler/naver-map-crawler";
import { inferRestaurantSignals } from "@/lib/domain/restaurant-signals";
import { inferMenusFromRestaurant } from "@/lib/domain/menu-inference";
import type { Json } from "@/lib/supabase/types";

export function normalizeCrawledRestaurants(
  items: CrawledRestaurant[],
  region: string,
  crawledAtIso: string,
): RestaurantInsert[] {
  return items.map((item) => {
    const menus = inferMenusFromRestaurant(item.name, item.category, item.raw as Json, []);
    const signals = inferRestaurantSignals({
      name: item.name,
      category: item.category,
      address: item.address,
      roadAddress: item.roadAddress,
      menus,
      raw: item.raw as Json,
    });

    return {
      source: "naver_map",
      source_id: item.sourceId,
      name: item.name,
      category: item.category,
      phone: item.phone,
      address: item.address,
      road_address: item.roadAddress,
      lat: item.lat,
      lng: item.lng,
      region,
      menus,
      rating: item.rating,
      review_count: item.reviewCount,
      raw: item.raw as Json,
      price_tier: signals.priceTier,
      premium_risk_score: signals.premiumRiskScore,
      cuisine_tags: signals.cuisineTags,
      last_crawled_at: crawledAtIso,
    };
  });
}
