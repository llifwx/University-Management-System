import { useTranslations } from "next-intl";

import { Skeleton } from "@/shared/ui/skeleton";

export default function Loading() {
  const t = useTranslations("common");
  return (
    <div role="status" aria-label={t("loading")} className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
