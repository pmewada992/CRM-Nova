import { getLeads, getAssignableUsers } from "@/lib/actions/leads";
import { requireAppUser, canAssignLeads } from "@/lib/permissions";
import { LeadsView } from "@/components/leads/leads-view";

export default async function LeadsPage() {
  const user = await requireAppUser();
  const [leads, { bdeUsers, salesUsers }] = await Promise.all([
    getLeads(),
    getAssignableUsers(),
  ]);

  return (
    <LeadsView
      leads={leads}
      canAssign={canAssignLeads(user)}
      bdeUsers={bdeUsers}
      salesUsers={salesUsers}
    />
  );
}
