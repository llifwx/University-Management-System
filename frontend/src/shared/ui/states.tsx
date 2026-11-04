"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { AlertCircle, Inbox, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

import { getErrorMessage } from "@/shared/api";

import { Button } from "./button";
import { Skeleton } from "./skeleton";

export function EmptyState({ title, description, icon: Icon = Inbox, action }: { title: string; description?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      <Icon className="text-muted-foreground size-8" aria-hidden />
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border px-6 py-10 text-center">
      <AlertCircle className="text-destructive size-8" aria-hidden />
      <p className="max-w-md text-sm">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Loading and error branches every data view needs. */
export function QueryState<T>({ query, fallback, children }: { query: UseQueryResult<T>; fallback?: ReactNode; children: (data: T) => ReactNode }) {
  if (query.data !== undefined) return <>{children(query.data)}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <>{fallback ?? <ListSkeleton />}</>;
}
