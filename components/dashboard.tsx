"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage, goToLogin, isUnauthorized } from "@/lib/api-client";
import { IMPORT_EXTENSIONS, IMPORT_HINT, MAX_IMPORT_BYTES } from "@/lib/limits";
import type {
  DocumentListResponse,
  DocumentSummary,
  SavedDocumentResponse,
  SharedDocumentSummary,
} from "@/lib/types";
import { DocumentIcon, PlusIcon } from "./icons";
import { LocalTime } from "./local-time";
import { RoleBadge } from "./role-badge";

export function Dashboard({
  initialDocuments,
  initialShared,
}: {
  initialDocuments: DocumentSummary[];
  initialShared: SharedDocumentSummary[];
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [shared, setShared] = useState(initialShared);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstRun = useRef(true);

  // Next.js keeps this page mounted (hidden) while you edit a document, and re-runs
  // effects when you come back, so refetch then to pick up renames and new edits.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const controller = new AbortController();
    apiFetch<DocumentListResponse>("/api/documents", { signal: controller.signal })
      .then((list) => {
        setDocuments(list.owned);
        setShared(list.shared);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        if (isUnauthorized(failure)) goToLogin();
        // Otherwise keep showing the list we already have.
      });
    return () => {
      controller.abort();
      setConfirmingId(null);
      setCreating(false);
      setImporting(false);
    };
  }, []);

  async function createDocument() {
    setCreating(true);
    setError(null);
    try {
      const { document } = await apiFetch<SavedDocumentResponse>("/api/documents", {
        method: "POST",
        json: {},
      });
      // Stays in the "creating" state until the editor replaces this page (see the effect cleanup).
      router.push(`/documents/${document.id}`);
    } catch (failure) {
      if (isUnauthorized(failure)) return goToLogin();
      setError(`Couldn’t create the document. ${errorMessage(failure)}`);
      setCreating(false);
    }
  }

  async function importFile(file: File) {
    setError(null);
    // The server checks these too; checking here just avoids uploading a file that will be refused.
    if (!IMPORT_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension))) {
      return setError(`Couldn’t import “${file.name}”. Unsupported file type. ${IMPORT_HINT}.`);
    }
    if (file.size > MAX_IMPORT_BYTES) {
      return setError(`Couldn’t import “${file.name}”. File is too large. The limit is 2 MB.`);
    }

    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { id } = await apiFetch<{ id: string }>("/api/import", { method: "POST", form });
      // Stays in the "importing" state until the editor replaces this page (see the effect cleanup).
      router.push(`/documents/${id}`);
    } catch (failure) {
      if (isUnauthorized(failure)) return goToLogin();
      setError(`Couldn’t import “${file.name}”. ${errorMessage(failure)}`);
      setImporting(false);
    }
  }

  async function deleteDocument(document: DocumentSummary) {
    setDeletingId(document.id);
    setError(null);
    try {
      await apiFetch(`/api/documents/${document.id}`, { method: "DELETE" });
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setConfirmingId(null);
    } catch (failure) {
      if (isUnauthorized(failure)) return goToLogin();
      setError(`Couldn’t delete “${document.title}”. ${errorMessage(failure)}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-12">
    <section aria-labelledby="my-documents">
      <div className="flex items-center justify-between gap-4">
        <h1 id="my-documents" className="font-serif text-2xl font-semibold text-ink">
          My documents
        </h1>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={IMPORT_EXTENSIONS.join(",")}
              className="hidden"
              tabIndex={-1}
              aria-label="Import file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = ""; // lets the same file be picked again after a failure
                if (file) void importFile(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={importing || creating}
              className="inline-flex items-center rounded-md border border-rule bg-paper px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {importing ? "Importing…" : "Import file"}
            </button>
            <button
              type="button"
              onClick={createDocument}
              disabled={creating || importing}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              <PlusIcon width={16} height={16} />
              {creating ? "Creating…" : "New document"}
            </button>
          </div>
          <p className="text-xs text-ink-muted">{IMPORT_HINT}</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-rule bg-paper px-6 py-14 text-center">
          <DocumentIcon width={28} height={28} className="text-ink-muted" />
          <p className="font-serif text-lg text-ink">No documents yet</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Create your first document and start writing. Changes save automatically.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-paper">
          {documents.map((document) => {
            const confirming = confirmingId === document.id;
            const deleting = deletingId === document.id;
            return (
              <li key={document.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <DocumentIcon width={20} height={20} className="shrink-0 text-ink-muted" />
                <Link
                  href={`/documents/${document.id}`}
                  className="min-w-0 flex-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="block truncate font-serif text-base text-ink hover:text-accent">
                    {document.title}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    Updated <LocalTime iso={document.updatedAt} />
                  </span>
                </Link>
                {confirming ? (
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    <span className="hidden text-ink-muted sm:inline">Delete this document?</span>
                    <button
                      type="button"
                      onClick={() => deleteDocument(document)}
                      disabled={deleting}
                      className="rounded-md bg-danger px-2.5 py-1 font-medium text-white hover:bg-danger/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
                    >
                      {deleting ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={deleting}
                      className="rounded-md px-2 py-1 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(document.id)}
                    aria-label={`Delete ${document.title}`}
                    className="shrink-0 rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>

    <section aria-labelledby="shared-documents">
      <h2 id="shared-documents" className="font-serif text-2xl font-semibold text-ink">
        Shared with me
      </h2>
      {shared.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-rule bg-paper px-6 py-10 text-center">
          <p className="font-serif text-lg text-ink">Nothing shared with you yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
            Documents other people share with you will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-paper">
          {shared.map((document) => (
            <li key={document.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <DocumentIcon width={20} height={20} className="shrink-0 text-ink-muted" />
              <Link
                href={`/documents/${document.id}`}
                className="min-w-0 flex-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="block truncate font-serif text-base text-ink hover:text-accent">
                  {document.title}
                </span>
                <span className="block text-xs text-ink-muted">
                  Shared by {document.ownerName} · Updated <LocalTime iso={document.updatedAt} />
                </span>
              </Link>
              <RoleBadge role={document.role} />
            </li>
          ))}
        </ul>
      )}
    </section>
    </div>
  );
}
