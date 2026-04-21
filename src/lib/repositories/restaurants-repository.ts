import type { SupabaseClient } from "@supabase/supabase-js";

import type { Restaurant } from "@/lib/domain/types";
import type { Database } from "@/lib/supabase/types";

export type RestaurantInsert = Database["public"]["Tables"]["restaurants"]["Insert"];

type RestaurantRow = Database["public"]["Tables"]["restaurants"]["Row"];

function parsePriceTier(value: string | null): "budget" | "moderate" | "premium" | null {
  if (value === "budget" || value === "moderate" || value === "premium") {
    return value;
  }

  return null;
}

function mapRestaurantRow(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.source_id,
    name: row.name,
    category: row.category,
    phone: row.phone,
    address: row.address,
    roadAddress: row.road_address,
    lat: row.lat,
    lng: row.lng,
    region: row.region,
    menus: row.menus ?? [],
    rating: row.rating,
    reviewCount: row.review_count,
    priceTier: parsePriceTier(row.price_tier),
    premiumRiskScore: row.premium_risk_score ?? 0,
    cuisineTags: row.cuisine_tags ?? [],
  };
}

export async function upsertRestaurants(
  supabase: SupabaseClient<Database>,
  values: RestaurantInsert[],
) {
  if (values.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("restaurants")
    .upsert(values, { onConflict: "source,source_id" });

  if (error) {
    const supportsLegacyColumns =
      error.message.includes("cuisine_tags") ||
      error.message.includes("price_tier") ||
      error.message.includes("premium_risk_score");

    if (supportsLegacyColumns) {
      const legacyValues = values.map((item) => {
        const {
          cuisine_tags: _cuisineTags,
          price_tier: _priceTier,
          premium_risk_score: _premiumRisk,
          ...rest
        } = item;
        return rest;
      });

      const { error: legacyError } = await supabase
        .from("restaurants")
        .upsert(legacyValues, { onConflict: "source,source_id" });

      if (legacyError) {
        throw new Error(`Failed to upsert restaurants: ${legacyError.message}`);
      }

      return values.length;
    }

    throw new Error(`Failed to upsert restaurants: ${error.message}`);
  }

  return values.length;
}

export async function listRestaurantsByRegion(
  supabase: SupabaseClient<Database>,
  region: string,
  limit = 500,
) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("region", region)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch restaurants: ${error.message}`);
  }

  return (data ?? []).map(mapRestaurantRow);
}

export async function countRestaurantsByRegion(
  supabase: SupabaseClient<Database>,
  region: string,
) {
  const { count, error } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true })
    .eq("region", region);

  if (error) {
    throw new Error(`Failed to count restaurants: ${error.message}`);
  }

  return count ?? 0;
}

export async function listRestaurantsByMenus(
  supabase: SupabaseClient<Database>,
  region: string,
  menus: string[],
  limit = 20,
) {
  const normalizedMenus = menus.filter(Boolean);
  if (normalizedMenus.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("region", region)
    .overlaps("menus", normalizedMenus)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch menu-matched restaurants: ${error.message}`);
  }

  return (data ?? []).map(mapRestaurantRow);
}

export async function updateRestaurantCoordinates(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
  lat: number,
  lng: number,
) {
  const { error } = await supabase
    .from("restaurants")
    .update({ lat, lng })
    .eq("id", restaurantId);

  if (error) {
    throw new Error(`Failed to update restaurant coordinates: ${error.message}`);
  }
}
