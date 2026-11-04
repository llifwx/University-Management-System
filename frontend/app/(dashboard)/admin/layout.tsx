import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return user.role === "ADMIN" ? children : <ForbiddenPage />;
}
