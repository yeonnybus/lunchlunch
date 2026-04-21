import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv();

import { canonicalizeMenuLabel, normalizeText } from "../src/lib/domain/menu-synonyms";
import { matchRestaurantsByMenus } from "../src/lib/domain/restaurant-matcher";
import { countRestaurantsByRegion, listRestaurantsByRegion } from "../src/lib/repositories/restaurants-repository";
import { createServiceRoleClient } from "../src/lib/supabase/server";
import {
  recommendationRegressionScenarios,
  recommendationSmokeScenarioIds,
} from "../src/lib/quality/recommendation-scenarios";

function readArg(name: string) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function dedupeMenus(menus: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const menu of menus) {
    const canonical = canonicalizeMenuLabel(menu).trim();
    if (!canonical) continue;
    const key = normalizeText(canonical);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(canonical);
  }

  return output;
}

async function main() {
  const region = readArg("region") || process.env.CRAWL_REGION || "서울 영등포구 여의도동";
  const minRestaurants = Number(readArg("min-restaurants") ?? "700");
  const maxEmptyMenusPct = Number(readArg("max-empty-menus-pct") ?? "75");

  const supabase = createServiceRoleClient();
  const total = await countRestaurantsByRegion(supabase, region);
  const restaurants = await listRestaurantsByRegion(supabase, region, 2500);

  const emptyMenus = restaurants.filter((item) => item.menus.length === 0).length;
  const emptyMenusPct = Number(((emptyMenus / Math.max(1, restaurants.length)) * 100).toFixed(1));

  const scenarios = recommendationRegressionScenarios
    .filter((scenario) =>
      recommendationSmokeScenarioIds.includes(
        scenario.id as (typeof recommendationSmokeScenarioIds)[number],
      ),
    )
    .map((scenario) => {
    const normalizedMenus = dedupeMenus(scenario.menus);
    const matched = matchRestaurantsByMenus(restaurants, normalizedMenus, 8);
    return {
      ...scenario,
      normalizedMenus,
      matchedCount: matched.length,
      pass: matched.length >= scenario.minMatches,
    };
  });

  const failures = scenarios.filter((item) => !item.pass);

  const checks = {
    totalRestaurants: total >= minRestaurants,
    menuCoverage: emptyMenusPct <= maxEmptyMenusPct,
    scenarioPass: failures.length === 0,
  };

  const ok = Object.values(checks).every(Boolean);

  console.log(
    JSON.stringify(
      {
        ok,
        region,
        checks,
        thresholds: {
          minRestaurants,
          maxEmptyMenusPct,
        },
        metrics: {
          totalRestaurants: total,
          emptyMenus,
          emptyMenusPct,
        },
        scenarios,
      },
      null,
      2,
    ),
  );

  if (!ok) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
