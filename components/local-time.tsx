"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function format(iso: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(
    new Date(iso),
  );
}

// Server HTML is rendered in UTC; the browser swaps in the viewer's own time zone
// right after hydration, without a hydration mismatch.
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribe,
    () => format(iso),
    () => format(iso, "UTC"),
  );
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
