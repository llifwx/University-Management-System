import { BookOpen, CalendarDays, CalendarRange, ClipboardList, GraduationCap, HelpCircle, Layers, LayoutDashboard, LucideIcon, Shield, User as UserIcon, Users } from "lucide-react";

import type { Role } from "@/entities/user";

export type NavItem = { label: string; href: string; icon: LucideIcon };

const PROFILE: NavItem = { label: "Profile", href: "/profile", icon: UserIcon };
const CATALOG: NavItem = { label: "Course catalog", href: "/courses", icon: BookOpen };

export const NAVIGATION: Record<Role, NavItem[]> = {
  STUDENT: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    CATALOG,
    { label: "My courses", href: "/my-courses", icon: ClipboardList },
    { label: "Schedule", href: "/schedule", icon: CalendarDays },
    PROFILE,
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "Teaching schedule", href: "/teacher/schedule", icon: CalendarDays },
    CATALOG,
    PROFILE,
  ],
  ADMIN: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Students", href: "/admin/students", icon: Users },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Sections", href: "/admin/sections", icon: Layers },
    { label: "Semesters", href: "/admin/semesters", icon: CalendarRange },
    { label: "Registrations", href: "/admin/registrations", icon: ClipboardList },
    { label: "Staff", href: "/admin/staff", icon: Shield },
    { label: "Support chat", href: "/admin/support", icon: HelpCircle },
    PROFILE,
  ],
};

export function isActiveLink(pathname: string, href: string): boolean {
  // Role home links are prefixes of their whole area, so only an exact match counts for them.
  if (href === "/admin" || href === "/teacher" || href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const BRAND_ICON = GraduationCap;
