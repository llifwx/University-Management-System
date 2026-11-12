"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronsLeft, ChevronsRight, Menu, Monitor, Moon, Sun, User as UserIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { studentQueries } from "@/entities/student";
import { ROLE_LABELS, User, useSessionUser } from "@/entities/user";
import { LogoutMenuItem } from "@/features/logout";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";

import { BRAND_ICON as Brand, NAVIGATION, isActiveLink } from "../config/navigation";
import { useSidebarStore } from "../model/sidebar-store";

function NavLinks({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const user = useSessionUser();
  const pathname = usePathname() ?? ""; // Nullable only because a root pages/ folder exists.
  return (
    <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-3">
      {NAVIGATION[user.role].map(({ href, label, icon: Icon }) => {
        const active = isActiveLink(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? label : undefined}
            title={collapsed ? label : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {!collapsed && label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", collapsed && "justify-center")}>
      <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-md">
        <Brand className="size-4" aria-hidden />
      </span>
      {!collapsed && <span className="truncate text-sm">University Portal</span>}
    </span>
  );
}

function Sidebar() {
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggleCollapsed = useSidebarStore((state) => state.toggleCollapsed);
  return (
    <aside className={cn("bg-card sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] lg:flex", collapsed ? "w-16" : "w-60")}>
      <div className={cn("flex h-14 items-center border-b px-4", collapsed && "justify-center px-0")}>
        <BrandMark collapsed={collapsed} />
      </div>
      <NavLinks collapsed={collapsed} />
      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight aria-hidden /> : <ChevronsLeft aria-hidden />}
          {!collapsed && "Collapse"}
        </Button>
      </div>
    </aside>
  );
}

function MobileDrawer() {
  const open = useSidebarStore((state) => state.mobileOpen);
  const setOpen = useSidebarStore((state) => state.setMobileOpen);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
        <SheetHeader className="h-14 justify-center border-b px-4 py-0">
          <SheetTitle asChild>
            <div>
              <BrandMark />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation</SheetDescription>
        </SheetHeader>
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

/** Only students currently have a profile photo; the query is reused from the profile page's cache, so an upload there updates this too. */
function UserAvatar({ user }: { user: User }) {
  const student = useQuery({ ...studentQueries.me(), enabled: user.role === "STUDENT" });
  const photoUrl = student.data?.photo_url;
  if (photoUrl) {
    // A cache-busting query param forces the browser to refetch the image instead of reusing the old bytes at the same URL.
    const src = `/api/proxy${photoUrl}?v=${student.dataUpdatedAt}`;
    return (
      <span className="size-7 overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- same-origin BFF-proxied image, not a next/image-managed asset */}
        <img src={src} alt="" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span className="bg-accent text-accent-foreground grid size-7 place-items-center rounded-full">
      <UserIcon className="size-4" aria-hidden />
    </span>
  );
}

function UserMenu() {
  const user = useSessionUser();
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-56" aria-label={`Account menu for ${user.email}`}>
          <UserAvatar user={user} />
          <span className="hidden truncate sm:inline">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.email}</p>
          <p className="text-muted-foreground text-xs">{ROLE_LABELS[user.role]}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon aria-hidden />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 size-4" aria-hidden />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 size-4" aria-hidden />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 size-4" aria-hidden />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <LogoutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen);
  useEffect(() => {
    void useSidebarStore.persist.rehydrate();
  }, []);
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="focus:bg-card sr-only z-50 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:rounded-md focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <Sidebar />
      <MobileDrawer />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-card/95 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu aria-hidden />
          </Button>
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
