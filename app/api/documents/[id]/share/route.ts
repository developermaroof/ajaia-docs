import { getDocumentAccess, shareDocument } from "@/lib/documents";
import {
  documentNotFound,
  invalidRequest,
  jsonError,
  readJsonBody,
  serverError,
  unauthorized,
} from "@/lib/http";
import { authorize } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { idSchema, shareSchema, validate } from "@/lib/validation";

// POST /api/documents/:id/share { email, role } → owner only
//   201 { share, created: true }   newly shared
//   200 { share, created: false }  already shared: the role was updated
export async function POST(request: Request, context: RouteContext<"/api/documents/[id]/share">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const parsedId = idSchema.safeParse((await context.params).id);
    if (!parsedId.success) return documentNotFound();
    const id = parsedId.data;

    const decision = authorize(await getDocumentAccess(id, user.id), "share");
    if (decision === "not_found") return documentNotFound();
    if (decision === "forbidden") {
      return jsonError(403, "Only the owner can share this document.");
    }

    const body = await readJsonBody(request, { maxBytes: 16 * 1024 });
    if (!body.ok) return body.response;
    const parsed = validate(shareSchema, body.body);
    if (!parsed.ok) return invalidRequest(parsed);

    const result = await shareDocument(id, user.id, parsed.data.email, parsed.data.role);
    switch (result.type) {
      case "unknown_email":
        return jsonError(404, "No user with that email. Try one of the demo users.");
      case "is_owner":
        return jsonError(400, "You already own this document, so you can't share it with yourself.");
      case "shared":
        return Response.json(
          { share: result.share, created: result.created },
          { status: result.created ? 201 : 200 },
        );
    }
  } catch (error) {
    return serverError(error, "POST /api/documents/[id]/share");
  }
}
