"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/permissions";

export interface DashboardStats {
  totals: { qualified: number; hotProspect: number; meetingDone: number; collected: number };
  paymentsByMonth: { month: string; amount: number }[];
  paymentsByRep: { userId: string; name: string; amount: number }[];
  teamBreakdown: {
    sales: { qualified: number; hotProspect: number; meetingDone: number };
    bde: { leadsAdded: number };
  };
  salesPerformance: {
    userId: string;
    name: string;
    callsMade: number;
    qualifiedLeads: number;
    closers: number;
    collected: number;
  }[];
  bdePerformance: { userId: string; name: string; leadsAdded: number; qualifiedPlus: number }[];
}

const QUALIFIED_PLUS_STATUSES = ["qualified", "interested", "hot_prospect", "meeting_done"];

function monthKey(iso: string) {
  return iso.slice(0, 7); // "YYYY-MM"
}

/** Admin-only aggregate stats for the dashboard. Plain grouped-in-JS from minimal-column
 * queries (counts where possible) — fine at this org's size; revisit with a SQL view/RPC
 * only if this gets slow, same reasoning as skipping a denormalized last_activity_at. */
export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  const [
    qualifiedCount,
    hotProspectCount,
    meetingDoneCount,
    usersRes,
    paymentsRes,
    dealsRes,
    callsRes,
    salesQualifiedLeadsRes,
    allLeadsRes,
  ] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "qualified"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "hot_prospect"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "meeting_done"),
    supabase.from("users").select("id, name, team").eq("active", true),
    supabase.from("payments").select("amount, collected_at"),
    supabase.from("deals").select("id, offered_by, payments(amount)"),
    supabase.from("lead_activities").select("created_by").eq("type", "call"),
    supabase.from("leads").select("assigned_to").eq("status", "qualified"),
    supabase.from("leads").select("lead_by, status"),
  ]);

  for (const res of [
    qualifiedCount,
    hotProspectCount,
    meetingDoneCount,
    usersRes,
    paymentsRes,
    dealsRes,
    callsRes,
    salesQualifiedLeadsRes,
    allLeadsRes,
  ]) {
    if (res.error) throw new Error("Something went wrong.");
  }

  const users = usersRes.data as { id: string; name: string; team: string | null }[];
  const salesUsers = users.filter((u) => u.team === "sales");
  const bdeUsers = users.filter((u) => u.team === "bde");

  const payments = paymentsRes.data as { amount: number; collected_at: string }[];
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const paymentsByMonthMap = new Map<string, number>();
  for (const p of payments) {
    const key = monthKey(p.collected_at);
    paymentsByMonthMap.set(key, (paymentsByMonthMap.get(key) ?? 0) + Number(p.amount));
  }
  const paymentsByMonth = [...paymentsByMonthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount }));

  const deals = dealsRes.data as {
    id: string;
    offered_by: string;
    payments: { amount: number }[];
  }[];

  const paymentsByRepMap = new Map<string, number>();
  const closersByRepMap = new Map<string, number>();
  for (const deal of deals) {
    const dealTotal = deal.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    paymentsByRepMap.set(deal.offered_by, (paymentsByRepMap.get(deal.offered_by) ?? 0) + dealTotal);
    if (deal.payments.length > 0) {
      closersByRepMap.set(deal.offered_by, (closersByRepMap.get(deal.offered_by) ?? 0) + 1);
    }
  }
  const paymentsByRep = salesUsers.map((u) => ({
    userId: u.id,
    name: u.name,
    amount: paymentsByRepMap.get(u.id) ?? 0,
  }));

  const calls = callsRes.data as { created_by: string }[];
  const callsByUserMap = new Map<string, number>();
  for (const c of calls) {
    callsByUserMap.set(c.created_by, (callsByUserMap.get(c.created_by) ?? 0) + 1);
  }

  const salesQualifiedLeads = salesQualifiedLeadsRes.data as { assigned_to: string | null }[];
  const qualifiedByRepMap = new Map<string, number>();
  for (const l of salesQualifiedLeads) {
    if (!l.assigned_to) continue;
    qualifiedByRepMap.set(l.assigned_to, (qualifiedByRepMap.get(l.assigned_to) ?? 0) + 1);
  }

  const salesPerformance = salesUsers.map((u) => ({
    userId: u.id,
    name: u.name,
    callsMade: callsByUserMap.get(u.id) ?? 0,
    qualifiedLeads: qualifiedByRepMap.get(u.id) ?? 0,
    closers: closersByRepMap.get(u.id) ?? 0,
    collected: paymentsByRepMap.get(u.id) ?? 0,
  }));

  const allLeads = allLeadsRes.data as { lead_by: string | null; status: string }[];
  const leadsAddedByBdeMap = new Map<string, number>();
  const qualifiedPlusByBdeMap = new Map<string, number>();
  for (const l of allLeads) {
    if (l.lead_by) {
      leadsAddedByBdeMap.set(l.lead_by, (leadsAddedByBdeMap.get(l.lead_by) ?? 0) + 1);
      if (QUALIFIED_PLUS_STATUSES.includes(l.status)) {
        qualifiedPlusByBdeMap.set(l.lead_by, (qualifiedPlusByBdeMap.get(l.lead_by) ?? 0) + 1);
      }
    }
  }

  const bdePerformance = bdeUsers.map((u) => ({
    userId: u.id,
    name: u.name,
    leadsAdded: leadsAddedByBdeMap.get(u.id) ?? 0,
    qualifiedPlus: qualifiedPlusByBdeMap.get(u.id) ?? 0,
  }));

  const totals = {
    qualified: qualifiedCount.count ?? 0,
    hotProspect: hotProspectCount.count ?? 0,
    meetingDone: meetingDoneCount.count ?? 0,
    collected: totalCollected,
  };

  return {
    totals,
    paymentsByMonth,
    paymentsByRep,
    teamBreakdown: {
      // Every lead's pipeline status is company-wide (only Sales works the
      // pipeline), so this is the same figure as `totals` above.
      sales: {
        qualified: totals.qualified,
        hotProspect: totals.hotProspect,
        meetingDone: totals.meetingDone,
      },
      bde: { leadsAdded: allLeads.filter((l) => l.lead_by).length },
    },
    salesPerformance,
    bdePerformance,
  };
}
