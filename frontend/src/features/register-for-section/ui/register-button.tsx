"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { sectionQueries } from "@/entities/course-section";
import { registrationErrorMessages, registrationQueries } from "@/entities/registration";
import { scheduleQueries } from "@/entities/schedule";
import { ApiError, useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { FormError } from "@/shared/ui/form-field";

import { registerForSection } from "../api/register-for-section";

export function RegisterButton({ sectionId, semesterId, disabled, label }: { sectionId: number; semesterId: number; disabled?: boolean; label?: string }) {
  const t = useTranslations("features.registerForSection");
  const queryClient = useQueryClient();
  const getMessage = useApiErrorMessage();
  const tErrors = useTranslations("entities.registration.errors");
  const byCode = registrationErrorMessages(tErrors);
  const mutation = useMutation({
    mutationFn: () => registerForSection({ section_id: sectionId, semester_id: semesterId }),
    onSuccess: () => toast.success(t("toast.success")),
    // The refetch below replaces this button with an "Enrolled" badge, unmounting the inline message.
    onError: (error) => {
      if (error instanceof ApiError && error.code === "DUPLICATE_REGISTRATION") toast.error(byCode.DUPLICATE_REGISTRATION);
    },
    // Also after failures: a "section full" answer means the seat counts on screen are stale.
    onSettled: () =>
      Promise.all(
        [registrationQueries.all, sectionQueries.all, scheduleQueries.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });

  return (
    <div className="space-y-2">
      <Button size="sm" disabled={disabled || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {mutation.isPending ? t("registering") : (label ?? t("defaultLabel"))}
      </Button>
      {mutation.isError && <FormError message={getMessage(mutation.error, byCode)} />}
    </div>
  );
}
