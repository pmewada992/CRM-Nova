"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { setUserRoleTeam, setUserActive } from "@/lib/actions/users";

const NONE = "__none__";

export function UsersTable({ users }: { users: AppUser[] }) {
  const [isPending, startTransition] = useTransition();

  function handleRoleChange(user: AppUser, role: string) {
    startTransition(async () => {
      try {
        await setUserRoleTeam(user.id, {
          role: role === NONE ? null : (role as Role),
          team: user.team,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update role");
      }
    });
  }

  function handleTeamChange(user: AppUser, team: string) {
    startTransition(async () => {
      try {
        await setUserRoleTeam(user.id, {
          role: user.role,
          team: team === NONE ? null : (team as Team),
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update team");
      }
    });
  }

  function handleToggleActive(user: AppUser) {
    startTransition(async () => {
      try {
        await setUserActive(user.id, !user.active);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
    });
  }

  return (
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
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Select
                  value={user.role ?? NONE}
                  onValueChange={(v) => handleRoleChange(user, v ?? NONE)}
                  disabled={isPending}
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
              </TableCell>
              <TableCell>
                <Select
                  value={user.team ?? NONE}
                  onValueChange={(v) => handleTeamChange(user, v ?? NONE)}
                  disabled={isPending}
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
                  disabled={isPending}
                  onClick={() => handleToggleActive(user)}
                >
                  {user.active ? "Deactivate" : "Reactivate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
