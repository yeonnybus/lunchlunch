import { chromium } from "playwright";

import { getServerEnv } from "@/lib/env";

export interface CrawledRestaurant {
  sourceId: string;
  name: string;
  category: string | null;
  phone: string | null;
  address: string | null;
  roadAddress: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number | null;
  raw: Record<string, unknown>;
}

interface CrawlParams {
  region: string;
  query?: string;
  maxScrolls?: number;
}

export interface CrawlOutput {
  source: "naver_map";
  region: string;
  query: string;
  collectedAt: string;
  restaurants: CrawledRestaurant[];
  warning: string | null;
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).replace(/[^0-9.]/g, "");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractRegionToken(region: string) {
  const tokens = region
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const matching = tokens.find((item) => item.includes("여의도"));
  return matching ?? tokens[tokens.length - 1] ?? region;
}

function buildKeyword(region: string, query?: string) {
  const regionToken = extractRegionToken(region);
  const cleanedQuery = query?.trim();

  if (!cleanedQuery) {
    return `${regionToken} 맛집`;
  }

  if (cleanedQuery.includes(regionToken) || cleanedQuery.includes("여의도")) {
    return cleanedQuery;
  }

  return `${regionToken} ${cleanedQuery}`;
}

function uniqueBySourceId(restaurants: CrawledRestaurant[]) {
  const unique = new Map<string, CrawledRestaurant>();

  for (const item of restaurants) {
    const key = item.sourceId || item.name;
    if (!key) continue;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return Array.from(unique.values());
}

export async function crawlNaverMapRestaurants({
  region,
  query,
  maxScrolls,
}: CrawlParams): Promise<CrawlOutput> {
  const env = getServerEnv();

  const keyword = buildKeyword(region, query);
  const scrollLimit = maxScrolls ?? env.NAVER_CRAWLER_MAX_SCROLLS;

  const browser = await chromium.launch({
    headless: env.NAVER_CRAWLER_HEADLESS,
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1024 },
  });

  const warningMessages: string[] = [];

  try {
    const searchUrl = `https://pcmap.place.naver.com/restaurant/list?query=${encodeURIComponent(keyword)}`;
    await page.goto(searchUrl, {
      timeout: env.NAVER_CRAWLER_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });

    await page.waitForTimeout(2500);

    const scrollTarget = page.locator("#_pcmap_list_scroll_container");
    const hasScrollTarget = (await scrollTarget.count()) > 0;

    let noGrowthCount = 0;
    let previousCount = 0;

    for (let i = 0; i < scrollLimit; i += 1) {
      if (hasScrollTarget) {
        await scrollTarget
          .evaluate((node) => {
            node.scrollTop = node.scrollHeight;
          })
          .catch(() => undefined);
      } else {
        await page.mouse.wheel(0, 1400).catch(() => undefined);
      }

      await page.waitForTimeout(500);

      const currentCount = await page.evaluate(() => {
        const state = (window as Window & { __APOLLO_STATE__?: Record<string, unknown> })
          .__APOLLO_STATE__;

        if (!state) {
          return 0;
        }

        return Object.values(state).filter((item) => {
          return (
            typeof item === "object" &&
            item !== null &&
            (item as { __typename?: string }).__typename === "RestaurantListSummary"
          );
        }).length;
      });

      if (currentCount <= previousCount) {
        noGrowthCount += 1;
      } else {
        noGrowthCount = 0;
        previousCount = currentCount;
      }

      if (noGrowthCount >= 4) {
        break;
      }
    }

    const extracted = await page.evaluate(() => {
      const state = (window as Window & { __APOLLO_STATE__?: Record<string, unknown> })
        .__APOLLO_STATE__;

      if (!state) {
        return [] as Array<{
          sourceId: string;
          name: string;
          category: string | null;
          phone: string | null;
          address: string | null;
          roadAddress: string | null;
          lat: number | null;
          lng: number | null;
          rating: number | null;
          reviewCount: number | null;
          raw: Record<string, unknown>;
        }>;
      }

      return Object.values(state)
        .filter((item) => {
          return (
            typeof item === "object" &&
            item !== null &&
            (item as { __typename?: string }).__typename === "RestaurantListSummary"
          );
        })
        .map((item) => {
          const row = item as {
            id?: string;
            apolloCacheId?: string;
            name?: string;
            category?: string;
            phone?: string | null;
            virtualPhone?: string | null;
            fullAddress?: string | null;
            commonAddress?: string | null;
            address?: string | null;
            roadAddress?: string | null;
            y?: string | number | null;
            x?: string | number | null;
            visitorReviewScore?: string | number | null;
            totalReviewCount?: string | number | null;
            visitorReviewCount?: string | number | null;
            blogCafeReviewCount?: string | number | null;
          };

          const address =
            row.fullAddress ||
            [row.commonAddress, row.address]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            row.address ||
            row.commonAddress ||
            null;

          return {
            sourceId: String(row.id || row.apolloCacheId || ""),
            name: row.name?.trim() || "",
            category: row.category?.trim() || null,
            phone: row.phone || row.virtualPhone || null,
            address,
            roadAddress: row.roadAddress || null,
            lat: row.y === null || row.y === undefined ? null : Number(row.y),
            lng: row.x === null || row.x === undefined ? null : Number(row.x),
            rating:
              row.visitorReviewScore === null || row.visitorReviewScore === undefined
                ? null
                : Number(row.visitorReviewScore),
            reviewCount:
              row.totalReviewCount ?? row.visitorReviewCount ?? row.blogCafeReviewCount ?? null,
            raw: row as unknown as Record<string, unknown>,
          };
        })
        .filter((item) => Boolean(item.name));
    });

    const restaurants: CrawledRestaurant[] = extracted
      .map((item) => ({
        sourceId: item.sourceId || `${item.name}-${item.address ?? ""}`,
        name: item.name,
        category: item.category,
        phone: item.phone,
        address: item.address,
        roadAddress: item.roadAddress,
        lat: parseNumber(item.lat),
        lng: parseNumber(item.lng),
        rating: parseNumber(item.rating),
        reviewCount: parseNumber(item.reviewCount),
        raw: item.raw,
      }))
      .filter((item) => {
        const combinedAddress = `${item.address ?? ""} ${item.roadAddress ?? ""}`;
        if (!combinedAddress) {
          return true;
        }

        const regionToken = extractRegionToken(region);
        if (regionToken.includes("여의도")) {
          return combinedAddress.includes("여의도");
        }

        return combinedAddress.includes(regionToken);
      });

    if (restaurants.length === 0) {
      warningMessages.push(
        "네이버 검색 결과를 수집하지 못했습니다. query를 '여의도 맛집'처럼 지역 포함 키워드로 재시도하거나 셀렉터/API 변경 여부를 점검하세요.",
      );
    }

    return {
      source: "naver_map",
      region,
      query: keyword,
      collectedAt: new Date().toISOString(),
      restaurants: uniqueBySourceId(restaurants),
      warning: warningMessages.length > 0 ? warningMessages.join(" ") : null,
    };
  } finally {
    await page.close();
    await browser.close();
  }
}
