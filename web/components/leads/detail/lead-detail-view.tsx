"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileCard } from "@/components/leads/detail/profile-card";
import { ActivityFeed } from "@/components/leads/detail/activity-feed";
import { DealsPanel } from "@/components/leads/detail/deals-panel";
import type { LeadWithNames } from "@/lib/actions/leads";
import type { ActivityWithNames } from "@/lib/actions/activities";
import type { DealWithPayments } from "@/lib/actions/deals";

type Tab = "all" | "notes" | "calls" | "tasks";

export function LeadDetailView({
  lead,
  activities,
  deals,
  canEdit,
  canAssign,
  canManageDeals,
  bdeUsers,
  salesUsers,
  previousLeadId,
  nextLeadId,
}: {
  lead: LeadWithNames;
  activities: ActivityWithNames[];
  deals: DealWithPayments[];
  canEdit: boolean;
  canAssign: boolean;
  canManageDeals: boolean;
  bdeUsers: { id: string; name: string }[];
  salesUsers: { id: string; name: string }[];
  previousLeadId: string | null;
  nextLeadId: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("all");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/leads" className="hover:underline">
          Leads
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{lead.name}</span>
      </div>

      {!canEdit && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You&apos;re viewing this lead read-only — it isn&apos;t assigned to you.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_280px]">
        <ProfileCard
          lead={lead}
          canEdit={canEdit}
          canAssign={canAssign}
          bdeUsers={bdeUsers}
          salesUsers={salesUsers}
          onQuickAction={setActiveTab}
        />
        <ActivityFeed
          leadId={lead.id}
          activities={activities}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          canEdit={canEdit}
        />
        <div className="flex flex-col gap-4">
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!previousLeadId}
              onClick={() => previousLeadId && router.push(`/leads/${previousLeadId}`)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              disabled={!nextLeadId}
              onClick={() => nextLeadId && router.push(`/leads/${nextLeadId}`)}
            >
              Next Lead
            </Button>
          </div>
          <DealsPanel leadId={lead.id} deals={deals} canManage={canManageDeals} />
        </div>
      </div>
    </div>
  );
}
