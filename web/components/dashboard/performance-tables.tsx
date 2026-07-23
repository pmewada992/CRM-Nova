import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardStats } from "@/lib/actions/dashboard";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function SalesPerformanceTable({
  rows,
}: {
  rows: DashboardStats["salesPerformance"];
}) {
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3 text-sm font-medium">Sales Performance</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rep</TableHead>
            <TableHead>Calls Made</TableHead>
            <TableHead>Qualified Leads</TableHead>
            <TableHead>Closers</TableHead>
            <TableHead>Total Collected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No Sales reps yet.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.userId}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.callsMade}</TableCell>
              <TableCell>{r.qualifiedLeads}</TableCell>
              <TableCell>{r.closers}</TableCell>
              <TableCell>{currency.format(r.collected)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function BdePerformanceTable({ rows }: { rows: DashboardStats["bdePerformance"] }) {
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3 text-sm font-medium">BDE Performance</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>BDE</TableHead>
            <TableHead>Leads Added</TableHead>
            <TableHead>Qualified+</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No BDEs yet.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.userId}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.leadsAdded}</TableCell>
              <TableCell>{r.qualifiedPlus}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
