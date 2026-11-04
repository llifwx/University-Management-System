import { SessionProvider } from "@/entities/user";
import { requireUser } from "@/entities/user/server";
import { AppShell } from "@/widgets/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <SessionProvider user={user}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
