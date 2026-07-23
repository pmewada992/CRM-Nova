"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase";
import { requireAppUser, canAssignLeads, PermissionError, ValidationError } from "@/lib/permissions";
import { LEAD_STATUSES, type LeadActivity, type LeadStatus } from "@/types/database";

export type ActivityWithNames = LeadActivity & {
  created_by_user: { id: string; name: string } | null;
  new_assigned_to_user: { id: string; name: string } | null;
};

export async function getActivities(leadId: string): Promise<ActivityWithNames[]> {
  await requireAppUser();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lead_activities")
    .select(
      "*, created_by_user:created_by(id, name), new_assigned_to_user:new_assigned_to(id, name)",
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Something went wrong.");
  return data as unknown as ActivityWithNames[];
}

/** Logs a call the instant the "Call" button is clicked; outcome is filled in afterward. */
export async function logCall(leadId: string) {
  const user = await requireAppUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "call",
    created_by: user.id,
  });
  if (error) throw new Error("Something went wrong.");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

const callOutcomeSchema = z.object({
  call_outcome: z.string().trim().min(1).optional(),
  call_duration_seconds: z.number().int().min(0).optional(),
  body: z.string().trim().optional(),
});

export async function updateCallOutcome(
  activityId: string,
  leadId: string,
  rawInput: z.infer<typeof callOutcomeSchema>,
) {
  await requireAppUser();
  const input = callOutcomeSchema.parse(rawInput);
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("lead_activities")
    .update({
      call_outcome: input.call_outcome ?? null,
      call_duration_seconds: input.call_duration_seconds ?? null,
      body: input.body || null,
    })
    .eq("id", activityId);
  if (error) throw new Error("Something went wrong.");
  revalidatePath(`/leads/${leadId}`);
}

export async function addNote(leadId: string, body: string) {
  const user = await requireAppUser();
  const text = body.trim();
  if (!text) throw new ValidationError("Note can't be empty.");
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "note",
    created_by: user.id,
    body: text,
  });
  if (error) throw new Error("Something went wrong.");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function addTask(leadId: string, body: string, dueDate: string) {
  const user = await requireAppUser();
  const text = body.trim();
  if (!text) throw new ValidationError("Task can't be empty.");
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "task",
    created_by: user.id,
    body: text,
    task_due_date: dueDate || null,
  });
  if (error) throw new Error("Something went wrong.");
  revalidatePath(`/leads/${leadId}`);
}

export async function completeTask(activityId: string, leadId: string, completed: boolean) {
  await requireAppUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("lead_activities")
    .update({ task_completed_at: completed ? new Date().toISOString() : null })
    .eq("id", activityId);
  if (error) throw new Error("Something went wrong.");
  revalidatePath(`/leads/${leadId}`);
}

export async function changeStatus(leadId: string, newStatus: LeadStatus) {
  const user = await requireAppUser();
  if (!LEAD_STATUSES.includes(newStatus)) throw new Error("Invalid status.");
  const supabase = createServerSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .single();
  if (fetchError) throw new Error("Something went wrong.");
  if (existing.status === newStatus) return;

  const { error: updateError } = await supabase
    .from("leads")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (updateError) throw new Error("Something went wrong.");

  const { error: activityError } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "status_changed",
    created_by: user.id,
    old_status: existing.status,
    new_status: newStatus,
  });
  if (activityError) throw new Error("Something went wrong.");

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

export async function reassignLead(leadId: string, newAssigneeId: string | null) {
  const user = await requireAppUser();
  if (!canAssignLeads(user)) throw new PermissionError("Only Admin/Team Lead can reassign.");
  const supabase = createServerSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("assigned_to")
    .eq("id", leadId)
    .single();
  if (fetchError) throw new Error("Something went wrong.");
  if (existing.assigned_to === newAssigneeId) return;

  const { error: updateError } = await supabase
    .from("leads")
    .update({ assigned_to: newAssigneeId, updated_at: new Date().toISOString() })
    .eq("id", leadId);
  if (updateError) throw new Error("Something went wrong.");

  const { error: activityError } = await supabase.from("lead_activities").insert({
    lead_id: leadId,
    type: "assigned",
    created_by: user.id,
    old_assigned_to: existing.assigned_to,
    new_assigned_to: newAssigneeId,
  });
  if (activityError) throw new Error("Something went wrong.");

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
