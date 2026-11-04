"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Semester, semesterQueries } from "@/entities/semester";
import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Switch } from "@/shared/ui/switch";

import { deleteSemester, updateSemester } from "../api/semester-mutations";

export function SemesterActiveSwitch({ semester }: { semester: Semester }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (is_active: boolean) => updateSemester(semester.semester_id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: semesterQueries.all }),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return (
    <Switch
      checked={semester.is_active}
      disabled={mutation.isPending}
      onCheckedChange={(checked) => mutation.mutate(checked)}
      aria-label={`${semester.name} open for registration`}
    />
  );
}

export function DeleteSemesterButton({ semester }: { semester: Semester }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteSemester(semester.semester_id),
    onSuccess: async () => {
      toast.success("Semester deleted.");
      await queryClient.invalidateQueries({ queryKey: semesterQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Delete
        </Button>
      }
      title={`Delete ${semester.name}?`}
      description="This permanently removes the semester. It is refused while sections or registrations reference it."
      confirmLabel="Delete semester"
      isPending={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error, { INTEGRITY_CONFLICT: "This semester still has sections or registrations, so it cannot be deleted." }) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
