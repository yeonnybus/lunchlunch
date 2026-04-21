import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });
loadDotenv();

import { recommendTodayMenus } from "../src/lib/services/recommendation-service";

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
  const userId = readArg("user-id");
  const note = readArg("note");

  if (!region) {
    throw new Error(
      "region is required. Example: npm run recommend:dry -- --region '서울 영등포구 여의도동'",
    );
  }

  if (!userId) {
    throw new Error("user-id is required. Example: npm run recommend:dry -- --region '서울 영등포구 여의도동' --user-id '<UUID>'");
  }

  const result = await recommendTodayMenus({
    region,
    userId,
    manualPreferenceNote: note,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
