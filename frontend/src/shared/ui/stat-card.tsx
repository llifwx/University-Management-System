import { LucideIcon } from "lucide-react";

import { Card, CardContent } from "./card";
import { Skeleton } from "./skeleton";

export function StatCard({ label, value, icon: Icon }: { label: string; value: string | number | undefined; icon: LucideIcon }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="bg-accent text-accent-foreground rounded-lg p-2.5">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm">{label}</p>
          {value === undefined ? <Skeleton className="mt-1 h-7 w-16" /> : <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
