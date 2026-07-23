import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<LeadStatus, string> = {
  new_lead: "bg-slate-100 text-slate-700",
  dnr_1: "bg-gray-100 text-gray-700",
  dnr_2: "bg-gray-100 text-gray-700",
  dnr_3: "bg-gray-100 text-gray-700",
  connected: "bg-green-50 text-green-600",
  invalid_number: "bg-black text-white",
  not_interested: "bg-red-100 text-red-700",
  qualified: "bg-green-100 text-green-700",
  interested: "bg-blue-100 text-blue-700",
  hot_prospect: "bg-green-100 text-green-700",
  meeting_done: "bg-green-100 text-green-700",
  enrolled: "bg-emerald-600 text-white",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_STYLES[status])}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
