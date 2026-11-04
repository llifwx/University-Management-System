import type { User } from "@/entities/user";
import { apiRequest, components } from "@/shared/api";

export const createStaff = (json: components["schemas"]["StaffCreate"]) => apiRequest<User>("/users", { method: "POST", json });
export const updateStaff = (id: number, json: components["schemas"]["StaffPatch"]) => apiRequest<User>(`/users/${id}`, { method: "PATCH", json });
