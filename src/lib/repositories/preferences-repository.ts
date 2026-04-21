import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserPreference } from "@/lib/domain/types";
import type { Database } from "@/lib/supabase/types";

function mapPreference(
  row: Database["public"]["Tables"]["user_preferences"]["Row"],
): UserPreference {
  return {
    userId: row.user_id,
    favoriteMenus: row.favorite_menus ?? [],
    dislikedIngredients: row.disliked_ingredients ?? [],
    dietaryRules: row.dietary_rules ?? [],
    preferredVibes: row.preferred_vibes ?? [],
    maxBudgetKrw: row.max_budget_krw,
  };
}

export async function getUserPreference(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user preference: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapPreference(data);
}
