import { Check, Clock, Slash, X } from "lucide-react";

import { Badge } from "@/shared/ui/badge";

const STATUS_ICON = { Enrolled: Check, Pending: Clock, Rejected: X, Cancelled: Slash } as const;

/** Icon plus text, so status is never carried by colour alone. */
export function RegistrationStatusBadge({ status }: { status: string }) {
  const Icon = STATUS_ICON[status as keyof typeof STATUS_ICON];
  return (
    <Badge variant={status === "Enrolled" ? "default" : "secondary"} className="gap-1">
      {Icon && <Icon className="size-3" aria-hidden />}
      {status}
    </Badge>
  );
}
