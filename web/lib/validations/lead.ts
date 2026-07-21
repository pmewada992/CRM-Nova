import { z } from "zod";
import { LEAD_STATUSES } from "@/types/database";

export const leadFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  linkedin: z.string().trim().optional().or(z.literal("")),
  visa_status: z.string().trim().optional().or(z.literal("")),
  graduation_date: z.string().trim().optional().or(z.literal("")),
  lead_by: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().trim().optional().or(z.literal("")),
  next_followup: z.string().trim().optional().or(z.literal("")),
});

export type LeadFormInput = z.infer<typeof leadFormSchema>;
