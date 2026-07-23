import { getLeads, getAssignableUsers } from "@/lib/actions/leads";
import { requireAppUser, canAssignLeads } from "@/lib/permissions";
import { LeadsView } from "@/components/leads/leads-view";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const search = params.q ?? "";
  const page = Number(params.page ?? "1") || 1;

  const [{ leads, total, pageSize }, { bdeUsers, salesUsers }] = await Promise.all([
    getLeads({ search, page }),
    getAssignableUsers(),
  ]);

  return (
    <LeadsView
      leads={leads}
      total={total}
      pageSize={pageSize}
      page={page}
      search={search}
      canAssign={canAssignLeads(user)}
      bdeUsers={bdeUsers}
      salesUsers={salesUsers}
    />
  );
}
