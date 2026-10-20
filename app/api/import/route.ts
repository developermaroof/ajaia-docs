import { createDocument } from "@/lib/documents";
import { jsonError, serverError, unauthorized } from "@/lib/http";
import { convertImport, ImportError } from "@/lib/import";
import { MAX_IMPORT_BYTES } from "@/lib/limits";
import { getCurrentUser } from "@/lib/session";

// Multipart framing adds a little on top of the file itself.
const MAX_BODY_BYTES = MAX_IMPORT_BYTES + 64 * 1024;

class UploadTooLargeError extends Error {}

// Reads at most MAX_BODY_BYTES so an oversized upload is rejected without buffering all of it.
async function readUpload(request: Request): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new UploadTooLargeError();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

// POST /api/import (multipart, field "file") → 201 { id }
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const tooLarge = () => jsonError(413, "File is too large. The limit is 2 MB.");
    if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return tooLarge();

    const contentType = request.headers.get("content-type") ?? "";
    if (!/^multipart\/form-data\b/i.test(contentType)) {
      return jsonError(400, "Send the file as multipart/form-data in a field named “file”.");
    }

    let form: FormData;
    try {
      const body = await readUpload(request);
      form = await new Response(body as BodyInit, { headers: { "content-type": contentType } }).formData();
    } catch (error) {
      if (error instanceof UploadTooLargeError) return tooLarge();
      return jsonError(400, "Could not read the upload. Send the file as multipart/form-data.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError(400, "No file uploaded. Send the file in a field named “file”.");
    }

    const { title, html } = await convertImport({
      name: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    const document = await createDocument(user.id, title, html);
    return Response.json({ id: document.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ImportError) return jsonError(error.status, error.message);
    return serverError(error, "POST /api/import");
  }
}
