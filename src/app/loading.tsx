import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="min-h-screen bg-gray-50 overflow-x-hidden"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">
        Loading…
      </span>

      <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/70 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-lg" />
                <Skeleton className="h-2.5 w-40 rounded-lg hidden sm:block" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-24 rounded-xl hidden sm:block" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6">
        <section className="pt-14 pb-12 lg:pt-20 lg:pb-20">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left: OAuth preview card */}
            <div className="rounded-3xl border border-gray-200 bg-white/75 backdrop-blur shadow-sm overflow-hidden">
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-40 rounded-lg" />
                  <Skeleton className="h-3 w-36 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full rounded-lg" />
                  <Skeleton className="h-3 w-5/6 rounded-lg" />
                </div>

                <div className="grid gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <Skeleton className="mt-0.5 h-8 w-8 rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/2 rounded-lg" />
                          <Skeleton className="h-3 w-5/6 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 bg-gray-50 px-8 py-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-10 rounded-lg" />
                    <Skeleton className="h-4 w-36 rounded-lg" />
                  </div>
                  <Skeleton className="h-7 w-28 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Right: hero copy + CTAs */}
            <div className="space-y-6">
              <Skeleton className="h-8 w-48 rounded-full" />

              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-12 w-5/6 rounded-2xl" />
              </div>

              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Skeleton className="h-12 w-full sm:w-72 rounded-xl" />
                <Skeleton className="h-12 w-full sm:w-44 rounded-xl" />
              </div>

              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <Skeleton className="h-4 w-5/6 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
