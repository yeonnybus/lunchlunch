import Link from "next/link";

import { ControlPanel } from "@/components/dashboard/control-panel";

export default function CrawlAdminPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-16 pt-10 md:px-8">
      <section className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/80 p-4">
        <div>
          <h1 className="font-title text-2xl font-semibold tracking-tight">크롤링 관리자</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            여의도동 식당 데이터를 수동 수집하고 상태를 확인하는 운영 전용 화면입니다.
          </p>
        </div>
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          추천 화면으로
        </Link>
      </section>

      <ControlPanel mode="crawl" />
    </main>
  );
}
