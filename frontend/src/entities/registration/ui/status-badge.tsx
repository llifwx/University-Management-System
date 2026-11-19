import { Check, Clock, Slash, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/shared/ui/badge";

const STATUS_ICON = { Enrolled: Check, Pending: Clock, Rejected: X, Cancelled: Slash } as const;
const STATUS_LABEL_KEY = {
  Enrolled: "status.enrolled",
  Pending: "status.pending",
  Rejected: "status.rejected",
  Cancelled: "status.cancelled",
} as const;

/** Icon plus text, so status is never carried by colour alone. */
export function RegistrationStatusBadge({ status }: { status: string }) {
  const t = useTranslations("entities.registration");
  const Icon = STATUS_ICON[status as keyof typeof STATUS_ICON];
  const labelKey = STATUS_LABEL_KEY[status as keyof typeof STATUS_LABEL_KEY];
  return (
    <Badge variant={status === "Enrolled" ? "default" : "secondary"} className="gap-1">
      {Icon && <Icon className="size-3" aria-hidden />}
      {labelKey ? t(labelKey) : status}
    </Badge>
  );
}
