import type { components } from "@/shared/api";

export type User = components["schemas"]["UserOut"];
export type Role = User["role"];

export function roleHome(role: Role): string {
  return { STUDENT: "/dashboard", TEACHER: "/teacher", ADMIN: "/admin" }[role];
}

export const ROLE_LABELS: Record<Role, string> = { STUDENT: "Student", TEACHER: "Teacher", ADMIN: "Administrator" };
