"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/shared/ui/button";

export default function RootError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4 text-center">
      <AlertCircle className="text-destructive size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">The university service may be unavailable. Please try again.</p>
      <Button onClick={() => retry()} className="mt-2">
        Try again
      </Button>
    </main>
  );
}
