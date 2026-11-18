import type { Metadata } from "next";

import { requireUser } from "@/entities/user/server";
import { ForbiddenPage } from "@/pages/forbidden";
import { TranscriptPage } from "@/pages/student-grades";

export const metadata: Metadata = { title: "Transcript" };

export default async function Page() {
  const user = await requireUser();
  return user.role === "STUDENT" ? <TranscriptPage /> : <ForbiddenPage />;
}
