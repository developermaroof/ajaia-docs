// Loading state for the editor page. Plain (not "use client") so the server page can use it
// as its Suspense fallback and the client editor can reuse it while the document loads.
export function EditorSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading document">
      <div className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-3 py-3.5 sm:px-6">
          <div className="size-9 shrink-0" />
          <div className="h-7 w-64 max-w-full rounded bg-rule/70 motion-safe:animate-pulse" />
        </div>
        <div className="mx-auto flex w-full max-w-4xl justify-center px-3 pb-2 sm:px-6">
          <div className="h-10 w-[22rem] max-w-full rounded-lg border border-rule bg-paper" />
        </div>
      </div>
      <div className="px-3 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto min-h-[70vh] w-full max-w-[816px] space-y-4 bg-paper px-6 py-10 sm:px-[72px] sm:py-16">
          <div className="h-4 w-3/4 rounded bg-desk motion-safe:animate-pulse" />
          <div className="h-4 w-full rounded bg-desk motion-safe:animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-desk motion-safe:animate-pulse" />
        </div>
      </div>
    </div>
  );
}
