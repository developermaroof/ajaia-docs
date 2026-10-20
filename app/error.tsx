"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto mt-24 flex w-full max-w-md flex-1 flex-col items-start gap-3 px-6">
      <h1 className="font-serif text-2xl font-semibold text-ink">Something went wrong</h1>
      <p className="text-ink-muted">
        This page couldn’t load. Your documents are safe. Try again, and if it keeps failing, check
        that the database settings in <code className="font-mono text-sm">.env.local</code> are correct.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Try again
      </button>
    </main>
  );
}
