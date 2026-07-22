export default function DailyAnalyticsSkeleton() {
  return (
    <div className="space-y-8" aria-busy aria-label="Loading daily analytics">
      <section className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#E8E0D4] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)] sm:px-6 sm:py-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-3 w-28 animate-pulse rounded bg-zinc-100" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-amber-50" />
            </div>
            <div className="mt-5 h-8 w-36 animate-pulse rounded-lg bg-zinc-100" />
            <div className="mt-3 h-3 w-40 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E8E0D4] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_rgba(28,25,23,0.04)]">
        <div className="border-b border-[#EDE7DC] px-5 py-5 sm:px-6">
          <div className="h-4 w-48 animate-pulse rounded bg-zinc-100" />
          <div className="mt-2 h-3 w-36 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="space-y-0 px-5 py-2 sm:px-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-slate-100/80 py-4 last:border-b-0"
            >
              <div className="h-7 w-7 animate-pulse rounded-lg bg-amber-50" />
              <div className="h-3.5 flex-1 animate-pulse rounded bg-zinc-100" />
              <div className="h-3.5 w-12 animate-pulse rounded bg-zinc-100" />
              <div className="h-3.5 w-20 animate-pulse rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
