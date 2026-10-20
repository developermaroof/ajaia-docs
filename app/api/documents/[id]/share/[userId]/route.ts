import { getDocumentAccess, removeShare } from "@/lib/documents";
import { documentNotFound, jsonError, serverError, unauthorized } from "@/lib/http";
import { authorize } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { idSchema } from "@/lib/validation";

// DELETE /api/documents/:id/share/:userId → owner only
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/documents/[id]/share/[userId]">,
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const params = await context.params;
    const id = idSchema.safeParse(params.id);
    if (!id.success) return documentNotFound();

    const decision = authorize(await getDocumentAccess(id.data, user.id), "share");
    if (decision === "not_found") return documentNotFound();
    if (decision === "forbidden") {
      return jsonError(403, "Only the owner can change who has access.");
    }

    const targetId = idSchema.safeParse(params.userId);
    if (!targetId.success || !(await removeShare(id.data, targetId.data))) {
      return jsonError(404, "That person doesn't have access to this document.");
    }
    return Response.json({ userId: targetId.data, removed: true });
  } catch (error) {
    return serverError(error, "DELETE /api/documents/[id]/share/[userId]");
  }
}
