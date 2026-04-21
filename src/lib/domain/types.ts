import type { Json } from "@/lib/supabase/types";
import type { WalkBucket } from "@/lib/domain/walk-distance";

export interface Restaurant {
  id: string;
  source: string;
  sourceId: string;
  name: string;
  category: string | null;
  phone: string | null;
  address: string | null;
  roadAddress: string | null;
  lat: number | null;
  lng: number | null;
  region: string;
  menus: string[];
  rating: number | null;
  reviewCount: number | null;
  priceTier: "budget" | "moderate" | "premium" | null;
  premiumRiskScore: number;
  cuisineTags: string[];
}

export interface UserPreference {
  userId: string;
  favoriteMenus: string[];
  dislikedIngredients: string[];
  dietaryRules: string[];
  preferredVibes: string[];
  maxBudgetKrw: number | null;
}

export interface DailyContext {
  contextDate: string;
  location: string;
  weatherSummary: string;
  weatherRaw: Json | null;
  events: string[];
  situations: string[];
}

export interface MenuRecommendation {
  menus: string[];
  reasoning: string;
  modelName: string;
  confidence: "low" | "medium" | "high";
}

export interface MatchedRestaurant {
  restaurant: Restaurant;
  score: number;
  reason: string;
  rank: number;
  distanceMeters: number | null;
  walkMinutes: number | null;
  walkBucket: WalkBucket | null;
  walkBucketLabel: string | null;
}
