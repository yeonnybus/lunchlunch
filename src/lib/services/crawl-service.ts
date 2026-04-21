import { crawlNaverMapRestaurants } from "@/lib/crawler/naver-map-crawler";
import { normalizeCrawledRestaurants } from "@/lib/crawler/normalizer";
import { assertAllowedRegion } from "@/lib/domain/region-policy";
import { upsertRestaurants } from "@/lib/repositories/restaurants-repository";
import { createServiceRoleClient } from "@/lib/supabase/server";

interface ManualCrawlInput {
  region: string;
  query?: string;
  maxScrolls?: number;
  triggeredBy?: string;
}

export async function runManualNaverCrawl(input: ManualCrawlInput) {
  assertAllowedRegion(input.region);

  const supabase = createServiceRoleClient();

  const now = new Date().toISOString();
  const requestedQuery = input.query?.trim() || `${input.region} 맛집`;

  const { data: started, error: startError } = await supabase
    .from("crawl_jobs")
    .insert({
      region: input.region,
      query: requestedQuery,
      status: "running",
      started_at: now,
      triggered_by: input.triggeredBy ?? "manual",
    })
    .select("id")
    .single();

  if (startError || !started) {
    throw new Error(`Failed to create crawl job: ${startError?.message ?? "unknown"}`);
  }

  try {
    const crawlResult = await crawlNaverMapRestaurants({
      region: input.region,
      query: requestedQuery,
      maxScrolls: input.maxScrolls,
    });

    const normalized = normalizeCrawledRestaurants(
      crawlResult.restaurants,
      input.region,
      crawlResult.collectedAt,
    );

    const upsertedCount = await upsertRestaurants(supabase, normalized);

    const { error: doneError } = await supabase
      .from("crawl_jobs")
      .update({
        status: "success",
        ended_at: new Date().toISOString(),
        total_collected: crawlResult.restaurants.length,
        total_upserted: upsertedCount,
        error_message: crawlResult.warning,
      })
      .eq("id", started.id);

    if (doneError) {
      throw new Error(`Failed to finalize crawl job: ${doneError.message}`);
    }

    return {
      jobId: started.id,
      query: crawlResult.query,
      warning: crawlResult.warning,
      collected: crawlResult.restaurants.length,
      upserted: upsertedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawl error";

    await supabase
      .from("crawl_jobs")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        error_message: message,
      })
      .eq("id", started.id);

    throw error;
  }
}
