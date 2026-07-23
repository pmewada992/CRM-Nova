import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAppUser();
  if (!user || user.role !== "admin") {
    redirect("/leads");
  }
  return <>{children}</>;
}
