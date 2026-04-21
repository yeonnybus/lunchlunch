import { config as loadDotenv } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

loadDotenv({ path: ".env.local" });
loadDotenv();

import { canonicalizeMenuLabel, normalizeText } from "../src/lib/domain/menu-synonyms";
import { matchRestaurantsByMenus } from "../src/lib/domain/restaurant-matcher";
import { createServiceRoleClient } from "../src/lib/supabase/server";
import { listRestaurantsByRegion } from "../src/lib/repositories/restaurants-repository";
import {
  recommendationRegressionScenarios,
  recommendationSmokeScenarioIds,
} from "../src/lib/quality/recommendation-scenarios";

function readArg(name: string) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

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
  const suite = (readArg("suite") || "full").toLowerCase();
  const failOnError = (readArg("fail-on-error") || "true").toLowerCase() !== "false";
  const outPath = readArg("out");

  const scenarios =
    suite === "smoke"
      ? recommendationRegressionScenarios.filter((scenario) =>
          recommendationSmokeScenarioIds.includes(
            scenario.id as (typeof recommendationSmokeScenarioIds)[number],
          ),
        )
      : recommendationRegressionScenarios;

  const supabase = createServiceRoleClient();
  const restaurants = await listRestaurantsByRegion(supabase, region, 2000);

  const results = scenarios.map((scenario) => {
    const normalizedMenus = dedupeMenus(scenario.menus);
    const matched = matchRestaurantsByMenus(restaurants, normalizedMenus, 8);

    return {
      scenario: scenario.id,
      category: scenario.category,
      inputMenus: scenario.menus,
      normalizedMenus,
      matchedCount: matched.length,
      pass: matched.length >= scenario.minMatches,
      topRestaurants: matched.slice(0, 3).map((item) => item.restaurant.name),
    };
  });

  const categoryStats = {
    total: restaurants.length,
    emptyMenus: restaurants.filter((item) => item.menus.length === 0).length,
    emptyCuisineTags: restaurants.filter((item) => item.cuisineTags.length === 0).length,
  };

  const failures = results.filter((item) => !item.pass);

  const categorySummary = Object.entries(
    results.reduce<Record<string, { total: number; pass: number }>>((acc, item) => {
      const prev = acc[item.category] ?? { total: 0, pass: 0 };
      acc[item.category] = {
        total: prev.total + 1,
        pass: prev.pass + (item.pass ? 1 : 0),
      };
      return acc;
    }, {}),
  ).map(([category, value]) => ({
    category,
    total: value.total,
    pass: value.pass,
    passRate: Number(((value.pass / Math.max(1, value.total)) * 100).toFixed(1)),
  }));

  const ok = failures.length === 0;

  const report = {
    ok,
    region,
    suite,
    generatedAt: new Date().toISOString(),
    categoryStats: {
      ...categoryStats,
      emptyMenusPct: Number(((categoryStats.emptyMenus / Math.max(1, categoryStats.total)) * 100).toFixed(1)),
      emptyCuisineTagsPct: Number(
        ((categoryStats.emptyCuisineTags / Math.max(1, categoryStats.total)) * 100).toFixed(1),
      ),
    },
    scenarios: results,
    failures,
    categorySummary,
  };

  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(report, null, 2));

  if (!ok && failOnError) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
