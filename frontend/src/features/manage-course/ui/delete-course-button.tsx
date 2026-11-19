"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Course, courseQueries } from "@/entities/course";
import { useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { deleteCourse } from "../api/course-mutations";

export function DeleteCourseButton({ course }: { course: Course }) {
  const t = useTranslations("features.manageCourse");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteCourse(course.course_id),
    onSuccess: async () => {
      toast.success(t("toast.deleted"));
      await queryClient.invalidateQueries({ queryKey: courseQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("delete.button")}
        </Button>
      }
      title={t("delete.title", { code: course.course_code })}
      description={t("delete.description")}
      confirmLabel={t("delete.confirmLabel")}
      isPending={mutation.isPending}
      error={mutation.isError ? getMessage(mutation.error, { INTEGRITY_CONFLICT: t("delete.errors.integrityConflict") }) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
