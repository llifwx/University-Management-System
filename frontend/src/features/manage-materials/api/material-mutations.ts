import { apiRequest, apiUpload } from "@/shared/api";
import type { Material } from "@/entities/materials";

export function uploadMaterial(form: FormData): Promise<Material> {
  const file = form.get("file");
  const fields: Record<string, string> = {
    section_id: String(form.get("section_id")),
    category: String(form.get("category")),
    title: String(form.get("title")),
  };
  const description = form.get("description");
  if (description) fields.description = String(description);
  return apiUpload<Material>("/materials", file instanceof File && file.size > 0 ? file : null, undefined, fields);
}

export function deleteMaterial(materialId: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/materials/${materialId}`, { method: "DELETE" });
}
