"use client";

import { useState } from "react";
import { Pencil, Phone, StickyNote, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ActionFeedback } from "@/components/ui/action-feedback";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadForm } from "@/components/leads/lead-form";
import { updateLead, type LeadWithNames } from "@/lib/actions/leads";
import { changeStatus, reassignLead, logCall } from "@/lib/actions/activities";
import { useActionStatus } from "@/lib/hooks/use-action-status";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/types/database";
import type { LeadFormInput } from "@/lib/validations/lead";

const UNASSIGNED = "__unassigned__";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileCard({
  lead,
  canEdit,
  canAssign,
  bdeUsers,
  salesUsers,
  onQuickAction,
}: {
  lead: LeadWithNames;
  canEdit: boolean;
  canAssign: boolean;
  bdeUsers: { id: string; name: string }[];
  salesUsers: { id: string; name: string }[];
  onQuickAction: (tab: "notes" | "tasks" | "calls") => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const statusAction = useActionStatus();
  const assignAction = useActionStatus();
  const callAction = useActionStatus();

  function handleStatusChange(value: string) {
    statusAction.run(() => changeStatus(lead.id, value as LeadStatus), "Status updated");
  }

  function handleReassign(value: string) {
    assignAction.run(
      () => reassignLead(lead.id, value === UNASSIGNED ? null : value),
      "Reassigned",
    );
  }

  function handleLogCall() {
    callAction.run(async () => {
      await logCall(lead.id);
      onQuickAction("calls");
    }, "Call logged");
  }

  async function handleEditSubmit(input: LeadFormInput) {
    await updateLead(lead.id, input);
    setEditOpen(false);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback>{initials(lead.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{lead.name}</div>
            <div className="text-xs text-muted-foreground">Job Seeker Lead</div>
          </div>
        </div>
        {canEdit && (
          <Button size="icon" variant="ghost" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
          </Button>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" onClick={() => onQuickAction("notes")}>
              <StickyNote className="size-4" />
              Note
            </Button>
            <Button size="sm" disabled={callAction.isPending} onClick={handleLogCall}>
              <Phone className="size-4" />
              Call
            </Button>
            <Button size="sm" onClick={() => onQuickAction("tasks")}>
              <ListTodo className="size-4" />
              Task
            </Button>
          </div>
          <ActionFeedback status={callAction.status} />
        </div>
      )}

      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Status</div>
        {canEdit ? (
          <>
            <Select
              value={lead.status}
              onValueChange={(v) => v && handleStatusChange(v)}
              disabled={statusAction.isPending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ActionFeedback status={statusAction.status} />
          </>
        ) : (
          <div className="text-sm">{LEAD_STATUS_LABELS[lead.status]}</div>
        )}
      </div>

      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Lead Owner (BDE)</dt>
          <dd>{lead.lead_by_user?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Assigned To</dt>
          {canAssign ? (
            <>
              <Select
                value={lead.assigned_to ?? UNASSIGNED}
                onValueChange={(v) => v && handleReassign(v)}
                disabled={assignAction.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {salesUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ActionFeedback status={assignAction.status} />
            </>
          ) : (
            <dd>{lead.assigned_to_user?.name ?? "—"}</dd>
          )}
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Phone</dt>
          <dd>{lead.phone}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Email</dt>
          <dd>{lead.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">LinkedIn</dt>
          <dd className="truncate">{lead.linkedin ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">VISA Status</dt>
          <dd>{lead.visa_status ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Graduation Date</dt>
          <dd>{lead.graduation_date ?? "—"}</dd>
        </div>
      </dl>

      {canEdit && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            <LeadForm
              lead={lead}
              canAssign={canAssign}
              bdeUsers={bdeUsers}
              salesUsers={salesUsers}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
