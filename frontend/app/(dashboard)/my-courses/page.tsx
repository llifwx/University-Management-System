import type { Metadata } from "next";

import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";
import { MyCoursesPage } from "@/pages/my-courses";

export const metadata: Metadata = { title: "My courses" };

export default async function Page() {
  const user = await requireUser();
  return user.role === "STUDENT" ? <MyCoursesPage /> : <ForbiddenPage />;
}
