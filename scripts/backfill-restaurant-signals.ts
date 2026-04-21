import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv();

import { inferRestaurantSignals } from "../src/lib/domain/restaurant-signals";
import { inferMenusFromRestaurant } from "../src/lib/domain/menu-inference";
import { createServiceRoleClient } from "../src/lib/supabase/server";
import type { Json } from "../src/lib/supabase/types";

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetriableErrorMessage(message: string) {
  return message.includes("502") || message.includes("Bad gateway") || message.includes("ECONNRESET");
}

async function withRetry<T>(task: () => Promise<T>, label: string, maxAttempts = 4): Promise<T> {
  let attempt = 1;

  while (true) {
    try {
      return await task();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= maxAttempts || !isRetriableErrorMessage(message)) {
        throw new Error(`${label} failed after ${attempt} attempts: ${message}`);
      }

      const delayMs = attempt * 1000;
      console.warn(`[retry] ${label} attempt ${attempt}/${maxAttempts} failed. retrying in ${delayMs}ms`);
      await wait(delayMs);
      attempt += 1;
    }
  }
}

async function main() {
  const supabase = createServiceRoleClient();

  let page = 0;
  const pageSize = 400;
  let updated = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await withRetry(
      async () =>
        supabase
          .from("restaurants")
          .select("id,name,category,address,road_address,menus,raw")
          .range(from, to)
          .order("created_at", { ascending: true }),
      `fetch page ${page}`,
    );

    if (error) {
      throw new Error(`Failed to fetch restaurants: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const inferredMenus = inferMenusFromRestaurant(
        row.name,
        row.category,
        row.raw as Json,
        row.menus ?? [],
      );

      const signals = inferRestaurantSignals({
        name: row.name,
        category: row.category,
        address: row.address,
        roadAddress: row.road_address,
        menus: inferredMenus,
        raw: row.raw as Json,
      });

      const { error: updateError } = await withRetry(
        async () =>
          supabase
            .from("restaurants")
            .update({
              menus: inferredMenus,
              cuisine_tags: signals.cuisineTags,
              premium_risk_score: signals.premiumRiskScore,
              price_tier: signals.priceTier,
            })
            .eq("id", row.id),
        `update ${row.id}`,
      );

      if (updateError) {
        if (updateError.message.includes("cuisine_tags") || updateError.message.includes("price_tier")) {
          throw new Error(
            "restaurant signal 컬럼이 없습니다. 먼저 supabase/migrations/202604120003_restaurant_signals.sql 를 실행하세요.",
          );
        }

        throw new Error(`Failed to update signals for ${row.id}: ${updateError.message}`);
      }

      updated += 1;
    }

    page += 1;
  }

  console.log(JSON.stringify({ ok: true, updated }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
