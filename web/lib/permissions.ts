import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { AppUser } from "@/types/database";

export class PermissionError extends Error {}

/**
 * Resolves the signed-in user's own row. RLS already restricts what this
 * query can return (self / team / admin) — this helper just fetches "me"
 * specifically, which is always allowed by the `users_select` self clause.
 */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  return data as AppUser | null;
}

/** Throws if there's no signed-in, active, role-assigned user. */
export async function requireAppUser(): Promise<AppUser> {
  const user = await getCurrentAppUser();
  if (!user || !user.active || !user.role) {
    throw new PermissionError("Not signed in or not yet provisioned by an admin.");
  }
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireAppUser();
  if (user.role !== "admin") {
    throw new PermissionError("Admin only.");
  }
  return user;
}

/** True if `user` may set/change `assigned_to` on a lead — Admin or the relevant Team Lead. */
export function canAssignLeads(user: AppUser): boolean {
  return user.role === "admin" || user.role === "team_lead";
}
