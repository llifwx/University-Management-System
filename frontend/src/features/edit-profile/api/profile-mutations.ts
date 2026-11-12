import type { Student } from "@/entities/student";
import { apiRequest, apiUpload, components } from "@/shared/api";

export const updateMyContactDetails = (json: components["schemas"]["StudentSelfPatch"]) => apiRequest<Student>("/students/me", { method: "PATCH", json });
export const uploadMyPhoto = (file: File) => apiUpload<Student>("/students/me/photo", file);
