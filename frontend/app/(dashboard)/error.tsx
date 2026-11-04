"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";

export default function DashboardError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-20 text-center">
      <AlertCircle className="text-destructive size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">This page could not be loaded</h1>
      <p className="text-muted-foreground text-sm">Please try again. If it keeps happening, the university service may be unavailable.</p>
      <Button onClick={() => retry()} className="mt-2">
        Try again
      </Button>
    </div>
  );
}
