"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase";
import { requireAppUser, canAssignLeads, PermissionError } from "@/lib/permissions";
import { leadFormSchema, type LeadFormInput } from "@/lib/validations/lead";
import type { Lead } from "@/types/database";

export type LeadWithNames = Lead & {
  lead_by_user: { id: string; name: string } | null;
  assigned_to_user: { id: string; name: string } | null;
};

export async function getLeads(): Promise<LeadWithNames[]> {
  await requireAppUser();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "*, lead_by_user:lead_by(id, name), assigned_to_user:assigned_to(id, name)",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as unknown as LeadWithNames[];
}

/** BDE users (for the "Lead by" picker) and Sales users (for "Assigned to"). */
export async function getAssignableUsers() {
  const user = await requireAppUser();
  if (!canAssignLeads(user)) return { bdeUsers: [], salesUsers: [] };

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, team")
    .eq("active", true);

  if (error) throw new Error(error.message);
  const users = data as { id: string; name: string; team: string | null }[];
  return {
    bdeUsers: users.filter((u) => u.team === "bde"),
    salesUsers: users.filter((u) => u.team === "sales"),
  };
}

function normalizeInput(input: LeadFormInput) {
  return {
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    linkedin: input.linkedin || null,
    visa_status: input.visa_status || null,
    graduation_date: input.graduation_date || null,
    notes: input.notes || null,
    next_followup: input.next_followup || null,
  };
}

export async function createLead(rawInput: LeadFormInput) {
  const user = await requireAppUser();
  const input = leadFormSchema.parse(rawInput);
  const supabase = createServerSupabaseClient();

  const leadByCanChoose = canAssignLeads(user);
  const lead_by =
    leadByCanChoose && input.lead_by ? input.lead_by : user.team === "bde" ? user.id : null;
  const assigned_to = canAssignLeads(user) ? input.assigned_to ?? null : null;

  const { error } = await supabase.from("leads").insert({
    ...normalizeInput(input),
    lead_by,
    assigned_to,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/leads");
}

export async function updateLead(id: string, rawInput: LeadFormInput) {
  const user = await requireAppUser();
  const input = leadFormSchema.parse(rawInput);
  const supabase = createServerSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("status, assigned_to")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const update: Record<string, unknown> = {
    ...normalizeInput(input),
    updated_at: new Date().toISOString(),
  };

  if (canAssignLeads(user)) {
    update.assigned_to = input.assigned_to ?? null;
    if (input.lead_by) update.lead_by = input.lead_by;
  }
  if (input.status) update.status = input.status;

  const { error } = await supabase.from("leads").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  if (input.status && input.status !== existing.status) {
    await supabase.from("status_history").insert({
      lead_id: id,
      old_status: existing.status,
      new_status: input.status,
      changed_by: user.id,
    });
  }

  revalidatePath("/leads");
}

export async function deleteLead(id: string) {
  const user = await requireAppUser();
  if (user.role !== "admin") throw new PermissionError("Admin only.");
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/leads");
}
