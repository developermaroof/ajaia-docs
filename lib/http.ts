import "server-only";

import type { ApiError } from "./types";
import type { ValidationFailure } from "./validation";

export function jsonError(status: number, error: string, extra?: Omit<ApiError, "error">) {
  return Response.json({ error, ...extra } satisfies ApiError, { status });
}

export const unauthorized = () =>
  jsonError(401, "You are not logged in. Choose a user on the login page.");

export const documentNotFound = () => jsonError(404, "Document not found.");

export const invalidRequest = (failure: ValidationFailure) =>
  jsonError(failure.status, failure.error, { details: failure.details });

export function serverError(error: unknown, route: string) {
  console.error(`[api] ${route} failed:`, error);
  return jsonError(500, "Something went wrong on our side. Please try again.");
}

type BodyResult = { ok: true; body: unknown } | { ok: false; response: Response };

class BodyTooLargeError extends Error {}

// Reads at most `maxBytes` so an oversized request is rejected without buffering all of it.
async function readText(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function readJsonBody(
  request: Request,
  { maxBytes, optional = false }: { maxBytes: number; optional?: boolean },
): Promise<BodyResult> {
  const tooLarge = () => jsonError(413, "Request body is too large.");

  if (Number(request.headers.get("content-length")) > maxBytes) {
    return { ok: false, response: tooLarge() };
  }
  let text: string;
  try {
    text = await readText(request, maxBytes);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return { ok: false, response: tooLarge() };
    return { ok: false, response: jsonError(400, "Could not read the request body.") };
  }

  if (text.trim() === "") {
    return optional
      ? { ok: true, body: {} }
      : { ok: false, response: jsonError(400, "Request body is required (JSON).") };
  }
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return { ok: false, response: jsonError(415, "Content-Type must be application/json.") };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError(400, "Request body is not valid JSON.") };
  }
}
