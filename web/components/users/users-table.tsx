"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLES, TEAMS, type AppUser, type Role, type Team } from "@/types/database";
import { setUserRoleTeam, setUserActive, inviteUser } from "@/lib/actions/users";
import { useActionStatus } from "@/lib/hooks/use-action-status";

const NONE = "__none__";

export function UsersTable({ users }: { users: AppUser[] }) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <Plus className="size-4" />
          Invite User
        </Button>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </TableBody>
        </Table>
      </div>
      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function UserRow({ user }: { user: AppUser }) {
  const roleAction = useActionStatus();
  const teamAction = useActionStatus();
  const activeAction = useActionStatus();

  function handleRoleChange(role: string) {
    roleAction.run(() =>
      setUserRoleTeam(user.id, { role: role === NONE ? null : (role as Role), team: user.team }),
    );
  }

  function handleTeamChange(team: string) {
    teamAction.run(() =>
      setUserRoleTeam(user.id, { role: user.role, team: team === NONE ? null : (team as Team) }),
    );
  }

  function handleToggleActive() {
    activeAction.run(() => setUserActive(user.id, !user.active));
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Select
          value={user.role ?? NONE}
          onValueChange={(v) => handleRoleChange(v ?? NONE)}
          disabled={roleAction.isPending}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Unassigned</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ActionFeedback status={roleAction.status} />
      </TableCell>
      <TableCell>
        <Select
          value={user.team ?? NONE}
          onValueChange={(v) => handleTeamChange(v ?? NONE)}
          disabled={teamAction.isPending}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>None</SelectItem>
            {TEAMS.map((t) => (
              <SelectItem key={t} value={t} className="uppercase">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ActionFeedback status={teamAction.status} />
      </TableCell>
      <TableCell>
        <Badge variant={user.active ? "outline" : "secondary"}>
          {user.active ? "Active" : "Deactivated"}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant="ghost"
          disabled={activeAction.isPending}
          onClick={handleToggleActive}
        >
          {user.active ? "Deactivate" : "Reactivate"}
        </Button>
        <ActionFeedback status={activeAction.status} />
      </TableCell>
    </TableRow>
  );
}

function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const { status, isPending, run } = useActionStatus();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      await inviteUser(email);
      setEmail("");
    }, "Invitation sent");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              They&apos;ll get a sign-up link by email. Assign their role/team here once they
              join.
            </p>
          </div>
          <ActionFeedback status={status} />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Sending..." : "Send Invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
