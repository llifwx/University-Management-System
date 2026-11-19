"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { sectionQueries } from "@/entities/course-section";
import { registrationQueries } from "@/entities/registration";
import { scheduleQueries } from "@/entities/schedule";
import { useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { cancelRegistration } from "../api/cancel-registration";

export function CancelRegistrationButton({ registrationId, courseLabel }: { registrationId: number; courseLabel: string }) {
  const t = useTranslations("features.cancelRegistration");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => cancelRegistration(registrationId),
    onSuccess: async () => {
      toast.success(t("toast.success"));
      await Promise.all([registrationQueries.all, sectionQueries.all, scheduleQueries.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          {t("button.label")}
        </Button>
      }
      title={t("dialog.title")}
      description={t("dialog.description", { courseLabel })}
      confirmLabel={t("dialog.confirmLabel")}
      cancelLabel={t("dialog.cancelLabel")}
      isPending={mutation.isPending}
      error={mutation.isError ? getMessage(mutation.error) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
