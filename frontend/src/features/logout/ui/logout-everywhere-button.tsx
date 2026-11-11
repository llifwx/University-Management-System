"use client";

import { useMutation } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { NETWORK_ERROR_MESSAGE } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

async function logoutEverywhere() {
  const response = await fetch("/api/auth/logout?scope=all", { method: "POST" });
  if (!response.ok) throw new Error(String(response.status));
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load drops the query cache with the session
  window.location.assign("/login");
}

export function LogoutEverywhereButton() {
  const mutation = useMutation({ mutationFn: logoutEverywhere });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <LogOut />
          Sign out everywhere
        </Button>
      }
      title="Sign out on all devices?"
      description="Every session of this account ends, including this one. You will need to sign in again."
      confirmLabel="Sign out everywhere"
      isPending={mutation.isPending}
      error={mutation.isError ? NETWORK_ERROR_MESSAGE : undefined}
      onConfirm={() => mutation.mutate()}
    />
  );
}
