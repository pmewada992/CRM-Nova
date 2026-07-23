import { getDashboardStats } from "@/lib/actions/dashboard";
import { StatTile } from "@/components/dashboard/stat-tile";
import { BarChart } from "@/components/dashboard/bar-chart";
import { TeamBreakdown } from "@/components/dashboard/team-breakdown";
import {
  SalesPerformanceTable,
  BdePerformanceTable,
} from "@/components/dashboard/performance-tables";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
});

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Qualified" value={stats.totals.qualified.toLocaleString()} />
        <StatTile label="Hot Prospects" value={stats.totals.hotProspect.toLocaleString()} />
        <StatTile label="Meeting Done" value={stats.totals.meetingDone.toLocaleString()} />
        <StatTile label="Total Collected" value={currency.format(stats.totals.collected)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChart
          title="Payments Collected (last 6 months)"
          data={stats.paymentsByMonth.map((p) => ({ label: p.month, value: p.amount }))}
          formatValue={(v) => currency.format(v)}
        />
        <BarChart
          title="Payment Contribution by Rep"
          data={stats.paymentsByRep.map((p) => ({ label: p.name, value: p.amount }))}
          formatValue={(v) => currency.format(v)}
        />
      </div>

      <TeamBreakdown teamBreakdown={stats.teamBreakdown} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SalesPerformanceTable rows={stats.salesPerformance} />
        <BdePerformanceTable rows={stats.bdePerformance} />
      </div>
    </div>
  );
}
