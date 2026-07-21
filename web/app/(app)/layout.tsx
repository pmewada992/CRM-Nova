import { getCurrentAppUser } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAppUser();

  if (!user || !user.active || !user.role) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="text-lg font-semibold">Account pending setup</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in, but an admin still needs to assign you a
            role and team before you can use NovaCRM.
          </p>
        </div>
      </div>
    );
  }

  return <AppShell user={user}>{children}</AppShell>;
}
