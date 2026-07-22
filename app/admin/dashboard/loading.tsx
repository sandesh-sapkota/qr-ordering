import DailyAnalyticsSkeleton from "./DailyAnalyticsSkeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#F7F3EC]">
      <header className="border-b border-[#E8E0D4]/60 bg-[#F7F3EC]/80 px-4 py-6 backdrop-blur-sm sm:px-8">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-zinc-200/70" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-zinc-200/50" />
      </header>

      <main className="mx-auto max-w-5xl space-y-10 p-4 sm:p-8 lg:p-10">
        <DailyAnalyticsSkeleton />

        <div
          className="rounded-2xl border border-[#E8E0D4] bg-white p-6 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)] sm:p-8"
          aria-busy
          aria-label="Loading charts"
        >
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-zinc-100" />
          <div className="mt-6 h-64 animate-pulse rounded-xl bg-[#F7F3EC]" />
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)]"
          aria-busy
          aria-label="Loading completed orders"
        >
          <div className="border-b border-[#EDE7DC] px-6 py-5">
            <div className="h-4 w-52 animate-pulse rounded bg-zinc-100" />
          </div>
          <div className="space-y-0 px-6 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-slate-100/80 py-4 last:border-b-0"
              >
                <div className="h-3.5 w-14 animate-pulse rounded bg-zinc-100" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-zinc-100" />
                <div className="h-3.5 flex-1 animate-pulse rounded bg-zinc-100" />
                <div className="h-3.5 w-16 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
