export const ROLES = ["admin", "team_lead", "rep"] as const;
export type Role = (typeof ROLES)[number];

export const TEAMS = ["sales", "bde"] as const;
export type Team = (typeof TEAMS)[number];

export const LEAD_STATUSES = [
  "new_lead",
  "dnr_1",
  "dnr_2",
  "dnr_3",
  "connected",
  "invalid_number",
  "not_interested",
  "qualified",
  "interested",
  "hot_prospect",
  "meeting_done",
  "enrolled",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new_lead: "New Lead",
  dnr_1: "DNR 1",
  dnr_2: "DNR 2",
  dnr_3: "DNR 3",
  connected: "Connected",
  invalid_number: "Invalid Number",
  not_interested: "Not Interested",
  qualified: "Qualified",
  interested: "Interested",
  hot_prospect: "Hot Prospect",
  meeting_done: "Meeting Done",
  enrolled: "Enrolled",
};

export interface AppUser {
  id: string;
  /** Null until the invited person actually signs up — see lib/actions/users.ts inviteUser(). */
  clerk_user_id: string | null;
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
  next_followup: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityType = "assigned" | "status_changed" | "call" | "note" | "task";

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: ActivityType;
  created_by: string;
  created_at: string;
  body: string | null;
  old_status: LeadStatus | null;
  new_status: LeadStatus | null;
  old_assigned_to: string | null;
  new_assigned_to: string | null;
  call_outcome: string | null;
  call_duration_seconds: number | null;
  zoom_call_id: string | null;
  task_due_date: string | null;
  task_completed_at: string | null;
}

export interface Deal {
  id: string;
  lead_id: string;
  package_name: string;
  price: number;
  services: string | null;
  offer_date: string;
  offered_by: string;
  created_at: string;
}

export interface Payment {
  id: string;
  deal_id: string;
  amount: number;
  collected_at: string;
  created_at: string;
}
