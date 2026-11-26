import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return user.role === "TEACHER" || user.role === "STUDENT" ? children : <ForbiddenPage />;
}
