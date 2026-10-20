// Pure access rules: no I/O, so they can be unit tested and reused on the client
// for hiding buttons. The server always re-checks with these same functions.
import type { ShareRole } from "./database.types";

export type Access = "owner" | ShareRole;

export type DocumentOwnership = { owner_id: string };
export type DocumentShare = { user_id: string; role: ShareRole };

// viewer < editor < owner
export function getAccess(
  doc: DocumentOwnership,
  shares: readonly DocumentShare[],
  userId: string,
): Access | null {
  if (doc.owner_id === userId) return "owner";
  let access: Access | null = null;
  for (const share of shares) {
    if (share.user_id !== userId) continue;
    if (share.role === "editor") return "editor";
    if (share.role === "viewer") access = "viewer";
  }
  return access;
}

export function canView(access: Access | null): boolean {
  return access !== null;
}

export function canEdit(access: Access | null): boolean {
  return access === "owner" || access === "editor";
}

export function canShare(access: Access | null): boolean {
  return access === "owner";
}

export function canDelete(access: Access | null): boolean {
  return access === "owner";
}

export type DocumentAction = "view" | "edit" | "share" | "delete";

const allows: Record<DocumentAction, (access: Access | null) => boolean> = {
  view: canView,
  edit: canEdit,
  share: canShare,
  delete: canDelete,
};

// No access at all → "not_found" (never reveal that the document exists).
// Some access, but not enough for this action → "forbidden".
export function authorize(
  access: Access | null,
  action: DocumentAction,
): "allowed" | "not_found" | "forbidden" {
  if (!canView(access)) return "not_found";
  return allows[action](access) ? "allowed" : "forbidden";
}
