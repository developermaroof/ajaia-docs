import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { invalidRequest, jsonError, readJsonBody, serverError } from "@/lib/http";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session-cookie";
import { findUserById } from "@/lib/users";
import { loginSchema, validate } from "@/lib/validation";

// POST /api/session { userId } → mocked login: sets the httpOnly `uid` cookie.
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request, { maxBytes: 4 * 1024 });
    if (!body.ok) return body.response;
    const parsed = validate(loginSchema, body.body);
    if (!parsed.ok) return invalidRequest(parsed);

    const user = await findUserById(parsed.data.userId);
    if (!user) return jsonError(400, "That user doesn't exist. Pick one from the list.");

    const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol;
    (await cookies()).set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: protocol.startsWith("https"),
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return Response.json({ user });
  } catch (error) {
    return serverError(error, "POST /api/session");
  }
}

// DELETE /api/session → log out ("Switch user").
export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
