const WALKING_METERS_PER_MINUTE = 67;

export type WalkBucket = "walk_5" | "walk_10" | "walk_15_20" | "walk_far";

export interface WalkDistanceInfo {
  distanceMeters: number;
  walkMinutes: number;
  bucket: WalkBucket;
  bucketLabel: string;
}

export function haversineMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6371000;

  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusMeters * c);
}

export function classifyWalkDistance(distanceMeters: number): WalkDistanceInfo {
  const walkMinutes = Math.max(1, Math.round(distanceMeters / WALKING_METERS_PER_MINUTE));

  if (distanceMeters <= 400) {
    return {
      distanceMeters,
      walkMinutes,
      bucket: "walk_5",
      bucketLabel: "도보 5분",
    };
  }

  if (distanceMeters <= 800) {
    return {
      distanceMeters,
      walkMinutes,
      bucket: "walk_10",
      bucketLabel: "도보 10분",
    };
  }

  if (distanceMeters <= 1600) {
    return {
      distanceMeters,
      walkMinutes,
      bucket: "walk_15_20",
      bucketLabel: "도보 15~20분",
    };
  }

  return {
    distanceMeters,
    walkMinutes,
    bucket: "walk_far",
    bucketLabel: "도보 20분+",
  };
}
