"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/leads/status-badge";
import { LeadForm } from "@/components/leads/lead-form";
import { createLead, updateLead, type LeadWithNames } from "@/lib/actions/leads";
import type { LeadFormInput } from "@/lib/validations/lead";

export function LeadsView({
  leads,
  canAssign,
  bdeUsers,
  salesUsers,
}: {
  leads: LeadWithNames[];
  canAssign: boolean;
  bdeUsers: { id: string; name: string }[];
  salesUsers: { id: string; name: string }[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<LeadWithNames | null>(null);

  async function handleCreate(input: LeadFormInput) {
    await createLead(input);
    setAddOpen(false);
  }

  async function handleUpdate(input: LeadFormInput) {
    if (!selected) return;
    await updateLead(selected.id, input);
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Lead
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Lead by</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Next follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No leads yet.
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() => setSelected(lead)}
              >
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell>{lead.lead_by_user?.name ?? "—"}</TableCell>
                <TableCell>{lead.assigned_to_user?.name ?? "—"}</TableCell>
                <TableCell>{lead.next_followup ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <LeadForm
            canAssign={canAssign}
            bdeUsers={bdeUsers}
            salesUsers={salesUsers}
            showStatus={false}
            onSubmit={handleCreate}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.name}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            {selected && (
              <LeadForm
                lead={selected}
                canAssign={canAssign}
                bdeUsers={bdeUsers}
                salesUsers={salesUsers}
                showStatus
                onSubmit={handleUpdate}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
