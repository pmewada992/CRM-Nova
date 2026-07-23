import { getLeadById, getAdjacentLeadIds, getAssignableUsers } from "@/lib/actions/leads";
import { getActivities } from "@/lib/actions/activities";
import { getDeals } from "@/lib/actions/deals";
import { requireAppUser, canAssignLeads, canManageDeals, canEditLead } from "@/lib/permissions";
import { LeadDetailView } from "@/components/leads/detail/lead-detail-view";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const lead = await getLeadById(id);

  const [activities, deals, { bdeUsers, salesUsers }, adjacent] = await Promise.all([
    getActivities(id),
    getDeals(id),
    getAssignableUsers(),
    getAdjacentLeadIds(id, lead.created_at),
  ]);

  const canEdit = canEditLead(user, lead);

  return (
    <LeadDetailView
      lead={lead}
      activities={activities}
      deals={deals}
      canEdit={canEdit}
      canAssign={canEdit && canAssignLeads(user)}
      canManageDeals={canEdit && canManageDeals(user)}
      bdeUsers={bdeUsers}
      salesUsers={salesUsers}
      previousLeadId={adjacent.previousId}
      nextLeadId={adjacent.nextId}
    />
  );
}
