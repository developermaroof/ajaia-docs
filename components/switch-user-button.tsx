"use client";

import { useState } from "react";

export function SwitchUserButton() {
  const [busy, setBusy] = useState(false);

  async function switchUser() {
    setBusy(true);
    try {
      await fetch("/api/session", { method: "DELETE" });
    } finally {
      // A full page load (not router.push) so no state from this user survives in the client,
      // as the Next.js docs recommend for logout.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={switchUser}
      disabled={busy}
      className="rounded-md border border-rule px-2.5 py-1 text-sm text-ink hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
    >
      Switch user
    </button>
  );
}
