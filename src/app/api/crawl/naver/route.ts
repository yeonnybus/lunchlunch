import { NextResponse } from "next/server";
import { z } from "zod";

import { assertAllowedRegion, normalizeRegion } from "@/lib/domain/region-policy";
import { getServerEnv } from "@/lib/env";
import { runManualNaverCrawl } from "@/lib/services/crawl-service";
import { createRouteClient } from "@/lib/supabase/route";

const requestSchema = z.object({
  region: z.string().min(2),
  query: z.string().min(2).optional(),
  maxScrolls: z.number().int().min(1).max(100).optional(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const authClient = createRouteClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const env = getServerEnv();
  const token = request.headers.get("x-admin-token");

  if (token !== env.MANUAL_TRIGGER_TOKEN) {
    return unauthorized();
  }

  try {
    const payload = requestSchema.parse(await request.json());
    assertAllowedRegion(payload.region);

    const result = await runManualNaverCrawl({
      ...payload,
      region: normalizeRegion(payload.region),
      triggeredBy: "api_manual",
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
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
