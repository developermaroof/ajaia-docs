import "server-only";

import { DatabaseError, getSupabase } from "./supabase";

export type User = { id: string; name: string; email: string };

export async function listUsers(): Promise<User[]> {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, name, email")
    .order("name");
  if (error) throw new DatabaseError("list users", error);
  return data;
}

export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await getSupabase()
    .from("users")
    .select("id, name, email")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new DatabaseError("load the user", error);
  return data;
}
