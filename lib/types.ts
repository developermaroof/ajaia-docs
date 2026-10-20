// JSON shapes of the API, shared by route handlers and client components.
import type { ShareRole } from "./database.types";
import type { Access } from "./permissions";

export type { Access, ShareRole };

export type DocumentSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type SharedDocumentSummary = DocumentSummary & {
  ownerName: string;
  role: ShareRole;
};

// GET /api/documents
export type DocumentListResponse = {
  owned: DocumentSummary[];
  shared: SharedDocumentSummary[];
};

export type DocumentDetail = DocumentSummary & {
  ownerId: string;
  ownerName: string;
  content: string;
  version: number;
};

export type ShareEntry = {
  userId: string;
  name: string;
  email: string;
  role: ShareRole;
};

// GET /api/documents/:id  (shares only for the owner)
export type DocumentResponse = {
  document: DocumentDetail;
  access: Access;
  shares?: ShareEntry[];
};

export type SavedDocument = {
  id: string;
  title: string;
  version: number;
  updatedAt: string;
};

// POST /api/documents (201) and PATCH /api/documents/:id
export type SavedDocumentResponse = { document: SavedDocument };

// Every non-2xx response
export type ApiError = {
  error: string;
  details?: { path: string; message: string }[];
  currentVersion?: number;
};
