import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAllowedRegion, normalizeRegion } from "@/lib/domain/region-policy";
import { getServerEnv } from "@/lib/env";
import { buildRateLimitKey, checkRateLimit } from "@/lib/security/rate-limit";
import { recommendTodayMenus } from "@/lib/services/recommendation-service";
import { createRouteClient } from "@/lib/supabase/route";

const requestSchema = z.object({
  region: z.string().min(2),
  manualPreferenceNote: z.string().max(400).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
}

export async function POST(request: Request) {
  const authClient = createRouteClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const env = getServerEnv();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? null;
  const rateLimit = checkRateLimit(
    buildRateLimitKey(user.id, ip),
    env.RATE_LIMIT_MAX_REQUESTS,
    env.RATE_LIMIT_WINDOW_SEC * 1000,
  );

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.ceil(rateLimit.resetAt / 1000)),
        },
      },
    );
  }

  try {
    const payload = requestSchema.parse(await request.json());

    assertAllowedRegion(payload.region);
    const normalizedRegion = normalizeRegion(payload.region);

    const result = await recommendTodayMenus({
      ...payload,
      region: normalizedRegion,
      userId: user.id,
    });

    return NextResponse.json(
      { ok: true, ...result },
      {
        headers: {
          "x-ratelimit-remaining": String(rateLimit.remaining),
          "x-ratelimit-reset": String(Math.ceil(rateLimit.resetAt / 1000)),
        },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("지원 지역")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
