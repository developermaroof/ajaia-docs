export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading documents">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded bg-rule/70 motion-safe:animate-pulse" />
        <div className="h-9 w-36 rounded-md bg-rule/70 motion-safe:animate-pulse" />
      </div>
      <div className="mt-6 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-paper">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 px-5 py-4">
            <div className="size-5 rounded bg-desk" />
            <div className="space-y-2">
              <div className="h-4 w-56 max-w-full rounded bg-desk motion-safe:animate-pulse" />
              <div className="h-3 w-32 rounded bg-desk motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
