"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Section, sectionQueries } from "@/entities/course-section";
import { useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { deleteSection } from "../api/section-mutations";

export function DeleteSectionButton({ section }: { section: Section }) {
  const t = useTranslations("features.manageSection");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteSection(section.section_id),
    onSuccess: async () => {
      toast.success(t("toast.deleted"));
      await queryClient.invalidateQueries({ queryKey: sectionQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("delete.button")}
        </Button>
      }
      title={t("delete.title", { number: section.section_number })}
      description={t("delete.description")}
      confirmLabel={t("delete.confirmLabel")}
      isPending={mutation.isPending}
      error={mutation.isError ? getMessage(mutation.error, { INTEGRITY_CONFLICT: t("delete.errors.integrityConflict") }) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
