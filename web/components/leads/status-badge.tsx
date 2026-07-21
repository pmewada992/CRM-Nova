import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<LeadStatus, string> = {
  dnr_1: "bg-gray-100 text-gray-700",
  dnr_2: "bg-gray-200 text-gray-800",
  dnr_3: "bg-gray-300 text-gray-900",
  invalid_number: "bg-red-100 text-red-700",
  qualified: "bg-amber-100 text-amber-800",
  interested: "bg-blue-100 text-blue-700",
  hot_prospect: "bg-orange-100 text-orange-700",
  meeting_done: "bg-green-100 text-green-700",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_STYLES[status])}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
