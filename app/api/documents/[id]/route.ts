import {
  deleteDocument,
  getDocumentAccess,
  getDocumentForUser,
  renameDocument,
  saveDocumentContent,
} from "@/lib/documents";
import {
  documentNotFound,
  invalidRequest,
  jsonError,
  readJsonBody,
  serverError,
  unauthorized,
} from "@/lib/http";
import { MAX_CONTENT_BYTES } from "@/lib/limits";
import { authorize } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { idSchema, parseDocumentPatch } from "@/lib/validation";

type Context = RouteContext<"/api/documents/[id]">;

// Ids that aren't UUIDs can't exist, so they get the same 404 as a missing document.
async function documentId(context: Context): Promise<string | null> {
  const parsed = idSchema.safeParse((await context.params).id);
  return parsed.success ? parsed.data : null;
}

// GET /api/documents/:id → { document, access, shares? }
export async function GET(_request: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const id = await documentId(context);
    if (!id) return documentNotFound();

    const result = await getDocumentForUser(id, user.id);
    if (!result) return documentNotFound();
    return Response.json(result);
  } catch (error) {
    return serverError(error, "GET /api/documents/[id]");
  }
}

// PATCH /api/documents/:id
//   { title }                     → rename (no version check)
//   { content, expectedVersion }  → save content only if the version still matches, else 409
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const id = await documentId(context);
    if (!id) return documentNotFound();

    const decision = authorize(await getDocumentAccess(id, user.id), "edit");
    if (decision === "not_found") return documentNotFound();
    if (decision === "forbidden") {
      return jsonError(403, "You have view access to this document, so you can't change it.");
    }

    // JSON escaping can roughly double HTML, so allow headroom here; the 1 MB limit
    // itself is enforced precisely on the parsed content.
    const body = await readJsonBody(request, { maxBytes: MAX_CONTENT_BYTES * 2.5 });
    if (!body.ok) return body.response;
    const patch = parseDocumentPatch(body.body);
    if (!patch.ok) return invalidRequest(patch);

    if (patch.data.kind === "title") {
      const document = await renameDocument(id, patch.data.title);
      return document ? Response.json({ document }) : documentNotFound();
    }

    const result = await saveDocumentContent(id, patch.data.content, patch.data.expectedVersion);
    switch (result.type) {
      case "saved":
        return Response.json({ document: result.document });
      case "missing":
        return documentNotFound();
      case "conflict":
        return jsonError(
          409,
          "This document was changed elsewhere. Reload to see the latest version.",
          { currentVersion: result.currentVersion },
        );
    }
  } catch (error) {
    return serverError(error, "PATCH /api/documents/[id]");
  }
}

// DELETE /api/documents/:id → owner only
export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const id = await documentId(context);
    if (!id) return documentNotFound();

    const decision = authorize(await getDocumentAccess(id, user.id), "delete");
    if (decision === "not_found") return documentNotFound();
    if (decision === "forbidden") {
      return jsonError(403, "Only the owner can delete this document.");
    }

    return (await deleteDocument(id))
      ? Response.json({ id, deleted: true })
      : documentNotFound();
  } catch (error) {
    return serverError(error, "DELETE /api/documents/[id]");
  }
}
