import { z } from "zod";

export const leadFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  linkedin: z.string().trim().optional().or(z.literal("")),
  visa_status: z.string().trim().optional().or(z.literal("")),
  graduation_date: z.string().trim().optional().or(z.literal("")),
  lead_by: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  next_followup: z.string().trim().optional().or(z.literal("")),
});

export type LeadFormInput = z.infer<typeof leadFormSchema>;

/** One row of a CSV import — only Name + Phone are mandatory. */
export const csvRowSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().optional(),
  linkedin: z.string().trim().optional(),
  visa_status: z.string().trim().optional(),
  graduation_date: z.string().trim().optional(),
});

export type CsvRowInput = z.infer<typeof csvRowSchema>;

export const csvImportBatchSchema = z.object({
  leadBy: z.string().uuid().nullable(),
  rows: z.array(csvRowSchema).min(1).max(1000),
});
