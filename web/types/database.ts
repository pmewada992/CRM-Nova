export const ROLES = ["admin", "team_lead", "rep"] as const;
export type Role = (typeof ROLES)[number];

export const TEAMS = ["sales", "bde"] as const;
export type Team = (typeof TEAMS)[number];

export const LEAD_STATUSES = [
  "dnr_1",
  "dnr_2",
  "dnr_3",
  "invalid_number",
  "qualified",
  "interested",
  "hot_prospect",
  "meeting_done",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  dnr_1: "DNR 1",
  dnr_2: "DNR 2",
  dnr_3: "DNR 3",
  invalid_number: "Invalid Number",
  qualified: "Qualified",
  interested: "Interested",
  hot_prospect: "Hot Prospect",
  meeting_done: "Meeting Done",
};

export interface AppUser {
  id: string;
  clerk_user_id: string;
  name: string;
  email: string;
  role: Role | null;
  team: Team | null;
  active: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  linkedin: string | null;
  visa_status: string | null;
  graduation_date: string | null;
  lead_by: string | null;
  assigned_to: string | null;
  status: LeadStatus;
  notes: string | null;
  date_called: string | null;
  next_followup: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  lead_id: string;
  caller_id: string;
  zoom_call_id: string | null;
  started_at: string;
  duration_seconds: number | null;
  outcome: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  lead_id: string;
  old_status: LeadStatus | null;
  new_status: LeadStatus;
  changed_by: string;
  changed_at: string;
}
