import { z } from "zod";

function parseBoolean(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(normalized);
}

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : undefined;
    }),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  MANUAL_TRIGGER_TOKEN: z.string().min(1),
  WEATHER_LAT: z.coerce.number().default(37.5665),
  WEATHER_LNG: z.coerce.number().default(126.978),
  WORKPLACE_ADDRESS: z.string().default("서울 영등포구 여의대로 66"),
  WORKPLACE_LAT: z.coerce.number().default(37.525167),
  WORKPLACE_LNG: z.coerce.number().default(126.927028),
  ALLOWED_REGION_KEYWORD: z.string().default("여의도동"),
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(200).default(20),
  GEOCODING_ENABLED: z
    .string()
    .optional()
    .transform((value) => parseBoolean(value, true)),
  GEOCODING_TIMEOUT_MS: z.coerce.number().int().min(3000).max(20000).default(8000),
  GEOCODING_MAX_PER_REQUEST: z.coerce.number().int().min(1).max(30).default(12),
  NAVER_CRAWLER_MAX_SCROLLS: z.coerce.number().int().min(1).max(100).default(35),
  NAVER_CRAWLER_HEADLESS: z
    .string()
    .optional()
    .transform((value) => parseBoolean(value, true)),
  NAVER_CRAWLER_TIMEOUT_MS: z.coerce.number().int().min(3000).max(120000).default(20000),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(`Missing public env vars: ${parsed.error.message}`);
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Missing server env vars: ${parsed.error.message}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}
