// Client-side state of one open document: what the server has (version), what the
// editor has (html), and the two independent autosavers. Content saves are
// version-checked; title saves are separate requests so a rename never races a body save.
import { apiFetch, ApiRequestError } from "./api-client";
import { Autosaver, type SaveOutcome } from "./autosave";
import { MAX_CONTENT_BYTES, utf8ByteLength } from "./limits";
import type { DocumentDetail, SavedDocumentResponse } from "./types";

function outcomeFor(error: unknown): SaveOutcome {
  if (!(error instanceof ApiRequestError)) return { type: "retry" }; // network failure
  if (error.status === 409) return { type: "conflict" };
  if (error.status >= 500 || error.status === 408 || error.status === 429) return { type: "retry" };
  return { type: "failed", message: error.message };
}

export class DocumentSession {
  readonly content: Autosaver;
  readonly title: Autosaver;
  private version = 0;
  private html = "";
  private loaded = false;
  // Set when server content replaces the editor's; the next editor created from it
  // records its normalized HTML as the saved baseline.
  private awaitingEditor = false;

  constructor(private readonly documentId: string) {
    this.content = new Autosaver((html) => this.sendContent(html));
    this.title = new Autosaver((title) => this.sendTitle(title));
  }

  get isLoaded(): boolean {
    return this.loaded;
  }

  // HTML a newly created editor should start from: the latest local edits, or the server copy.
  get currentHtml(): string {
    return this.html;
  }

  // Safe to refresh from the server only when nothing local is waiting to be saved.
  canRefresh(): boolean {
    return (
      !this.content.hasUnsavedChanges() &&
      !this.title.hasUnsavedChanges() &&
      this.content.getState().status !== "conflict"
    );
  }

  // True while edits could still be lost by leaving the page.
  hasPendingSaves(): boolean {
    const contentPending =
      this.content.hasUnsavedChanges() && this.content.getState().status !== "conflict";
    return contentPending || this.title.hasUnsavedChanges();
  }

  // Apply a document fetched from the server. Local edits always win over a refresh.
  applyServerDocument(doc: DocumentDetail): { contentReplaced: boolean; titleReplaced: boolean } {
    const first = !this.loaded;
    this.loaded = true;

    const contentReplaced =
      first || (this.canRefresh() && doc.version !== this.version);
    if (contentReplaced) {
      this.version = doc.version;
      this.html = doc.content;
      this.awaitingEditor = true;
    }
    const titleReplaced = first || !this.title.hasUnsavedChanges();
    if (titleReplaced) this.title.reset(doc.title);
    return { contentReplaced, titleReplaced };
  }

  // Called right after an editor is created from currentHtml.
  editorCreated(normalizedHtml: string) {
    if (!this.awaitingEditor) return;
    this.awaitingEditor = false;
    // TipTap normalizes HTML (e.g. "" becomes "<p></p>"). Using its output as the
    // baseline means simply opening a document never triggers a save.
    this.html = normalizedHtml;
    this.content.reset(normalizedHtml);
  }

  contentChanged(html: string) {
    if (this.awaitingEditor) return; // this editor is about to be replaced by the server copy
    this.html = html;
    this.content.update(html);
  }

  titleChanged(raw: string) {
    // An empty title is never sent; leaving the field empty keeps the last saved title.
    this.title.update(raw.trim() || this.title.savedValue);
  }

  private async sendContent(html: string): Promise<SaveOutcome> {
    if (utf8ByteLength(html) > MAX_CONTENT_BYTES) {
      return {
        type: "failed",
        message: "This document is over the 1 MB limit. Remove some content to keep saving.",
      };
    }
    try {
      const { document } = await apiFetch<SavedDocumentResponse>(
        `/api/documents/${this.documentId}`,
        { method: "PATCH", json: { content: html, expectedVersion: this.version } },
      );
      this.version = document.version;
      return { type: "saved" };
    } catch (error) {
      return outcomeFor(error);
    }
  }

  private async sendTitle(title: string): Promise<SaveOutcome> {
    try {
      await apiFetch<SavedDocumentResponse>(`/api/documents/${this.documentId}`, {
        method: "PATCH",
        json: { title },
      });
      return { type: "saved" };
    } catch (error) {
      return outcomeFor(error);
    }
  }
}
