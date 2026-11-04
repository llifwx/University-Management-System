import type { components } from "@/shared/api";

export type Registration = components["schemas"]["RegistrationOut"];

/** The API types status as a plain string; these are the database check constraint's values. */
export const REGISTRATION_STATUSES = ["Enrolled", "Pending", "Rejected", "Cancelled"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
