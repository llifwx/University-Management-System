"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { sectionQueries } from "@/entities/course-section";
import { REGISTRATION_ERROR_MESSAGES, registrationQueries } from "@/entities/registration";
import { scheduleQueries } from "@/entities/schedule";
import { ApiError, getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { FormError } from "@/shared/ui/form-field";

import { registerForSection } from "../api/register-for-section";

export function RegisterButton({ sectionId, semesterId, disabled, label = "Register" }: { sectionId: number; semesterId: number; disabled?: boolean; label?: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => registerForSection({ section_id: sectionId, semester_id: semesterId }),
    onSuccess: () => toast.success("You are registered for this section."),
    // The refetch below replaces this button with an "Enrolled" badge, unmounting the inline message.
    onError: (error) => {
      if (error instanceof ApiError && error.code === "DUPLICATE_REGISTRATION") toast.error(REGISTRATION_ERROR_MESSAGES[error.code]);
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
        {mutation.isPending ? "Registering…" : label}
      </Button>
      {mutation.isError && <FormError message={getErrorMessage(mutation.error, REGISTRATION_ERROR_MESSAGES)} />}
    </div>
  );
}
