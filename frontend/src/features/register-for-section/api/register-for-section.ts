import type { Registration } from "@/entities/registration";
import { apiRequest } from "@/shared/api";

export function registerForSection(input: { section_id: number; semester_id: number }) {
  return apiRequest<Registration>("/registrations", { method: "POST", json: input });
}
