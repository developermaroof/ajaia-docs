import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | undefined;

// The secret (service role) key bypasses RLS, so this client must only ever run
// on the server. `server-only` turns an accidental client import into a build error.
// Created lazily so a missing env var fails the request that needs it, not the build.
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill them in.",
      );
    }
    client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

// supabase-js returns errors instead of throwing; route handlers turn thrown errors into a 500.
export class DatabaseError extends Error {
  constructor(operation: string, cause: { message: string; code?: string }) {
    super(`Database error while trying to ${operation}: ${cause.message}`, { cause });
    this.name = "DatabaseError";
  }
}
