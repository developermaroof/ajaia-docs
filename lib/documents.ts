import "server-only";

import type { ShareRole } from "./database.types";
import { DEFAULT_TITLE } from "./limits";
import { getAccess, type Access } from "./permissions";
import { DatabaseError, getSupabase } from "./supabase";
import type {
  DocumentListResponse,
  DocumentResponse,
  SavedDocument,
  ShareEntry,
  SharedDocumentSummary,
} from "./types";

// Data access for documents. Callers must authorize first (see lib/permissions.ts).
//
// Embeds of `users` name the foreign key column (`users!owner_id`, `users!user_id`):
// documents → users is ambiguous to PostgREST (the owner_id FK, or many-to-many through
// document_shares), and an unqualified `users(...)` fails with "more than one relationship".

type SavedRow = { id: string; title: string; version: number; updated_at: string };

function toSaved(row: SavedRow): SavedDocument {
  return { id: row.id, title: row.title, version: row.version, updatedAt: row.updated_at };
}

const SAVED_COLUMNS = "id, title, version, updated_at";

export async function listDocumentsForUser(userId: string): Promise<DocumentListResponse> {
  const db = getSupabase();
  const [owned, shared] = await Promise.all([
    db
      .from("documents")
      .select("id, title, created_at, updated_at")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false }),
    db
      .from("document_shares")
      .select("role, document:documents(id, title, created_at, updated_at, owner:users!owner_id(name))")
      .eq("user_id", userId),
  ]);
  if (owned.error) throw new DatabaseError("list your documents", owned.error);
  if (shared.error) throw new DatabaseError("list documents shared with you", shared.error);

  const sharedDocs: SharedDocumentSummary[] = [];
  for (const share of shared.data) {
    const doc = share.document;
    if (!doc) continue;
    sharedDocs.push({
      id: doc.id,
      title: doc.title,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      ownerName: doc.owner?.name ?? "Unknown",
      role: share.role,
    });
  }
  sharedDocs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    owned: owned.data.map((doc) => ({
      id: doc.id,
      title: doc.title,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    })),
    shared: sharedDocs,
  };
}

// The caller's access to a document, or null if it doesn't exist or they have none.
export async function getDocumentAccess(id: string, userId: string): Promise<Access | null> {
  const db = getSupabase();
  const [doc, shares] = await Promise.all([
    db.from("documents").select("owner_id").eq("id", id).maybeSingle(),
    db.from("document_shares").select("user_id, role").eq("document_id", id),
  ]);
  if (doc.error) throw new DatabaseError("load the document", doc.error);
  if (shares.error) throw new DatabaseError("load the document's sharing", shares.error);
  if (!doc.data) return null;
  return getAccess(doc.data, shares.data, userId);
}

// Full document for the editor, or null when it doesn't exist or the user has no access.
export async function getDocumentForUser(
  id: string,
  userId: string,
): Promise<DocumentResponse | null> {
  const db = getSupabase();
  const [doc, shares] = await Promise.all([
    db
      .from("documents")
      .select(
        "id, owner_id, title, content, version, created_at, updated_at, owner:users!owner_id(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("document_shares")
      .select("user_id, role, user:users!user_id(name, email)")
      .eq("document_id", id),
  ]);
  if (doc.error) throw new DatabaseError("load the document", doc.error);
  if (shares.error) throw new DatabaseError("load the document's sharing", shares.error);
  if (!doc.data) return null;

  const access = getAccess(doc.data, shares.data, userId);
  if (!access) return null;

  const d = doc.data;
  return {
    document: {
      id: d.id,
      title: d.title,
      content: d.content,
      version: d.version,
      ownerId: d.owner_id,
      ownerName: d.owner?.name ?? "Unknown",
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    },
    access,
    ...(access === "owner" && {
      shares: shares.data.map((share) => ({
        userId: share.user_id,
        name: share.user?.name ?? "Unknown",
        email: share.user?.email ?? "",
        role: share.role,
      })),
    }),
  };
}

export async function createDocument(
  ownerId: string,
  title: string = DEFAULT_TITLE,
): Promise<SavedDocument> {
  const { data, error } = await getSupabase()
    .from("documents")
    .insert({ owner_id: ownerId, title })
    .select(SAVED_COLUMNS)
    .single();
  if (error) throw new DatabaseError("create the document", error);
  return toSaved(data);
}

// Renames never touch `version`, so a rename can't make a concurrent content save look like a conflict.
export async function renameDocument(id: string, title: string): Promise<SavedDocument | null> {
  const { data, error } = await getSupabase()
    .from("documents")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SAVED_COLUMNS)
    .maybeSingle();
  if (error) throw new DatabaseError("rename the document", error);
  return data ? toSaved(data) : null;
}

export type SaveContentResult =
  | { type: "saved"; document: SavedDocument }
  | { type: "conflict"; currentVersion: number }
  | { type: "missing" };

// Optimistic concurrency: the write only applies if the row is still at `expectedVersion`
// (UPDATE ... WHERE id = ? AND version = ?), and it bumps the version in the same statement.
export async function saveDocumentContent(
  id: string,
  content: string,
  expectedVersion: number,
): Promise<SaveContentResult> {
  const db = getSupabase();
  const { data, error } = await db
    .from("documents")
    .update({ content, version: expectedVersion + 1, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("version", expectedVersion)
    .select(SAVED_COLUMNS)
    .maybeSingle();
  if (error) throw new DatabaseError("save the document", error);
  if (data) return { type: "saved", document: toSaved(data) };

  // No row matched: the document is gone, or someone else saved first.
  const current = await db
    .from("documents")
    .select(`${SAVED_COLUMNS}, content`)
    .eq("id", id)
    .maybeSingle();
  if (current.error) throw new DatabaseError("check the document version", current.error);
  if (!current.data) return { type: "missing" };

  // A retried save whose first attempt already landed (e.g. the response was lost)
  // finds its own content stored; that is not a conflict.
  if (current.data.content === content) return { type: "saved", document: toSaved(current.data) };

  return { type: "conflict", currentVersion: current.data.version };
}

export async function deleteDocument(id: string): Promise<boolean> {
  const { error, count } = await getSupabase()
    .from("documents")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new DatabaseError("delete the document", error);
  return (count ?? 0) > 0;
}

export type ShareResult =
  | { type: "shared"; share: ShareEntry; created: boolean }
  | { type: "unknown_email" }
  | { type: "is_owner" };

// Share (or change the role of an existing share) by email. The caller must be the owner.
// Emails are stored as seeded (lowercase); the schema lowercases input to match.
export async function shareDocument(
  documentId: string,
  ownerId: string,
  email: string,
  role: ShareRole,
): Promise<ShareResult> {
  const db = getSupabase();
  const target = await db.from("users").select("id, name, email").eq("email", email).maybeSingle();
  if (target.error) throw new DatabaseError("look up the user", target.error);
  if (!target.data) return { type: "unknown_email" };
  if (target.data.id === ownerId) return { type: "is_owner" };

  const existing = await db
    .from("document_shares")
    .select("user_id")
    .eq("document_id", documentId)
    .eq("user_id", target.data.id)
    .maybeSingle();
  if (existing.error) throw new DatabaseError("check existing sharing", existing.error);

  // Upsert on the primary key so two concurrent requests can't create duplicate rows.
  const { error } = await db
    .from("document_shares")
    .upsert({ document_id: documentId, user_id: target.data.id, role }, { onConflict: "document_id,user_id" });
  if (error) throw new DatabaseError("share the document", error);

  return {
    type: "shared",
    created: !existing.data,
    share: { userId: target.data.id, name: target.data.name, email: target.data.email, role },
  };
}

export async function removeShare(documentId: string, userId: string): Promise<boolean> {
  const { error, count } = await getSupabase()
    .from("document_shares")
    .delete({ count: "exact" })
    .eq("document_id", documentId)
    .eq("user_id", userId);
  if (error) throw new DatabaseError("remove access", error);
  return (count ?? 0) > 0;
}
