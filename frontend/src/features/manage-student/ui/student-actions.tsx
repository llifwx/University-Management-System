"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { sectionQueries } from "@/entities/course-section";
import { registrationQueries } from "@/entities/registration";
import { Student, studentQueries } from "@/entities/student";
import { userQueries } from "@/entities/user";
import { useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { deactivateStudent, updateStudent } from "../api/student-mutations";

function useRefreshAffected() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [studentQueries.all, userQueries.all, registrationQueries.all, sectionQueries.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function DeactivateStudentButton({ student }: { student: Student }) {
  const t = useTranslations("features.manageStudent");
  const getMessage = useApiErrorMessage();
  const refresh = useRefreshAffected();
  const mutation = useMutation({
    mutationFn: () => deactivateStudent(student.student_id),
    onSuccess: async () => {
      toast.success(t("toast.deactivated"));
      await refresh();
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("actions.deactivate")}
        </Button>
      }
      title={t("actions.deactivateTitle", { name: student.full_name })}
      description={t("actions.deactivateDescription")}
      confirmLabel={t("actions.deactivateConfirmLabel")}
      isPending={mutation.isPending}
      error={mutation.isError ? getMessage(mutation.error) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}

export function ReactivateStudentButton({ student }: { student: Student }) {
  const t = useTranslations("features.manageStudent");
  const getMessage = useApiErrorMessage();
  const refresh = useRefreshAffected();
  const mutation = useMutation({
    mutationFn: () => updateStudent(student.student_id, { is_active: true }),
    onSuccess: async () => {
      toast.success(t("toast.reactivated"));
      await refresh();
    },
    onError: (error) => toast.error(getMessage(error)),
  });
  return (
    <Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {t("actions.reactivate")}
    </Button>
  );
}
