import { redirect } from "next/navigation";

import { roleHome } from "@/entities/user";
import { getServerSession } from "@/entities/user/server";

export default async function Page() {
  const session = await getServerSession();
  if (session.user) redirect(roleHome(session.user.role));
  redirect(session.canRefresh ? "/api/auth/refresh?next=/" : "/login");
}
