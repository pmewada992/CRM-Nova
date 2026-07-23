"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase";
import { requireAppUser } from "@/lib/permissions";
import type { Deal, Payment } from "@/types/database";

export type DealWithPayments = Deal & {
  offered_by_user: { id: string; name: string } | null;
  payments: Payment[];
};

export async function getDeals(leadId: string): Promise<DealWithPayments[]> {
  await requireAppUser();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, offered_by_user:offered_by(id, name), payments(*)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Something went wrong.");
  return data as unknown as DealWithPayments[];
}

const dealSchema = z.object({
  package_name: z.string().trim().min(1),
  price: z.number().min(0),
  services: z.string().trim().optional(),
  offer_date: z.string().trim().min(1),
});

export async function createDeal(leadId: string, rawInput: z.infer<typeof dealSchema>) {
  const user = await requireAppUser();
  const input = dealSchema.parse(rawInput);
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("deals").insert({
    lead_id: leadId,
    package_name: input.package_name,
    price: input.price,
    services: input.services || null,
    offer_date: input.offer_date,
    offered_by: user.id,
  });
  if (error) throw new Error("Something went wrong.");
  revalidatePath(`/leads/${leadId}`);
}

const paymentSchema = z.object({
  amount: z.number().positive(),
  collected_at: z.string().trim().min(1),
});

export async function logPayment(
  dealId: string,
  leadId: string,
  rawInput: z.infer<typeof paymentSchema>,
) {
  await requireAppUser();
  const input = paymentSchema.parse(rawInput);
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("payments").insert({
    deal_id: dealId,
    amount: input.amount,
    collected_at: input.collected_at,
  });
  if (error) throw new Error("Something went wrong.");
  revalidatePath(`/leads/${leadId}`);
}
