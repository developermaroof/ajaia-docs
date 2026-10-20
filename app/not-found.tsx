import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto mt-24 flex w-full max-w-md flex-1 flex-col items-start gap-3 px-6">
      <h1 className="font-serif text-2xl font-semibold text-ink">Page not found</h1>
      <p className="text-ink-muted">
        This document or page doesn’t exist, or you don’t have access to it.
      </p>
      <Link
        href="/"
        className="rounded-md border border-rule bg-paper px-3.5 py-2 text-sm font-medium text-ink hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to documents
      </Link>
    </main>
  );
}
