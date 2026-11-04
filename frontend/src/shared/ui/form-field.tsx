import { ReactNode } from "react";

import { Label } from "./label";

/** Label and error message; the error id matches `aria-describedby` from `fieldProps`. */
export function FormField({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function fieldProps(id: string, error?: string) {
  return { id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined };
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
      {message}
    </p>
  );
}
