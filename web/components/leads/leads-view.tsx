"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Search, UserSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/leads/status-badge";
import { LeadForm } from "@/components/leads/lead-form";
import { CsvImport } from "@/components/leads/csv-import";
import { createLead, type LeadListItem } from "@/lib/actions/leads";
import type { LeadFormInput } from "@/lib/validations/lead";
import { formatRelativeTime } from "@/lib/utils";

export function LeadsView({
  leads,
  total,
  pageSize,
  page,
  search,
  canAssign,
  bdeUsers,
  salesUsers,
}: {
  leads: LeadListItem[];
  total: number;
  pageSize: number;
  page: number;
  search: string;
  canAssign: boolean;
  bdeUsers: { id: string; name: string }[];
  salesUsers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(search);
  const [, startTransition] = useTransition();

  function pushParams(next: { q?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    params.set("page", String(next.page ?? 1));
    startTransition(() => router.push(`/leads?${params.toString()}`));
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    pushParams({ q: value, page: 1 });
  }

  async function handleCreate(input: LeadFormInput) {
    await createLead(input);
    setAddOpen(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leads</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add Lead
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, or email..."
          className="pl-9"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Lead Owner</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <UserSearch className="size-6" />
                    {search ? (
                      <p className="text-sm">No leads match &quot;{search}&quot;.</p>
                    ) : (
                      <>
                        <p className="text-sm">No leads yet.</p>
                        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                          <Plus className="size-4" />
                          Add your first lead
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">
                  <Link href={`/leads/${lead.id}`} className="hover:underline">
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell>{lead.lead_by_user?.name ?? "—"}</TableCell>
                <TableCell>{lead.assigned_to_user?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.last_activity_at ? formatRelativeTime(lead.last_activity_at) : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {from}-{to} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushParams({ page: page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Lead</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="manual">
            <TabsList>
              <TabsTrigger value="manual">Add Manually</TabsTrigger>
              <TabsTrigger value="csv">Import CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="manual">
              <LeadForm
                canAssign={canAssign}
                bdeUsers={bdeUsers}
                salesUsers={salesUsers}
                onSubmit={handleCreate}
                onCancel={() => setAddOpen(false)}
              />
            </TabsContent>
            <TabsContent value="csv">
              <CsvImport
                bdeUsers={bdeUsers}
                canAssign={canAssign}
                onDone={() => {
                  setAddOpen(false);
                  router.refresh();
                }}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
