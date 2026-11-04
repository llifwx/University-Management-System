import { FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/shared/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-4 text-center">
      <FileQuestion className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">404: Page not found</h1>
      <p className="text-muted-foreground text-sm">This page does not exist or has moved.</p>
      <Button asChild className="mt-2">
        <Link href="/">Go to my dashboard</Link>
      </Button>
    </main>
  );
}
