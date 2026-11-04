"use client";

import { ReactNode, useState } from "react";

import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";

/** Children mount on open, so each opening starts from a fresh form. */
export function FormDialog({ trigger, title, description, children }: { trigger: ReactNode; title: string; description?: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Radix warns without a description, so an empty one stays for screen readers. */}
          <DialogDescription className={description ? undefined : "sr-only"}>{description ?? title}</DialogDescription>
        </DialogHeader>
        {children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

export function FormSubmit({ isPending, label }: { isPending: boolean; label: string }) {
  return (
    <DialogFooter>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : label}
      </Button>
    </DialogFooter>
  );
}
