import { getUsers } from "@/lib/actions/users";
import { UsersTable } from "@/components/users/users-table";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          New sign-ups appear here as &quot;Unassigned&quot; — give them a
          role and team to grant access.
        </p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
