import { config as loadDotenv } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

loadDotenv({ path: ".env.local" });
loadDotenv();

interface CaseResult {
  id: string;
  pass: boolean;
  status: number;
  expectedStatus: number;
  message: string;
}

function readArg(name: string) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function assertObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function requestRecommend(
  baseUrl: string,
  body: Record<string, unknown>,
  cookie?: string,
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": "127.0.0.1",
  };

  if (cookie) {
    headers.cookie = cookie;
  }

  const response = await fetch(`${baseUrl}/api/recommend/today`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    status: response.status,
    data,
    headers: {
      remaining: response.headers.get("x-ratelimit-remaining"),
      reset: response.headers.get("x-ratelimit-reset"),
    },
  };
}

function validateSuccessPayload(data: unknown) {
  if (!assertObject(data)) {
    return "응답이 객체가 아닙니다.";
  }

  if (data.ok !== true) {
    return "ok=true가 아닙니다.";
  }

  if (!Array.isArray(data.restaurants) || data.restaurants.length === 0) {
    return "restaurants가 비어 있습니다.";
  }

  if (!assertObject(data.recommendation) || !Array.isArray(data.recommendation.menus)) {
    return "recommendation.menus 구조가 올바르지 않습니다.";
  }

  return null;
}

async function main() {
  const baseUrl = readArg("base-url") || process.env.RECOMMEND_API_BASE_URL || "http://127.0.0.1:3000";
  const region = readArg("region") || process.env.CRAWL_REGION || "서울 영등포구 여의도동";
  const cookie = readArg("cookie") || process.env.RECOMMEND_API_COOKIE;
  const suite = (readArg("suite") || "smoke").toLowerCase();
  const outPath = readArg("out");

  const results: CaseResult[] = [];

  const unauth = await requestRecommend(baseUrl, { region });
  results.push({
    id: "unauthorized_without_cookie",
    pass: unauth.status === 401,
    status: unauth.status,
    expectedStatus: 401,
    message: unauth.status === 401 ? "ok" : "비로그인 요청이 401이 아닙니다.",
  });

  if (suite === "full") {
    if (!cookie) {
      results.push({
        id: "missing_cookie_for_full_suite",
        pass: false,
        status: 0,
        expectedStatus: 200,
        message: "full 스위트는 --cookie 또는 RECOMMEND_API_COOKIE가 필요합니다.",
      });
    } else {
      const badRegion = await requestRecommend(baseUrl, { region: "서울 강남구" }, cookie);
      results.push({
        id: "invalid_region_with_cookie",
        pass: badRegion.status === 400,
        status: badRegion.status,
        expectedStatus: 400,
        message: badRegion.status === 400 ? "ok" : "지원 지역 검증이 400으로 처리되지 않았습니다.",
      });

      const tooLongNote = await requestRecommend(
        baseUrl,
        { region, manualPreferenceNote: "a".repeat(401) },
        cookie,
      );
      results.push({
        id: "zod_validation_with_cookie",
        pass: tooLongNote.status === 400,
        status: tooLongNote.status,
        expectedStatus: 400,
        message: tooLongNote.status === 400 ? "ok" : "요청 유효성 실패가 400으로 처리되지 않았습니다.",
      });

      const success = await requestRecommend(
        baseUrl,
        { region, manualPreferenceNote: "적당한 가격대의 점심 메뉴" },
        cookie,
      );
      const payloadError = validateSuccessPayload(success.data);
      results.push({
        id: "success_response_with_cookie",
        pass: success.status === 200 && !payloadError,
        status: success.status,
        expectedStatus: 200,
        message:
          success.status !== 200
            ? "인증 요청 성공 케이스가 200이 아닙니다."
            : payloadError ?? "ok",
      });
    }
  }

  const failures = results.filter((item) => !item.pass);
  const report = {
    ok: failures.length === 0,
    suite,
    baseUrl,
    generatedAt: new Date().toISOString(),
    results,
    failures,
  };

  if (outPath) {
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(report, null, 2));

  if (failures.length > 0) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
