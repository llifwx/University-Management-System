import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";

export function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <ShieldAlert className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">403: No access</h1>
      <p className="text-muted-foreground max-w-md text-sm">Your account does not have permission to view this page.</p>
      <Button asChild className="mt-2">
        <Link href="/">Go to my dashboard</Link>
      </Button>
    </div>
  );
}
