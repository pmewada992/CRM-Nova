import type { DashboardStats } from "@/lib/actions/dashboard";

export function TeamBreakdown({ teamBreakdown }: { teamBreakdown: DashboardStats["teamBreakdown"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Sales Team</h3>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-muted-foreground">Qualified</dt>
            <dd className="text-lg font-semibold">{teamBreakdown.sales.qualified}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Hot Prospect</dt>
            <dd className="text-lg font-semibold">{teamBreakdown.sales.hotProspect}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Meeting Done</dt>
            <dd className="text-lg font-semibold">{teamBreakdown.sales.meetingDone}</dd>
          </div>
        </dl>
      </div>
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">BDE Team</h3>
        <dl className="text-center">
          <dt className="text-xs text-muted-foreground">Leads Added</dt>
          <dd className="text-lg font-semibold">{teamBreakdown.bde.leadsAdded}</dd>
        </dl>
      </div>
    </div>
  );
}
