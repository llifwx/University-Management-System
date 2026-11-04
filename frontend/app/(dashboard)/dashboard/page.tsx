import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { roleHome } from "@/entities/user";
import { requireUser } from "@/entities/user/server";
import { StudentDashboardPage } from "@/pages/student-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Page() {
  const user = await requireUser();
  if (user.role !== "STUDENT") redirect(roleHome(user.role));
  return <StudentDashboardPage />;
}
