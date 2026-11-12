import { SessionProvider } from "@/entities/user";
import { requireUser } from "@/entities/user/server";
import { AppShell } from "@/widgets/app-shell";
import { ChatWidget } from "@/widgets/support-chat";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Read at request time (not NEXT_PUBLIC_, which Next inlines at build time) so the browser's
  // direct-to-backend chat socket URL can be changed by redeploying the container, not rebuilding it.
  const chatWsUrl = process.env.CHAT_WS_URL ?? "ws://localhost:8000/api/v1";
  return (
    <SessionProvider user={user}>
      <AppShell>{children}</AppShell>
      <ChatWidget wsUrl={chatWsUrl} />
    </SessionProvider>
  );
}
