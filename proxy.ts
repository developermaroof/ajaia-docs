import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Optimistic check only: no cookie → straight to /login. Pages and API routes still
// validate the cookie against the database (a stale or forged id is rejected there).
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except /login, API routes (they answer 401 JSON instead), and static files.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)"],
};
