import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { AppUser, Lead } from "@/types/database";

/** Safe to show verbatim to the user — a deliberate, human-readable message. */
export class PermissionError extends Error {}
/** Safe to show verbatim to the user — a business-rule/validation message. */
export class ValidationError extends Error {}

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

/** True if `user` may create deals/log payments — Admin or Sales (BDEs generate leads, they don't close placements). */
export function canManageDeals(user: AppUser): boolean {
  return user.role === "admin" || user.team === "sales";
}

/**
 * True if `user` may edit (not just view) `lead` — mirrors the
 * `can_edit_lead()` SQL function in migration 0005 exactly, so the UI can
 * hide/disable actions for leads the viewer can only browse read-only.
 * RLS is still the actual enforcement; this is UI convenience only.
 */
export function canEditLead(
  user: AppUser,
  lead: Pick<Lead, "lead_by" | "assigned_to">,
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "team_lead") {
    // lead_by only ever points to a BDE user, assigned_to only ever to a
    // Sales user (enforced by app logic, not a DB constraint) — so a Team
    // Lead's own-team scope covers every lead regardless of its content.
    return true;
  }
  if (user.team === "bde") return lead.lead_by === user.id && lead.assigned_to === null;
  if (user.team === "sales") return lead.assigned_to === user.id;
  return false;
}
