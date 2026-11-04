import type { Metadata } from "next";

import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";
import { MySchedulePage } from "@/pages/my-schedule";

export const metadata: Metadata = { title: "Schedule" };

export default async function Page() {
  const user = await requireUser();
  return user.role === "STUDENT" ? <MySchedulePage /> : <ForbiddenPage />;
}
