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

async function main() {
  const region = readArg("region") || process.env.CRAWL_REGION;
  const query = readArg("query");
  const maxScrollsArg = readArg("max-scrolls");

  if (!region) {
    throw new Error("region is required. Example: npm run crawl:naver -- --region '서울 영등포구 여의도동'");
  }

  const result = await runManualNaverCrawl({
    region,
    query,
    maxScrolls: maxScrollsArg ? Number(maxScrollsArg) : undefined,
    triggeredBy: "cli",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
