"use client";

import type { User } from "@supabase/supabase-js";
import { Loader2, LogOut, MapPinned, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CrawlApiResult = {
  ok: boolean;
  jobId: string;
  collected: number;
  upserted: number;
  warning: string | null;
  query: string;
};

type RecommendApiResult = {
  ok: boolean;
  recommendationId: string;
  context: {
    contextDate: string;
    location: string;
    weatherSummary: string;
    events: string[];
    situations: string[];
  };
  recommendation: {
    menus: string[];
    reasoning: string;
    modelName: string;
    confidence: "low" | "medium" | "high";
  };
  pitches: string[];
  workplace: {
    address: string;
    lat: number;
    lng: number;
  };
  restaurants: Array<{
    rank: number;
    score: number;
    reason: string;
    distanceMeters: number | null;
    walkMinutes: number | null;
    walkBucketLabel: string | null;
    restaurant: {
      name: string;
      category: string | null;
      address: string | null;
      roadAddress: string | null;
      rating: number | null;
      reviewCount: number | null;
      menus: string[];
    };
  }>;
};

interface ErrorResponse {
  error?: string;
}

interface ControlPanelProps {
  mode?: "all" | "recommend" | "crawl";
}

export function ControlPanel({ mode = "all" }: ControlPanelProps) {
  const showCrawl = mode === "all" || mode === "crawl";
  const showRecommend = mode === "all" || mode === "recommend";

  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const [region, setRegion] = useState("서울 영등포구 여의도동");
  const [query, setQuery] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [manualPreferenceNote, setManualPreferenceNote] = useState("");

  const [crawlLoading, setCrawlLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authInitializing, setAuthInitializing] = useState(true);

  const [user, setUser] = useState<User | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlApiResult | null>(null);
  const [recommendResult, setRecommendResult] = useState<RecommendApiResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthInitializing(false);
      setErrorMessage(
        "NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다.",
      );
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        if (mounted) {
          const message =
            error instanceof Error
              ? error.message
              : "세션 확인 중 오류가 발생했습니다. 다시 로그인해주세요.";
          setErrorMessage(message);
        }
      } finally {
        if (mounted) {
          setAuthInitializing(false);
        }
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setAuthInitializing(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const hasRecommendation = useMemo(
    () => Boolean(recommendResult && recommendResult.restaurants.length > 0),
    [recommendResult],
  );

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setAuthLoading(true);

    try {
      if (!supabase) {
        throw new Error("Supabase 설정이 누락되어 로그인할 수 없습니다.");
      }

      const nextPath = window.location.pathname || "/";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error("Google 로그인 URL 생성에 실패했습니다. Provider 설정을 확인해주세요.");
      }

      window.location.assign(data.url);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "로그인 도중 오류가 발생했습니다. Supabase Google Provider 설정을 확인해주세요.";
      setErrorMessage(message);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setErrorMessage(null);
    setAuthLoading(true);

    try {
      if (!supabase) {
        throw new Error("Supabase 설정이 누락되어 로그아웃할 수 없습니다.");
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      setRecommendResult(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "로그아웃 도중 오류가 발생했습니다.";
      setErrorMessage(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCrawl = async () => {
    setErrorMessage(null);
    setCrawlLoading(true);

    try {
      if (!user) {
        throw new Error("로그인 후 실행해주세요.");
      }

      const response = await fetch("/api/crawl/naver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          region,
          query: query.trim() ? query : undefined,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as ErrorResponse;
        throw new Error(error.error ?? "크롤링 실행에 실패했습니다.");
      }

      const json = (await response.json()) as CrawlApiResult;
      setCrawlResult(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : "크롤링 도중 오류가 발생했습니다.";
      setErrorMessage(message);
    } finally {
      setCrawlLoading(false);
    }
  };

  const handleRecommend = async () => {
    setErrorMessage(null);
    setRecommendLoading(true);

    try {
      if (!user) {
        throw new Error("로그인 후 실행해주세요.");
      }

      const response = await fetch("/api/recommend/today", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          region,
          manualPreferenceNote: manualPreferenceNote.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = (await response.json()) as ErrorResponse;
        throw new Error(error.error ?? "추천 생성에 실패했습니다.");
      }

      const json = (await response.json()) as RecommendApiResult;
      setRecommendResult(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : "추천 생성 도중 오류가 발생했습니다.";
      setErrorMessage(message);
    } finally {
      setRecommendLoading(false);
    }
  };

  return (
    <div className={showCrawl && showRecommend ? "grid gap-5 lg:grid-cols-[1.1fr_1fr]" : "grid gap-5"}>
      <Card className="border-border/70 bg-card/95">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">로그인 상태</CardTitle>
          <CardDescription>추천 API는 로그인 사용자만 사용할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {authInitializing ? (
            <p className="text-sm text-muted-foreground">세션 확인 중...</p>
          ) : user ? (
            <div className="space-y-3">
              <Badge variant="secondary">로그인됨: {user.email}</Badge>
              <p className="text-xs leading-5 text-muted-foreground">
                모바일에서도 세션 자동 갱신으로 재로그인을 최소화합니다.
              </p>
              <Button onClick={handleLogout} variant="outline" className="w-full" disabled={authLoading}>
                {authLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 size-4" />
                    로그아웃
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Google 계정으로 간단히 로그인하세요.</p>
              <Button onClick={handleGoogleLogin} className="w-full" disabled={authLoading}>
                {authLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    로그인 이동 중...
                  </>
                ) : (
                  "Google로 로그인"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showCrawl ? (
        <Card className="border-orange-200/60 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="size-5 text-primary" />
              네이버 지도 수동 크롤링
            </CardTitle>
            <CardDescription>
              여의도동 지역 기준 식당 데이터를 수동 수집해 Supabase에 업서트합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="region">지역</Label>
              <Input
                id="region"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="예: 서울 영등포구 여의도동"
              />
              <p className="text-xs text-muted-foreground">현재 서비스는 여의도동 범위만 허용합니다.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="query">검색어 (선택)</Label>
              <Input
                id="query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="비워두면 '지역 + 맛집'"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-token">수동 실행 토큰</Label>
              <Input
                id="admin-token"
                type="password"
                value={adminToken}
                onChange={(event) => setAdminToken(event.target.value)}
                placeholder="MANUAL_TRIGGER_TOKEN"
              />
            </div>

            <Button
              onClick={handleCrawl}
              className="w-full"
              disabled={crawlLoading || !region || !adminToken || !user}
            >
              {crawlLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  크롤링 실행 중...
                </>
              ) : (
                "수동 크롤링 실행"
              )}
            </Button>

            {crawlResult ? (
              <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-sm">
                <p>
                  <strong>Job:</strong> {crawlResult.jobId}
                </p>
                <p>
                  <strong>Query:</strong> {crawlResult.query}
                </p>
                <p>
                  <strong>수집:</strong> {crawlResult.collected}건 / <strong>저장:</strong> {crawlResult.upserted}건
                </p>
                {crawlResult.warning ? <p className="mt-2 text-destructive">주의: {crawlResult.warning}</p> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showRecommend ? (
        <Card
          className={`border-emerald-200/60 bg-card/95 backdrop-blur ${
            showCrawl ? "lg:col-span-2" : ""
          }`}
        >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-secondary" />
            오늘의 메뉴 추천
          </CardTitle>
          <CardDescription>
            날씨/기념일/상황/사용자 취향을 반영하고, 여의대로66 기준 도보 버킷으로 식당을 정렬합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preference-note">추가 취향 메모 (선택)</Label>
            <Textarea
              id="preference-note"
              value={manualPreferenceNote}
              onChange={(event) => setManualPreferenceNote(event.target.value)}
              placeholder="예: 오늘은 국물 음식, 너무 매운 음식은 제외"
            />
          </div>

          <Button onClick={handleRecommend} className="w-full" disabled={recommendLoading || !region || !user}>
            {recommendLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                추천 생성 중...
              </>
            ) : (
              "오늘의 메뉴 추천 생성"
            )}
          </Button>
        </CardContent>
      </Card>
      ) : null}

      {errorMessage ? (
        <Card className={`${showCrawl && showRecommend ? "lg:col-span-2 " : ""}border-destructive/40 bg-destructive/5`}>
          <CardContent className="pt-6 text-sm text-destructive">{errorMessage}</CardContent>
        </Card>
      ) : null}

      {showRecommend && recommendResult ? (
        <Card
          className={`${showCrawl && showRecommend ? "lg:col-span-2 " : ""}border-yellow-200/70 bg-card/95 backdrop-blur`}
        >
          <CardHeader>
            <CardTitle className="font-title text-2xl">추천 결과</CardTitle>
            <CardDescription>
              {recommendResult.context.contextDate} | {recommendResult.context.location} |{" "}
              {recommendResult.context.weatherSummary}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
              {recommendResult.pitches.map((line, idx) => (
                <p key={`${idx}-${line}`} className="text-sm leading-6 text-foreground/90">
                  {line}
                </p>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {recommendResult.recommendation.menus.map((menu) => (
                <Badge key={menu} variant="default" className="text-sm">
                  {menu}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {recommendResult.context.events.map((event) => (
                <Badge key={event} variant="secondary">
                  이벤트: {event}
                </Badge>
              ))}
              {recommendResult.context.situations.map((situation) => (
                <Badge key={situation} variant="outline">
                  상황: {situation}
                </Badge>
              ))}
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              <strong>추천 사유:</strong> {recommendResult.recommendation.reasoning}
            </p>

            {!hasRecommendation ? (
              <p className="text-sm text-muted-foreground">
                매칭된 식당이 없습니다. 먼저
                {" "}
                <Link href="/admin/crawl" className="underline underline-offset-4">
                  관리자 크롤링 화면
                </Link>
                에서 지역 데이터를 채워주세요.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recommendResult.restaurants.map((item) => {
                  const placeQuery = encodeURIComponent(item.restaurant.name);

                  return (
                    <a
                      key={`${item.rank}-${item.restaurant.name}`}
                      className="rounded-lg border border-border/80 bg-background/70 p-4 transition hover:border-primary/50"
                      href={`https://map.naver.com/v5/search/${placeQuery}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">#{item.rank}</p>
                        {item.walkBucketLabel ? (
                          <Badge variant="outline">{item.walkBucketLabel}</Badge>
                        ) : (
                          <Badge variant="outline">거리 정보 없음</Badge>
                        )}
                      </div>
                      <h3 className="mt-2 font-title text-lg">{item.restaurant.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.restaurant.category ?? "카테고리 없음"}
                      </p>
                      <p className="mt-2 text-sm">
                        {item.restaurant.roadAddress ?? item.restaurant.address ?? "주소 없음"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">{item.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        거리: {item.distanceMeters ? `${item.distanceMeters}m` : "확인 중"} / 예상 도보{" "}
                        {item.walkMinutes ? `${item.walkMinutes}분` : "-"}
                      </p>
                    </a>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
