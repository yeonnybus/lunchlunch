import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type GeocodeCacheRow = Database["public"]["Tables"]["geocode_cache"]["Row"];
type GeocodeCacheSelectRow = Pick<GeocodeCacheRow, "query" | "lat" | "lng" | "provider">;

export interface GeocodeCacheItem {
  query: string;
  lat: number;
  lng: number;
  provider: string | null;
}

function mapRow(row: GeocodeCacheSelectRow): GeocodeCacheItem {
  return {
    query: row.query,
    lat: row.lat,
    lng: row.lng,
    provider: row.provider,
  };
}

export async function listGeocodeCacheByQueries(
  supabase: SupabaseClient<Database>,
  queries: string[],
) {
  if (queries.length === 0) {
    return new Map<string, GeocodeCacheItem>();
  }

  const { data, error } = await supabase
    .from("geocode_cache")
    .select("query,lat,lng,provider")
    .in("query", queries);

  if (error) {
    throw new Error(`Failed to read geocode cache: ${error.message}`);
  }

  return new Map((data ?? []).map((row) => [row.query, mapRow(row)]));
}

export async function upsertGeocodeCache(
  supabase: SupabaseClient<Database>,
  values: GeocodeCacheItem[],
) {
  if (values.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("geocode_cache")
    .upsert(
      values.map((item) => ({
        query: item.query,
        lat: item.lat,
        lng: item.lng,
        provider: item.provider,
        last_resolved_at: new Date().toISOString(),
      })),
      { onConflict: "query" },
    );

  if (error) {
    throw new Error(`Failed to write geocode cache: ${error.message}`);
  }
}
