// File import: turns an uploaded .txt / .md / .docx into editor-safe HTML.
// Pure functions (no I/O, no server-only) so they can be unit tested; the route handler
// in app/api/import/route.ts does the request parsing and the database write.
import mammoth from "mammoth";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
  IMPORT_EXTENSIONS,
  MAX_CONTENT_BYTES,
  MAX_IMPORT_BYTES,
  MAX_TITLE_LENGTH,
  utf8ByteLength,
} from "./limits";

export const IMPORT_FALLBACK_TITLE = "Imported document";

export type ImportKind = "txt" | "md" | "docx";

export class ImportError extends Error {
  constructor(
    readonly status: 400 | 413 | 415 | 422,
    message: string,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export function getImportKind(fileName: string): ImportKind | null {
  const match = /\.([^./\\]+)$/.exec(fileName.trim());
  switch (match?.[1].toLowerCase()) {
    case "txt":
      return "txt";
    case "md":
      return "md";
    case "docx":
      return "docx";
    default:
      return null;
  }
}

// "Q3 plan.final.docx" → "Q3 plan.final"; only the last extension is removed.
export function titleFromFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  const title = base
    .replace(/\.[^.]*$/, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TITLE_LENGTH)
    .trim();
  return title || IMPORT_FALLBACK_TITLE;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Blank lines separate paragraphs; a single line break inside one becomes <br>.
export function textToHtml(text: string): string {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n[^\S\n]*\n\s*/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "")
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Only what the editor (TipTap StarterKit) can represent. Everything else — script, style,
// iframes, images, event-handler attributes, javascript: links — is dropped; the text of
// unknown tags is kept.
const ALLOWED_TAGS = [
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "del",
  "code",
  "pre",
  "blockquote",
  "hr",
  "a",
];

export function sanitizeImportedHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href"], ol: ["start"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    // Drop these with their contents instead of leaving the script text behind.
    nonTextTags: ["script", "style", "textarea", "option", "noscript"],
    disallowedTagsMode: "discard",
  });
}

export function markdownToHtml(markdown: string): string {
  return sanitizeImportedHtml(marked.parse(markdown.replace(/^﻿/, ""), { async: false }));
}

export async function docxToHtml(bytes: Uint8Array): Promise<string> {
  try {
    const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
    return sanitizeImportedHtml(value);
  } catch {
    throw new ImportError(
      422,
      "Couldn’t read this .docx file. It may be corrupted or not a real Word document.",
    );
  }
}

export type ImportedDocument = { title: string; html: string };

// Validates an uploaded file and converts it. Throws ImportError with the HTTP status to answer with.
export async function convertImport(file: {
  name: string;
  bytes: Uint8Array;
}): Promise<ImportedDocument> {
  const kind = getImportKind(file.name);
  if (!kind) {
    throw new ImportError(
      415,
      `Unsupported file type. Upload a ${IMPORT_EXTENSIONS.join(", ")} file.`,
    );
  }
  if (file.bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new ImportError(413, "File is too large. The limit is 2 MB.");
  }
  if (file.bytes.byteLength === 0) {
    throw new ImportError(400, "The file is empty.");
  }

  let html: string;
  if (kind === "docx") {
    html = await docxToHtml(file.bytes);
  } else {
    const text = new TextDecoder("utf-8").decode(file.bytes);
    html = kind === "txt" ? textToHtml(text) : markdownToHtml(text);
  }

  if (html.trim() === "") {
    throw new ImportError(400, "The file has no text to import.");
  }
  if (utf8ByteLength(html) > MAX_CONTENT_BYTES) {
    throw new ImportError(413, "The converted document is larger than the 1 MB document limit.");
  }
  return { title: titleFromFileName(file.name), html };
}
