import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv();

import { runManualNaverCrawl } from "../src/lib/services/crawl-service";

function readArg(name: string) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

const defaultQueries = [
  "일식",
  "일식 점심",
  "우동",
  "소바",
  "돈까스",
  "덮밥",
  "초밥",
  "가성비 일식",
  "점심 맛집",
  "만원대 맛집",
];

async function main() {
  const region = readArg("region") || process.env.CRAWL_REGION;
  const maxScrollsArg = readArg("max-scrolls");
  const maxScrolls = maxScrollsArg ? Number(maxScrollsArg) : undefined;

  if (!region) {
    throw new Error(
      "region is required. Example: npm run crawl:matrix -- --region '서울 영등포구 여의도동'",
    );
  }

  const queryArg = readArg("queries");
  const queries = queryArg
    ? queryArg
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : defaultQueries;

  const results: Array<{
    query: string;
    collected: number;
    upserted: number;
    warning: string | null;
  }> = [];

  for (const query of queries) {
    const result = await runManualNaverCrawl({
      region,
      query,
      maxScrolls,
      triggeredBy: "cli_matrix",
    });

    results.push({
      query: result.query,
      collected: result.collected,
      upserted: result.upserted,
      warning: result.warning,
    });

    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  const totalCollected = results.reduce((sum, item) => sum + item.collected, 0);
  const totalUpserted = results.reduce((sum, item) => sum + item.upserted, 0);

  console.log(
    JSON.stringify(
      {
        region,
        queryCount: results.length,
        totalCollected,
        totalUpserted,
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
