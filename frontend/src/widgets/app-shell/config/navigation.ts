import { Award, BookOpen, CalendarDays, CalendarRange, ClipboardCheck, ClipboardList, DoorOpen, FileText, FolderOpen, GraduationCap, HelpCircle, Layers, LayoutDashboard, LucideIcon, MessageCircle, Newspaper, Shield, User as UserIcon, Users } from "lucide-react";

import type { Role } from "@/entities/user";

/** `labelKey` is a key under the `widgets.appShell.nav` message namespace, translated where the item is rendered. */
export type NavItem = { labelKey: string; href: string; icon: LucideIcon };

const PROFILE: NavItem = { labelKey: "profile", href: "/profile", icon: UserIcon };
const CATALOG: NavItem = { labelKey: "courseCatalog", href: "/courses", icon: BookOpen };
const NEWS: NavItem = { labelKey: "news", href: "/news", icon: Newspaper };
const MESSAGES: NavItem = { labelKey: "messages", href: "/messages", icon: MessageCircle };
const MATERIALS: NavItem = { labelKey: "materials", href: "/materials", icon: FolderOpen };

export const NAVIGATION: Record<Role, NavItem[]> = {
  STUDENT: [
    { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
    CATALOG,
    { labelKey: "myCourses", href: "/my-courses", icon: ClipboardList },
    { labelKey: "schedule", href: "/schedule", icon: CalendarDays },
    { labelKey: "attendance", href: "/attendance", icon: ClipboardCheck },
    { labelKey: "attestation", href: "/attestation", icon: Award },
    { labelKey: "transcript", href: "/transcript", icon: FileText },
    MATERIALS,
    MESSAGES,
    NEWS,
    PROFILE,
  ],
  TEACHER: [
    { labelKey: "dashboard", href: "/teacher", icon: LayoutDashboard },
    { labelKey: "teachingSchedule", href: "/teacher/schedule", icon: CalendarDays },
    { labelKey: "attendance", href: "/teacher/attendance", icon: ClipboardCheck },
    CATALOG,
    MATERIALS,
    MESSAGES,
    PROFILE,
  ],
  ADMIN: [
    { labelKey: "overview", href: "/admin", icon: LayoutDashboard },
    { labelKey: "students", href: "/admin/students", icon: Users },
    { labelKey: "courses", href: "/admin/courses", icon: BookOpen },
    { labelKey: "sections", href: "/admin/sections", icon: Layers },
    { labelKey: "semesters", href: "/admin/semesters", icon: CalendarRange },
    { labelKey: "rooms", href: "/admin/rooms", icon: DoorOpen },
    { labelKey: "registrations", href: "/admin/registrations", icon: ClipboardList },
    { labelKey: "staff", href: "/admin/staff", icon: Shield },
    { labelKey: "supportChat", href: "/admin/support", icon: HelpCircle },
    NEWS,
    PROFILE,
  ],
};

export function isActiveLink(pathname: string, href: string): boolean {
  // Role home links are prefixes of their whole area, so only an exact match counts for them.
  if (href === "/admin" || href === "/teacher" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const BRAND_ICON = GraduationCap;
