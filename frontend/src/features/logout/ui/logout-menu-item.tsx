"use client";

import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { NETWORK_ERROR_MESSAGE } from "@/shared/api";
import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";

async function logout() {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error(String(response.status));
    // A full load drops every cached query along with the session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional hard navigation
    window.location.assign("/login");
  } catch {
    toast.error(NETWORK_ERROR_MESSAGE);
  }
}

export function LogoutMenuItem() {
  return (
    <DropdownMenuItem onSelect={logout}>
      <LogOut aria-hidden />
      Sign out
    </DropdownMenuItem>
  );
}
