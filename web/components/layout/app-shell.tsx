import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Users2, ListChecks } from "lucide-react";
import type { AppUser } from "@/types/database";

export function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-4 text-lg font-semibold">NovaCRM</div>
        <nav className="flex flex-col gap-1 px-2">
          <Link
            href="/leads"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ListChecks size={16} />
            Leads
          </Link>
          {user.role === "admin" && (
            <Link
              href="/users"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Users2 size={16} />
              Users
            </Link>
          )}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <div className="text-sm text-muted-foreground">
            {user.name} &middot; <span className="capitalize">{user.role?.replace("_", " ")}</span>
            {user.team && <span className="capitalize"> &middot; {user.team}</span>}
          </div>
          <UserButton />
        </header>
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
