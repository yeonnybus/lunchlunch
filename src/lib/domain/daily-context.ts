import { getAnniversariesByDate } from "@/lib/data/anniversaries";
import { getServerEnv } from "@/lib/env";
import type { DailyContext } from "@/lib/domain/types";
import type { Json } from "@/lib/supabase/types";

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
}

function getDatePartsInKst(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";

  return {
    date: `${year}-${month}-${day}`,
    mmdd: `${month}-${day}`,
    weekday,
  };
}

function weatherCodeToLabel(code?: number) {
  if (code === undefined) {
    return "기상 정보 없음";
  }

  if (code <= 1) return "맑음";
  if (code <= 3) return "흐림";
  if (code <= 67) return "비";
  if (code <= 77) return "눈";
  if (code <= 99) return "악천후";

  return "일반";
}

function buildSituationsFromWeather(
  weekday: string,
  weather: OpenMeteoResponse["current"],
) {
  const situations: string[] = [];

  const temp = weather?.temperature_2m;
  const precipitation = weather?.precipitation ?? 0;
  const label = weatherCodeToLabel(weather?.weather_code);

  if (weekday === "Sun" || weekday === "Sat") {
    situations.push("주말외식");
  } else {
    situations.push("평일점심");
  }

  if (label === "비" || precipitation > 0) {
    situations.push("비오는날");
  }

  if (temp !== undefined) {
    if (temp <= 5) situations.push("한파");
    if (temp >= 28) situations.push("무더위");
  }

  situations.push(label);

  return Array.from(new Set(situations));
}

async function fetchWeather() {
  const env = getServerEnv();

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(env.WEATHER_LAT));
  url.searchParams.set("longitude", String(env.WEATHER_LNG));
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
  );
  url.searchParams.set("timezone", "Asia/Seoul");

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) {
    throw new Error(`Weather API failed: ${response.status}`);
  }

  return (await response.json()) as OpenMeteoResponse;
}

export async function buildDailyContext(region: string): Promise<DailyContext> {
  const { date, mmdd, weekday } = getDatePartsInKst();

  let weatherRaw: OpenMeteoResponse | null = null;
  try {
    weatherRaw = await fetchWeather();
  } catch {
    weatherRaw = null;
  }

  const current = weatherRaw?.current;
  const weatherSummary = current
    ? `${weatherCodeToLabel(current.weather_code)} / ${current.temperature_2m ?? "-"}°C`
    : "기상 정보 수집 실패";

  const events = getAnniversariesByDate(mmdd);
  const situations = buildSituationsFromWeather(weekday, current);

  return {
    contextDate: date,
    location: region,
    weatherSummary,
    weatherRaw: (weatherRaw as unknown as Json) ?? null,
    events,
    situations,
  };
}
