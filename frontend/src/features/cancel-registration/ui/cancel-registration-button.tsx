"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { sectionQueries } from "@/entities/course-section";
import { registrationQueries } from "@/entities/registration";
import { scheduleQueries } from "@/entities/schedule";
import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { cancelRegistration } from "../api/cancel-registration";

export function CancelRegistrationButton({ registrationId, courseLabel }: { registrationId: number; courseLabel: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => cancelRegistration(registrationId),
    onSuccess: async () => {
      toast.success("Registration cancelled.");
      await Promise.all([registrationQueries.all, sectionQueries.all, scheduleQueries.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          Cancel registration
        </Button>
      }
      title="Cancel this registration?"
      description={`You will leave ${courseLabel} and your seat is released. You can register again later only if seats remain.`}
      confirmLabel="Cancel registration"
      cancelLabel="Keep registration"
      isPending={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
