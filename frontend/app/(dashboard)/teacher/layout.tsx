import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return user.role === "TEACHER" ? children : <ForbiddenPage />;
}
