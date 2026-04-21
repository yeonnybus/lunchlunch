import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv();

import { normalizeRegion } from "../src/lib/domain/region-policy";
import {
  countRestaurantsByRegion,
  listRestaurantsByRegion,
} from "../src/lib/repositories/restaurants-repository";
import { runManualNaverCrawl } from "../src/lib/services/crawl-service";
import { createServiceRoleClient } from "../src/lib/supabase/server";

function readArg(name: string) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function dedupe(values: string[]) {
  const unique = new Set<string>();

  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    unique.add(normalized);
  }

  return Array.from(unique.values());
}

function getRegionToken(region: string) {
  const normalized = normalizeRegion(region);
  const tokens = normalized.split(" ").filter(Boolean);
  return tokens.find((item) => item.includes("여의도")) ?? "여의도";
}

function generateStageOneQueries(regionToken: string) {
  return dedupe([
    `${regionToken} 맛집`,
    `${regionToken} 점심 맛집`,
    `${regionToken} 직장인 점심`,
    `${regionToken} 가성비 맛집`,
    `${regionToken} 혼밥`,
    `${regionToken} 평일 점심`,
    "여의도 맛집",
    "여의도 점심",
    "여의도동 맛집",
    "여의도역 맛집",
    "국회의사당역 맛집",
    "여의나루역 맛집",
    "샛강역 맛집",
    "더현대 맛집",
    "IFC몰 맛집",
    "동여의도 맛집",
    "서여의도 맛집",
    "국제금융로 맛집",
  ]);
}

function generateStageTwoQueries() {
  const hubs = ["여의도역", "국회의사당역", "샛강역", "여의나루역", "동여의도", "서여의도", "더현대", "IFC몰"];
  const cuisines = [
    "한식",
    "일식",
    "중식",
    "양식",
    "분식",
    "국밥",
    "칼국수",
    "우동",
    "소바",
    "초밥",
    "돈까스",
    "파스타",
    "쌀국수",
    "햄버거",
    "치킨",
    "피자",
    "샐러드",
    "브런치",
    "덮밥",
    "찌개",
    "해장",
  ];

  const generated: string[] = [];

  for (const hub of hubs) {
    for (const cuisine of cuisines) {
      generated.push(`${hub} ${cuisine}`);
      generated.push(`${hub} ${cuisine} 맛집`);
    }
  }

  return dedupe(generated);
}

function extractDynamicCategoryQueries(categories: Array<string | null>, regionToken: string) {
  const picked = new Set<string>();

  for (const category of categories) {
    if (!category) continue;

    const tokens = category
      .split(/[\/,]/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1 && token.length <= 12);

    for (const token of tokens) {
      picked.add(token);
    }
  }

  const topTokens = Array.from(picked).slice(0, 25);
  return dedupe(topTokens.map((token) => `${regionToken} ${token} 맛집`));
}

type CrawlAttemptResult = {
  status: "success" | "failed";
  query: string;
  jobId: string | null;
  collected: number;
  upserted: number;
  newRows: number;
  warning: string | null;
  errorMessage: string | null;
};

async function runQueryAndMeasure(
  region: string,
  query: string,
  maxScrolls: number,
  retryCount = 2,
): Promise<CrawlAttemptResult> {
  let attempt = 0;

  while (attempt <= retryCount) {
    try {
      const supabase = createServiceRoleClient();
      const beforeCount = await countRestaurantsByRegion(supabase, region);

      const result = await runManualNaverCrawl({
        region,
        query,
        maxScrolls,
        triggeredBy: "cli_full_yeouido",
      });

      const afterCount = await countRestaurantsByRegion(supabase, region);

      return {
        status: "success",
        query: result.query,
        jobId: result.jobId,
        collected: result.collected,
        upserted: result.upserted,
        newRows: Math.max(0, afterCount - beforeCount),
        warning: result.warning,
        errorMessage: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown crawl error";
      const retryable =
        message.includes("ERR_NETWORK_CHANGED") ||
        message.includes("Timeout") ||
        message.includes("Navigation") ||
        message.includes("net::ERR_");

      if (!retryable || attempt >= retryCount) {
        return {
          status: "failed",
          query,
          jobId: null,
          collected: 0,
          upserted: 0,
          newRows: 0,
          warning: null,
          errorMessage: message,
        };
      }

      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }

  return {
    status: "failed",
    query,
    jobId: null,
    collected: 0,
    upserted: 0,
    newRows: 0,
    warning: null,
    errorMessage: "Retry limit reached",
  };
}

async function countWithRetry(region: string, retryCount = 2) {
  let attempt = 0;

  while (attempt <= retryCount) {
    try {
      const supabase = createServiceRoleClient();
      return await countRestaurantsByRegion(supabase, region);
    } catch (error) {
      if (attempt >= retryCount) {
        throw error;
      }

      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, 900 * attempt));
    }
  }

  return 0;
}

async function main() {
  const regionArg = readArg("region") || process.env.CRAWL_REGION;
  if (!regionArg) {
    throw new Error(
      "region is required. Example: npm run crawl:yeouido-full -- --region '서울 영등포구 여의도동'",
    );
  }

  const region = normalizeRegion(regionArg);
  const regionToken = getRegionToken(region);
  const maxScrolls = Number(readArg("max-scrolls") ?? "60");
  const delayMs = Number(readArg("delay-ms") ?? "550");
  const plateauWindow = Number(readArg("plateau-window") ?? "25");
  const plateauThreshold = Number(readArg("plateau-threshold") ?? "5");
  const maxQueries = Number(readArg("max-queries") ?? "9999");

  const stageOne = generateStageOneQueries(regionToken);
  const stageTwo = generateStageTwoQueries();

  const supabase = createServiceRoleClient();
  const existing = await listRestaurantsByRegion(supabase, region, 2000);
  const dynamic = extractDynamicCategoryQueries(existing.map((item) => item.category), regionToken);

  const allQueries = dedupe([...stageOne, ...stageTwo, ...dynamic]);

  const results: CrawlAttemptResult[] = [];
  let rollingNewRows = 0;

  for (let i = 0; i < allQueries.length; i += 1) {
    if (results.length >= maxQueries) {
      break;
    }

    const query = allQueries[i];

    const result = await runQueryAndMeasure(region, query, maxScrolls);
    results.push(result);

    rollingNewRows += result.newRows;

    if (results.length >= plateauWindow) {
      const recent = results.slice(results.length - plateauWindow);
      rollingNewRows = recent.reduce((sum, item) => sum + item.newRows, 0);

      if (rollingNewRows <= plateauThreshold) {
        break;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  const totalCollected = results.reduce((sum, item) => sum + item.collected, 0);
  const totalNewRows = results.reduce((sum, item) => sum + item.newRows, 0);
  const finalCount = await countWithRetry(region);

  console.log(
    JSON.stringify(
      {
        region,
        queryPlanned: allQueries.length,
        queryExecuted: results.length,
        totalCollected,
        totalNewRows,
        finalCount,
        plateauWindow,
        plateauThreshold,
        maxScrolls,
        maxQueries,
        results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
