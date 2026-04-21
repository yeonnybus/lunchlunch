import { getServerEnv } from "@/lib/env";

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
}

export interface GeocodedPoint {
  lat: number;
  lng: number;
  displayName: string | null;
  provider: "nominatim";
}

export function normalizeGeocodeQuery(address: string) {
  return address.replace(/\s+/g, " ").trim();
}

export async function geocodeAddress(address: string): Promise<GeocodedPoint | null> {
  const env = getServerEnv();
  if (!env.GEOCODING_ENABLED) {
    return null;
  }

  const normalized = normalizeGeocodeQuery(address);
  if (!normalized) {
    return null;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "kr");
  url.searchParams.set("accept-language", "ko");
  url.searchParams.set("q", normalized);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.GEOCODING_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "LunchLaunch/0.1 (personal-project)",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const results = (await response.json()) as NominatimResult[];
    const first = results[0];

    if (!first?.lat || !first?.lon) {
      return null;
    }

    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return {
      lat,
      lng,
      displayName: first.display_name ?? null,
      provider: "nominatim",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
