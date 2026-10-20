"use client";

import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { apiFetch, ApiRequestError, errorMessage, goToLogin, isUnauthorized } from "@/lib/api-client";
import type { SaveState } from "@/lib/autosave";
import { DocumentSession } from "@/lib/document-session";
import { DEFAULT_TITLE, MAX_TITLE_LENGTH } from "@/lib/limits";
import { canEdit, canShare, type Access } from "@/lib/permissions";
import type { DocumentResponse, ShareEntry } from "@/lib/types";
import { EditorSkeleton } from "./editor-skeleton";
import { EditorToolbar } from "./editor-toolbar";
import { ChevronLeftIcon } from "./icons";
import { ShareDialog } from "./share-dialog";

const extensions = [
  StarterKit.configure({
    // TrailingNode inserts a paragraph on the first transaction (even a click) in a
    // document that ends with a heading or list: a save, and a new version, from just viewing.
    trailingNode: false,
    link: { openOnClick: false },
  }),
];

type Phase =
  | { name: "loading" }
  | { name: "ready" }
  | { name: "not-found" }
  | { name: "error"; message: string };

export function DocumentEditor({ documentId }: { documentId: string }) {
  const [session] = useState(() => new DocumentSession(documentId));
  const [phase, setPhase] = useState<Phase>({ name: "loading" });
  const [access, setAccess] = useState<Access | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [sharing, setSharing] = useState(false);
  const [title, setTitle] = useState("");
  // Bumped when server content replaces the editor's, which recreates the editor.
  const [generation, setGeneration] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [attempt, setAttempt] = useState(0);

  const content = useSyncExternalStore(
    session.content.subscribe,
    session.content.getState,
    session.content.getState,
  );
  const titleSave = useSyncExternalStore(
    session.title.subscribe,
    session.title.getState,
    session.title.getState,
  );
  const editable = canEdit(access);
  const conflict = content.status === "conflict";
  const sharable = canShare(access);

  // Load the document, and refresh it each time this page becomes visible again:
  // Next.js keeps visited pages mounted but hidden (React <Activity>) and re-runs
  // their effects when they reappear. Hiding flushes pending edits; showing resumes.
  useEffect(() => {
    const controller = new AbortController();
    const refreshing = session.isLoaded;
    if (!refreshing || session.canRefresh()) {
      apiFetch<DocumentResponse>(`/api/documents/${documentId}`, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted) return;
          const { contentReplaced, titleReplaced } = session.applyServerDocument(data.document);
          setAccess(data.access);
          setOwnerName(data.document.ownerName);
          setShares(data.shares ?? []);
          if (titleReplaced) setTitle(data.document.title);
          if (contentReplaced) setGeneration((g) => g + 1);
          setPhase({ name: "ready" });
        })
        .catch((error: unknown) => {
          // A failed background refresh keeps the copy on screen; the next save reports problems.
          if (controller.signal.aborted || refreshing) return;
          if (isUnauthorized(error)) return goToLogin();
          if (error instanceof ApiRequestError && error.status === 404) {
            return setPhase({ name: "not-found" });
          }
          setPhase({ name: "error", message: errorMessage(error) });
        });
    }
    session.content.resume();
    session.title.resume();
    return () => {
      controller.abort();
      session.content.suspend();
      session.title.suspend();
    };
  }, [documentId, session, attempt]);

  // The editor only exists once the document has loaded, so an empty editor can never
  // be saved over real content.
  const mountEditor = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const instance = new Editor({
        element,
        extensions,
        content: session.currentHtml,
        editable: editable && session.content.getState().status !== "conflict",
        editorProps: {
          attributes: {
            class: "doc-content",
            role: "textbox",
            "aria-multiline": "true",
            "aria-label": "Document text",
          },
        },
        onUpdate: ({ editor: e }) => session.contentChanged(e.getHTML()),
      });
      session.editorCreated(instance.getHTML());
      setEditor(instance);
      return () => {
        instance.destroy();
        setEditor(null);
      };
    },
    [session, editable],
  );

  // After a conflict, stop accepting edits that could never be saved.
  useEffect(() => {
    if (conflict && editor?.isEditable) editor.setEditable(false, false);
  }, [conflict, editor]);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!session.hasPendingSaves()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [session]);

  useEffect(() => {
    if (phase.name === "ready") document.title = `${title.trim() || DEFAULT_TITLE} – Ajaia Docs`;
  }, [phase.name, title]);

  if (phase.name === "loading") return <EditorSkeleton />;
  if (phase.name === "not-found") {
    return (
      <Notice title="Document not found">
        <p>It may have been deleted, or you don’t have access to it.</p>
        <Link href="/" className={secondaryButton}>
          Back to documents
        </Link>
      </Notice>
    );
  }
  if (phase.name === "error") {
    return (
      <Notice title="Couldn’t open this document">
        <p>{phase.message}</p>
        <button
          type="button"
          className={secondaryButton}
          onClick={() => {
            setPhase({ name: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </button>
      </Notice>
    );
  }

  const failure = [content, titleSave].find((s) => s.status === "failed");

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 border-b border-rule bg-desk/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-3 pt-3 sm:px-6">
          <Link
            href="/"
            aria-label="All documents"
            title="All documents"
            className="grid size-9 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            <ChevronLeftIcon width={20} height={20} />
          </Link>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              session.titleChanged(event.target.value);
            }}
            onBlur={() => {
              if (!title.trim()) setTitle(session.title.savedValue);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                editor?.commands.focus("start");
              }
            }}
            readOnly={!editable}
            maxLength={MAX_TITLE_LENGTH}
            placeholder={DEFAULT_TITLE}
            aria-label="Document title"
            className="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 font-serif text-xl text-ink placeholder:text-ink-muted hover:border-rule focus:border-accent focus:bg-paper focus:outline-none read-only:hover:border-transparent"
          />
          <SaveStatus content={content} title={titleSave} editable={editable} />
          {sharable && (
            <button
              type="button"
              onClick={() => setSharing(true)}
              className="shrink-0 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Share
            </button>
          )}
        </div>
        <div className="mx-auto flex w-full max-w-4xl justify-center px-3 py-2 sm:px-6">
          <EditorToolbar editor={editor} disabled={!editable || conflict} />
        </div>
      </div>

      {!editable && (
        <Banner tone="info">
          <strong className="font-semibold">You have view access</strong>
          {ownerName && <> to this document, shared by {ownerName}</>}. You can read it but not
          change it.
        </Banner>
      )}
      {conflict && (
        <Banner
          tone="danger"
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            >
              Reload
            </button>
          }
        >
          <strong className="font-semibold">
            This document was changed elsewhere. Reload to see the latest version.
          </strong>{" "}
          Edits you made here since then weren’t saved, so copy anything you want to keep first.
        </Banner>
      )}
      {!conflict && failure?.status === "failed" && (
        <Banner tone="danger">
          <strong className="font-semibold">Couldn’t save.</strong> {failure.message}
        </Banner>
      )}

      <div className="px-3 py-6 sm:px-6 sm:py-10">
        <article
          className="mx-auto min-h-[70vh] w-full max-w-[816px] bg-paper px-6 py-10 shadow-[0_1px_2px_rgba(27,36,48,0.08),0_10px_30px_-12px_rgba(27,36,48,0.18)] sm:px-[72px] sm:py-16"
          onMouseDown={(event) => {
            // Clicking the page margin puts the cursor at the end of the text.
            if (event.target === event.currentTarget && editor?.isEditable) {
              event.preventDefault();
              editor.commands.focus("end");
            }
          }}
        >
          <div key={generation} ref={mountEditor} />
        </article>
      </div>
      {sharable && sharing && (
        <ShareDialog
          documentId={documentId}
          ownerName={ownerName}
          shares={shares}
          onSharesChange={setShares}
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}

const secondaryButton =
  "rounded-md border border-rule bg-paper px-3 py-1.5 text-sm font-medium text-ink hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function describe(content: SaveState, title: SaveState): { label: string; tone: string } {
  const states = [content, title];
  if (content.status === "conflict") return { label: "Not saved", tone: "text-danger" };
  if (states.some((s) => s.status === "failed")) return { label: "Couldn't save", tone: "text-danger" };
  if (states.some((s) => s.status === "retrying")) {
    return { label: "Couldn't save – retrying", tone: "text-warn" };
  }
  if (states.some((s) => s.status === "saving")) return { label: "Saving…", tone: "text-ink-muted" };
  return { label: "Saved", tone: "text-ok" };
}

function SaveStatus({
  content,
  title,
  editable,
}: {
  content: SaveState;
  title: SaveState;
  editable: boolean;
}) {
  const { label, tone } = editable
    ? describe(content, title)
    : { label: "View only", tone: "text-ink-muted" };
  return (
    <p role="status" className={`flex shrink-0 items-center gap-1.5 text-sm ${tone}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </p>
  );
}

function Banner({
  tone,
  action,
  children,
}: {
  tone: "danger" | "info";
  action?: ReactNode;
  children: ReactNode;
}) {
  const colors = {
    danger: "border-danger/25 bg-danger-soft",
    info: "border-accent/20 bg-accent-soft",
  }[tone];
  return (
    <div className="px-3 pt-4 sm:px-6">
      <div
        role={tone === "danger" ? "alert" : "status"}
        className={`mx-auto flex max-w-[816px] flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm text-ink ${colors}`}
      >
        <p className="min-w-0 flex-1">{children}</p>
        {action}
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-16 flex w-full max-w-md flex-col items-start gap-3 px-6 text-ink-muted">
      <h1 className="font-serif text-2xl text-ink">{title}</h1>
      {children}
    </div>
  );
}

