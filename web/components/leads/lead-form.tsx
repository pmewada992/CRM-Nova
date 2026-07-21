"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/types/database";
import type { LeadFormInput } from "@/lib/validations/lead";
import type { LeadWithNames } from "@/lib/actions/leads";

type AssignableUser = { id: string; name: string };

export function LeadForm({
  lead,
  canAssign,
  bdeUsers,
  salesUsers,
  showStatus,
  onSubmit,
  onCancel,
}: {
  lead?: LeadWithNames;
  canAssign: boolean;
  bdeUsers: AssignableUser[];
  salesUsers: AssignableUser[];
  showStatus: boolean;
  onSubmit: (input: LeadFormInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<LeadFormInput>({
    name: lead?.name ?? "",
    phone: lead?.phone ?? "",
    email: lead?.email ?? "",
    linkedin: lead?.linkedin ?? "",
    visa_status: lead?.visa_status ?? "",
    graduation_date: lead?.graduation_date ?? "",
    lead_by: lead?.lead_by ?? undefined,
    assigned_to: lead?.assigned_to ?? undefined,
    status: lead?.status,
    notes: lead?.notes ?? "",
    next_followup: lead?.next_followup ?? "",
  });

  function set<K extends keyof LeadFormInput>(key: K, value: LeadFormInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(values);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            value={values.linkedin}
            onChange={(e) => set("linkedin", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="visa_status">VISA Status</Label>
          <Input
            id="visa_status"
            value={values.visa_status}
            onChange={(e) => set("visa_status", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="graduation_date">Graduation Date</Label>
          <Input
            id="graduation_date"
            type="date"
            value={values.graduation_date}
            onChange={(e) => set("graduation_date", e.target.value)}
          />
        </div>
        {canAssign && (
          <div className="space-y-1.5">
            <Label>Lead by (BDE)</Label>
            <Select
              value={values.lead_by ?? undefined}
              onValueChange={(v) => set("lead_by", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {bdeUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {canAssign && (
          <div className="space-y-1.5">
            <Label>Assigned to (Sales)</Label>
            <Select
              value={values.assigned_to ?? undefined}
              onValueChange={(v) => set("assigned_to", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {salesUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {showStatus && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={values.status}
              onValueChange={(v) => set("status", v as LeadFormInput["status"])}
            >
              <SelectTrigger>
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
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="next_followup">Next Follow-up</Label>
          <Input
            id="next_followup"
            type="date"
            value={values.next_followup}
            onChange={(e) => set("next_followup", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : lead ? "Save changes" : "Add lead"}
        </Button>
      </div>
    </form>
  );
}
