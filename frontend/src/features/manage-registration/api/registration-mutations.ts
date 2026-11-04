import type { Registration } from "@/entities/registration";
import { apiRequest, components } from "@/shared/api";

export const enrollStudent = (json: components["schemas"]["AdminRegistrationInput"]) => apiRequest<Registration>("/registrations/admin", { method: "POST", json });
export const changeRegistrationStatus = (id: number, status: "Pending" | "Rejected" | "Cancelled") =>
  apiRequest<Registration>(`/registrations/${id}/status`, { method: "PATCH", json: { status } });
