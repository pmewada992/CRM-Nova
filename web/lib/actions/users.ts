"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { requireAdmin, ValidationError } from "@/lib/permissions";
import type { AppUser } from "@/types/database";
import { ROLES, TEAMS } from "@/types/database";
import { z } from "zod";

export async function getUsers(): Promise<AppUser[]> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Something went wrong.");
  return data as AppUser[];
}

const roleTeamSchema = z.object({
  role: z.enum(ROLES).nullable(),
  team: z.enum(TEAMS).nullable(),
});

export async function setUserRoleTeam(
  userId: string,
  input: { role: string | null; team: string | null },
) {
  const admin = await requireAdmin();
  if (userId === admin.id && input.role !== "admin") {
    throw new ValidationError("You can't remove your own admin role.");
  }
  const parsed = roleTeamSchema.parse(input);
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({ role: parsed.role, team: parsed.team })
    .eq("id", userId);
  if (error) throw new Error("Something went wrong.");
  revalidatePath("/users");
}

export async function setUserActive(userId: string, active: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id && !active) {
    throw new ValidationError("You can't deactivate your own account.");
  }
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({ active })
    .eq("id", userId);
  if (error) throw new Error("Something went wrong.");
  revalidatePath("/users");
}

const emailSchema = z.string().trim().email();

/**
 * Sends a Clerk invitation email — the only way to join now that public
 * sign-up is off — and immediately creates a placeholder `users` row
 * (`clerk_user_id: null`) so the Admin can pre-assign role/team before the
 * invitee actually signs up. The `user.created` webhook later fills in
 * `clerk_user_id` on this same row (matched by email) instead of inserting
 * a duplicate — see app/api/webhooks/clerk/route.ts.
 */
export async function inviteUser(email: string) {
  await requireAdmin();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    throw new ValidationError("Enter a valid email address.");
  }
  const client = await clerkClient();
  try {
    await client.invitations.createInvitation({
      emailAddress: parsed.data,
      // Must be an absolute URL — Clerk dev instances have no canonical
      // domain to resolve a relative path against.
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
      // Lets an Admin re-send if a previous invite expired/broke/bounced.
      ignoreExisting: true,
    });
  } catch (err) {
    const message =
      err && typeof err === "object" && "errors" in err
        ? String((err as { errors: { message?: string }[] }).errors?.[0]?.message ?? "")
        : "";
    if (message.toLowerCase().includes("already")) {
      throw new ValidationError("That email has already been invited or has an account.");
    }
    throw new Error("Failed to send invitation.");
  }

  const supabase = createServerSupabaseClient();
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .eq("email", parsed.data)
    .maybeSingle();
  if (lookupError) throw new Error("Something went wrong.");
  if (!existing) {
    const { error } = await supabase.from("users").insert({
      email: parsed.data,
      name: parsed.data,
      clerk_user_id: null,
      active: true,
    });
    if (error) throw new Error("Something went wrong.");
  }
  revalidatePath("/users");
}

/** Removes a still-pending invite row (never a real, signed-up user — see the `clerk_user_id` guard). */
export async function removeUser(userId: string) {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", userId)
    .is("clerk_user_id", null);
  if (error) throw new Error("Something went wrong.");
  revalidatePath("/users");
}
