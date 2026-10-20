"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { apiFetch, errorMessage } from "@/lib/api-client";

type Option = { id: string; name: string; email: string };

// Only same-site paths: never follow a `next` that could leave this origin.
function safeNext(next: string | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/";
}

export function UserPicker({ users, next }: { users: Option[]; next?: string }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function logIn(user: Option) {
    setPendingId(user.id);
    setError(null);
    try {
      await apiFetch("/api/session", { method: "POST", json: { userId: user.id } });
      // Full page load so nothing from a previous user lingers in client state.
      window.location.assign(safeNext(next));
    } catch (failure) {
      setError(errorMessage(failure));
      setPendingId(null);
    }
  }

  if (users.length === 0) {
    return (
      <p role="alert" className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-ink">
        No users found. Run db/schema.sql in your Supabase project to create the demo users.
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => logIn(user)}
              disabled={pendingId !== null}
              className="flex w-full items-center gap-3 rounded-xl border border-rule bg-paper px-4 py-3 text-left transition-colors hover:border-accent hover:bg-accent-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              <Avatar name={user.name} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{user.name}</span>
                <span className="block truncate text-sm text-ink-muted">{user.email}</span>
              </span>
              {pendingId === user.id && <span className="text-sm text-ink-muted">Signing in…</span>}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
