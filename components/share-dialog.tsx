"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, errorMessage, goToLogin, isUnauthorized } from "@/lib/api-client";
import type { ShareEntry, ShareResponse, ShareRole } from "@/lib/types";
import { Avatar } from "./avatar";

const fieldClass =
  "rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40";

// Owner-only dialog. The server re-checks ownership on every request; this just hides the UI.
export function ShareDialog({
  documentId,
  ownerName,
  shares,
  onSharesChange,
  onClose,
}: {
  documentId: string;
  ownerName: string;
  shares: ShareEntry[];
  onSharesChange: (shares: ShareEntry[]) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [busy, setBusy] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function handleFailure(failure: unknown, action: string) {
    if (isUnauthorized(failure)) return goToLogin();
    setError(`Couldn’t ${action}. ${errorMessage(failure)}`);
  }

  // Applies a new or updated share to the list, keeping everyone else's order.
  function upsert(share: ShareEntry) {
    const exists = shares.some((item) => item.userId === share.userId);
    onSharesChange(
      exists
        ? shares.map((item) => (item.userId === share.userId ? share : item))
        : [...shares, share],
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { share } = await apiFetch<ShareResponse>(`/api/documents/${documentId}/share`, {
        method: "POST",
        json: { email, role },
      });
      upsert(share);
      setEmail("");
    } catch (failure) {
      handleFailure(failure, "share the document");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(entry: ShareEntry, newRole: ShareRole) {
    setPendingUserId(entry.userId);
    setError(null);
    try {
      const { share } = await apiFetch<ShareResponse>(`/api/documents/${documentId}/share`, {
        method: "POST",
        json: { email: entry.email, role: newRole },
      });
      upsert(share);
    } catch (failure) {
      handleFailure(failure, `change ${entry.name}’s access`);
    } finally {
      setPendingUserId(null);
    }
  }

  async function remove(entry: ShareEntry) {
    setPendingUserId(entry.userId);
    setError(null);
    try {
      await apiFetch(`/api/documents/${documentId}/share/${entry.userId}`, { method: "DELETE" });
      onSharesChange(shares.filter((item) => item.userId !== entry.userId));
    } catch (failure) {
      handleFailure(failure, `remove ${entry.name}`);
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      aria-labelledby="share-title"
      className="m-auto w-[calc(100%-1.5rem)] max-w-md rounded-xl border border-rule bg-paper p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="share-title" className="font-serif text-xl font-semibold">
            Share document
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="-m-1 rounded-md px-2 py-1 text-ink-muted hover:bg-desk hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="share-email">
            Email address
          </label>
          <input
            id="share-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="bob@demo.test"
            autoComplete="off"
            className={`${fieldClass} min-w-0 flex-1 basis-48`}
          />
          <label className="sr-only" htmlFor="share-role">
            Role
          </label>
          <select
            id="share-role"
            value={role}
            onChange={(event) => setRole(event.target.value as ShareRole)}
            className={fieldClass}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
          >
            {busy ? "Sharing…" : "Share"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          People with access
        </h3>
        <ul className="mt-2 divide-y divide-rule">
          <li className="flex items-center gap-3 py-2.5">
            <Avatar name={ownerName} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm">{ownerName} (you)</span>
            <span className="text-xs text-ink-muted">Owner</span>
          </li>
          {shares.map((entry) => {
            const pending = pendingUserId === entry.userId;
            return (
              <li key={entry.userId} className="flex items-center gap-3 py-2.5">
                <Avatar name={entry.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{entry.name}</span>
                  <span className="block truncate text-xs text-ink-muted">{entry.email}</span>
                </span>
                <select
                  value={entry.role}
                  disabled={pending}
                  onChange={(event) => changeRole(entry, event.target.value as ShareRole)}
                  aria-label={`Role for ${entry.name}`}
                  className={`${fieldClass} py-1 text-xs`}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="button"
                  onClick={() => remove(entry)}
                  disabled={pending}
                  aria-label={`Remove ${entry.name}`}
                  className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
        {shares.length === 0 && (
          <p className="mt-1 text-sm text-ink-muted">Only you can see this document so far.</p>
        )}
      </div>
    </dialog>
  );
}
