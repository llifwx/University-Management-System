"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { sectionQueries } from "@/entities/course-section";
import { registrationQueries } from "@/entities/registration";
import { Student, studentQueries } from "@/entities/student";
import { userQueries } from "@/entities/user";
import { getErrorMessage } from "@/shared/api";
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
  const refresh = useRefreshAffected();
  const mutation = useMutation({
    mutationFn: () => deactivateStudent(student.student_id),
    onSuccess: async () => {
      toast.success("Student deactivated.");
      await refresh();
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Deactivate
        </Button>
      }
      title={`Deactivate ${student.full_name}?`}
      description="The account can no longer sign in and all of the student's registrations are cancelled. History is retained. Reactivating does not restore the registrations."
      confirmLabel="Deactivate student"
      isPending={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}

export function ReactivateStudentButton({ student }: { student: Student }) {
  const refresh = useRefreshAffected();
  const mutation = useMutation({
    mutationFn: () => updateStudent(student.student_id, { is_active: true }),
    onSuccess: async () => {
      toast.success("Student reactivated.");
      await refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return (
    <Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      Reactivate
    </Button>
  );
}
