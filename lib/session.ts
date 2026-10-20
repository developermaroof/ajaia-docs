import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { SESSION_COOKIE } from "./session-cookie";
import { findUserById, type User } from "./users";
import { idSchema } from "./validation";

// Mocked auth: the httpOnly `uid` cookie holds a user id. Every server entry point
// (pages and route handlers) re-validates it against the users table.
// `cache` dedupes the lookup within one server render.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const uid = (await cookies()).get(SESSION_COOKIE)?.value;
  const parsed = idSchema.safeParse(uid);
  if (!parsed.success) return null;
  return findUserById(parsed.data);
});
