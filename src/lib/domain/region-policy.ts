import { getServerEnv } from "@/lib/env";

export function normalizeRegion(region: string) {
  return region.replace(/\s+/g, " ").trim();
}

export function isAllowedRegion(region: string) {
  const env = getServerEnv();
  const normalized = normalizeRegion(region);
  return normalized.includes(env.ALLOWED_REGION_KEYWORD);
}

export function assertAllowedRegion(region: string) {
  if (!isAllowedRegion(region)) {
    throw new Error("지원 지역은 여의도동으로 제한됩니다.");
  }
}
