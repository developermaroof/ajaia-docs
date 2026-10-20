import { createDocument, listDocumentsForUser } from "@/lib/documents";
import { invalidRequest, readJsonBody, serverError, unauthorized } from "@/lib/http";
import { getCurrentUser } from "@/lib/session";
import { createDocumentSchema, validate } from "@/lib/validation";

// GET /api/documents → { owned, shared }
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    return Response.json(await listDocumentsForUser(user.id));
  } catch (error) {
    return serverError(error, "GET /api/documents");
  }
}

// POST /api/documents { title? } → 201 { document }, titled "Untitled document" by default
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const body = await readJsonBody(request, { maxBytes: 16 * 1024, optional: true });
    if (!body.ok) return body.response;
    const parsed = validate(createDocumentSchema, body.body);
    if (!parsed.ok) return invalidRequest(parsed);

    const document = await createDocument(user.id, parsed.data.title);
    return Response.json({ document }, { status: 201 });
  } catch (error) {
    return serverError(error, "POST /api/documents");
  }
}
