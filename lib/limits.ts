// Shared by the API (validation) and the client (pre-checks before sending).
export const DEFAULT_TITLE = "Untitled document";
export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_BYTES = 1024 * 1024; // 1 MB of UTF-8

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}
