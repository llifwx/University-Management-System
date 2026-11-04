"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Course, courseQueries } from "@/entities/course";
import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { deleteCourse } from "../api/course-mutations";

export function DeleteCourseButton({ course }: { course: Course }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteCourse(course.course_id),
    onSuccess: async () => {
      toast.success("Course deleted.");
      await queryClient.invalidateQueries({ queryKey: courseQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Delete
        </Button>
      }
      title={`Delete ${course.course_code}?`}
      description="This permanently removes the course. It is refused while sections still reference it."
      confirmLabel="Delete course"
      isPending={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error, { INTEGRITY_CONFLICT: "This course still has sections, so it cannot be deleted." }) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
