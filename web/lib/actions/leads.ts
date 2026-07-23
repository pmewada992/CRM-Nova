"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase";
import { requireAppUser, canAssignLeads } from "@/lib/permissions";
import { leadFormSchema, type LeadFormInput } from "@/lib/validations/lead";
import type { Lead } from "@/types/database";

export type LeadWithNames = Lead & {
  lead_by_user: { id: string; name: string } | null;
  assigned_to_user: { id: string; name: string } | null;
};

export type LeadListItem = LeadWithNames & { last_activity_at: string | null };

const PAGE_SIZE = 50;

export async function getLeads(
  { search = "", page = 1 }: { search?: string; page?: number } = {},
): Promise<{ leads: LeadListItem[]; total: number; pageSize: number }> {
  await requireAppUser();
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("leads")
    .select(
      "*, lead_by_user:lead_by(id, name), assigned_to_user:assigned_to(id, name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  const term = search.trim();
  if (term) {
    const escaped = term.replace(/[%_]/g, "\\$&");
    query = query.or(
      `name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`,
    );
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error("Something went wrong.");

  const leads = data as unknown as LeadWithNames[];
  const ids = leads.map((l) => l.id);
  const lastActivityByLead = new Map<string, string>();
  if (ids.length > 0) {
    const { data: activityRows, error: activityError } = await supabase
      .from("lead_activities")
      .select("lead_id, created_at")
      .in("lead_id", ids);
    if (activityError) throw new Error("Something went wrong.");
    for (const row of activityRows as { lead_id: string; created_at: string }[]) {
      const current = lastActivityByLead.get(row.lead_id);
      if (!current || row.created_at > current) {
        lastActivityByLead.set(row.lead_id, row.created_at);
      }
    }
  }

  return {
    leads: leads.map((l) => ({ ...l, last_activity_at: lastActivityByLead.get(l.id) ?? null })),
    total: count ?? 0,
    pageSize: PAGE_SIZE,
  };
}

export async function getLeadById(id: string): Promise<LeadWithNames> {
  await requireAppUser();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "*, lead_by_user:lead_by(id, name), assigned_to_user:assigned_to(id, name)",
    )
    .eq("id", id)
    .single();
  if (error) throw new Error("Something went wrong.");
  return data as unknown as LeadWithNames;
}

/**
 * Adjacent leads in the default (newest-first, ties broken by id) list
 * order, for the detail page's Previous/Next Lead nav. Ties matter in
 * practice — a CSV batch insert gives every row in that batch the exact
 * same `created_at` (Postgres `now()` is frozen per-transaction), so
 * ordering by `created_at` alone would make navigation get stuck/skip
 * within a batch.
 */
export async function getAdjacentLeadIds(
  currentId: string,
  createdAt: string,
): Promise<{ previousId: string | null; nextId: string | null }> {
  await requireAppUser();
  const supabase = createServerSupabaseClient();
  const [previousRes, nextRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id")
      .or(`created_at.gt.${createdAt},and(created_at.eq.${createdAt},id.gt.${currentId})`)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("leads")
      .select("id")
      .or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${currentId})`)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (previousRes.error || nextRes.error) throw new Error("Something went wrong.");
  return {
    previousId: (previousRes.data as { id: string } | null)?.id ?? null,
    nextId: (nextRes.data as { id: string } | null)?.id ?? null,
  };
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

  if (error) throw new Error("Something went wrong.");
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

  if (error) throw new Error("Something went wrong.");
  revalidatePath("/leads");
}

/** Contact-info + assignment edit (the "Edit" dialog on the detail page). Status changes go through activities.changeStatus instead. */
export async function updateLead(id: string, rawInput: LeadFormInput) {
  const user = await requireAppUser();
  const input = leadFormSchema.parse(rawInput);
  const supabase = createServerSupabaseClient();

  const update: Record<string, unknown> = {
    ...normalizeInput(input),
    updated_at: new Date().toISOString(),
  };

  if (canAssignLeads(user)) {
    if (input.lead_by) update.lead_by = input.lead_by;
  }

  const { error } = await supabase.from("leads").update(update).eq("id", id);
  if (error) throw new Error("Something went wrong.");

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}
