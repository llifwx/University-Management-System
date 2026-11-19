"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Semester, semesterQueries } from "@/entities/semester";
import { useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Switch } from "@/shared/ui/switch";

import { deleteSemester, updateSemester } from "../api/semester-mutations";

export function SemesterActiveSwitch({ semester }: { semester: Semester }) {
  const t = useTranslations("features.manageSemester");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (is_active: boolean) => updateSemester(semester.semester_id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: semesterQueries.all }),
    onError: (error) => toast.error(getMessage(error)),
  });
  return (
    <Switch
      checked={semester.is_active}
      disabled={mutation.isPending}
      onCheckedChange={(checked) => mutation.mutate(checked)}
      aria-label={t("openAriaLabel", { name: semester.name })}
    />
  );
}

export function DeleteSemesterButton({ semester }: { semester: Semester }) {
  const t = useTranslations("features.manageSemester");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteSemester(semester.semester_id),
    onSuccess: async () => {
      toast.success(t("toast.deleted"));
      await queryClient.invalidateQueries({ queryKey: semesterQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("deleteButton")}
        </Button>
      }
      title={t("deleteConfirmTitle", { name: semester.name })}
      description={t("deleteConfirmDescription")}
      confirmLabel={t("deleteConfirmLabel")}
      isPending={mutation.isPending}
      error={mutation.isError ? getMessage(mutation.error, { INTEGRITY_CONFLICT: t("errors.integrityConflict") }) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
