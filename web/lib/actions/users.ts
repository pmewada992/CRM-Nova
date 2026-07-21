"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/permissions";
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
  if (error) throw new Error(error.message);
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
    throw new Error("You can't remove your own admin role.");
  }
  const parsed = roleTeamSchema.parse(input);
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({ role: parsed.role, team: parsed.team })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}

export async function setUserActive(userId: string, active: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id && !active) {
    throw new Error("You can't deactivate your own account.");
  }
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("users")
    .update({ active })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/users");
}
