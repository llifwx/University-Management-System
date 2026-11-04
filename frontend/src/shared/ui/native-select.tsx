import * as React from "react";

import { cn } from "@/shared/lib/utils";

/** A native <select>: keyboard, screen-reader and mobile-picker behaviour come for free. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "border-input bg-background block h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
