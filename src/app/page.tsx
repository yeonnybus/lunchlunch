import { Flame, Salad, Soup } from "lucide-react";
import Link from "next/link";

import { ControlPanel } from "@/components/dashboard/control-panel";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16 pt-10 md:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-orange-200/60 bg-white/75 p-8 shadow-sm backdrop-blur-md">
        <div className="absolute -right-6 -top-10 h-40 w-40 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute -bottom-10 left-14 h-32 w-32 rounded-full bg-emerald-200/45 blur-3xl" />

        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Next.js 14</Badge>
              <Badge variant="outline">Supabase</Badge>
              <Badge variant="outline">AI Menu Recommender</Badge>
            </div>
            <Link
              href="/admin/crawl"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              관리자 크롤링
            </Link>
          </div>

          <h1 className="font-title text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            LunchLaunch
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
            여의도동 식당을 수동 수집하고, 오늘의 이슈와 사용자 취향을 반영해 메뉴를 추천한 뒤,
            여의대로66 기준 도보 5/10/15~20분 버킷으로 식당을 제안하는 운영형 대시보드입니다.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Soup className="size-4 text-primary" />
              오늘의 컨텍스트 반영
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Salad className="size-4 text-secondary" />
              사용자 취향 반영
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="size-4 text-accent-foreground" />
              메뉴-식당 매칭
            </span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <ControlPanel mode="recommend" />
      </section>
    </main>
  );
}
