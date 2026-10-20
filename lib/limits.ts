// Shared by the API (validation) and the client (pre-checks before sending).
export const DEFAULT_TITLE = "Untitled document";
export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_BYTES = 1024 * 1024; // 1 MB of UTF-8

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

// File import (see lib/import.ts), also used by the dashboard to pre-check a chosen file.
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024; // 2 MB
export const IMPORT_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const IMPORT_HINT = "Supported: .txt, .md, .docx up to 2 MB";
