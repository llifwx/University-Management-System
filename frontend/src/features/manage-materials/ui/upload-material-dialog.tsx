"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FormEvent, ReactNode, useMemo } from "react";
import { toast } from "sonner";

import { courseQueries } from "@/entities/course";
import { sectionQueries } from "@/entities/course-section";
import { MATERIAL_CATEGORIES, materialQueries } from "@/entities/materials";
import { useApiErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { NativeSelect } from "@/shared/ui/native-select";
import { Textarea } from "@/shared/ui/textarea";

import { uploadMaterial } from "../api/material-mutations";

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,image/*";

function UploadMaterialForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("features.manageMaterials");
  const tCategory = useTranslations("pages.materials.categories");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const sections = useQuery(sectionQueries.assigned());
  const courses = useQuery(courseQueries.list());
  const sectionOptions = useMemo(() => {
    const courseById = new Map(courses.data?.map((course) => [course.course_id, course]));
    return (sections.data ?? []).map((section) => {
      const course = courseById.get(section.course_id);
      const name = course ? `${course.course_code} — ${course.course_title}` : "";
      return { id: section.section_id, label: `${name} (${section.section_number})` };
    });
  }, [sections.data, courses.data]);

  const mutation = useMutation({
    mutationFn: uploadMaterial,
    onSuccess: async () => {
      toast.success(t("toast.uploaded"));
      await queryClient.invalidateQueries({ queryKey: materialQueries.all });
      onDone();
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(new FormData(event.currentTarget));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField id="material-section" label={t("fields.section")}>
        <NativeSelect id="material-section" name="section_id" required defaultValue="">
          <option value="" disabled>
            {t("fields.chooseSection")}
          </option>
          {sectionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="material-category" label={t("fields.category")}>
        <NativeSelect id="material-category" name="category" required defaultValue="other">
          {MATERIAL_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {tCategory(category)}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="material-title" label={t("fields.title")}>
        <Input id="material-title" name="title" required maxLength={200} />
      </FormField>
      <FormField id="material-description" label={t("fields.description")} hint={t("fields.descriptionHint")}>
        <Textarea id="material-description" name="description" maxLength={2000} rows={3} />
      </FormField>
      <FormField id="material-file" label={t("fields.file")}>
        <Input id="material-file" name="file" type="file" accept={ACCEPT} required />
      </FormField>
      {mutation.isError && <FormError message={getMessage(mutation.error)} />}
      <FormSubmit isPending={mutation.isPending} label={t("upload")} />
    </form>
  );
}

export function UploadMaterialDialog({ trigger }: { trigger: ReactNode }) {
  const t = useTranslations("features.manageMaterials");
  return (
    <FormDialog trigger={trigger} title={t("dialogTitle")}>
      {(close) => <UploadMaterialForm onDone={close} />}
    </FormDialog>
  );
}
