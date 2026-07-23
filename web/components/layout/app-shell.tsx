import { UserButton } from "@clerk/nextjs";
import { Users2, ListChecks, LayoutDashboard } from "lucide-react";
import { NavLink } from "@/components/layout/nav-link";
import { BrandMark } from "@/components/layout/brand-mark";
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
        <div className="px-4 py-4">
          <BrandMark />
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {user.role === "admin" && (
            <NavLink href="/dashboard" icon={<LayoutDashboard size={16} />}>
              Dashboard
            </NavLink>
          )}
          <NavLink href="/leads" icon={<ListChecks size={16} />}>
            Leads
          </NavLink>
          {user.role === "admin" && (
            <NavLink href="/users" icon={<Users2 size={16} />}>
              Users
            </NavLink>
          )}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{user.name}</span>{" "}
            <span className="capitalize">&middot; {user.role?.replace("_", " ")}</span>
            {user.team && <span className="capitalize"> &middot; {user.team}</span>}
          </div>
          <UserButton />
        </header>
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
