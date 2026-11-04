"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Section, sectionQueries } from "@/entities/course-section";
import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { deleteSection } from "../api/section-mutations";

export function DeleteSectionButton({ section }: { section: Section }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteSection(section.section_id),
    onSuccess: async () => {
      toast.success("Section deleted.");
      await queryClient.invalidateQueries({ queryKey: sectionQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Delete
        </Button>
      }
      title={`Delete section ${section.section_number}?`}
      description="This permanently removes the section and its meetings. It is refused while registrations reference it."
      confirmLabel="Delete section"
      isPending={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error, { INTEGRITY_CONFLICT: "This section has registration history, so it cannot be deleted." }) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
