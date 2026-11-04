import type { Registration } from "@/entities/registration";
import { apiRequest } from "@/shared/api";

export function cancelRegistration(registrationId: number) {
  return apiRequest<Registration>(`/registrations/${registrationId}`, { method: "DELETE" });
}
