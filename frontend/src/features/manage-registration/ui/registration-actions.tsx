"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { sectionQueries } from "@/entities/course-section";
import { adminRegistrationErrorMessages, Registration, registrationQueries } from "@/entities/registration";
import { scheduleQueries } from "@/entities/schedule";
import { useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { NativeSelect } from "@/shared/ui/native-select";

import { changeRegistrationStatus, enrollStudent } from "../api/registration-mutations";

function useRefreshAffected() {
  const queryClient = useQueryClient();
  return () => Promise.all([registrationQueries.all, sectionQueries.all, scheduleQueries.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

const ADMIN_STATUSES = ["Pending", "Rejected", "Cancelled"] as const;
type AdminStatus = (typeof ADMIN_STATUSES)[number];

/** The status PATCH only reaches non-enrolled states; entering Enrolled must pass enrollment validation. */
export function RegistrationActions({ registration }: { registration: Registration }) {
  const t = useTranslations("features.manageRegistration");
  const tErrors = useTranslations("entities.registration.errors");
  const getMessage = useApiErrorMessage();
  const byCode = adminRegistrationErrorMessages(tErrors);
  const statusLabel: Record<AdminStatus, string> = {
    Pending: t("status.pending"),
    Rejected: t("status.rejected"),
    Cancelled: t("status.cancelled"),
  };
  const refresh = useRefreshAffected();
  const statusMutation = useMutation({
    mutationFn: (status: AdminStatus) => changeRegistrationStatus(registration.registration_id, status),
    onSuccess: () => toast.success(t("toast.statusUpdated")),
    onError: (error) => toast.error(getMessage(error)),
    onSettled: refresh,
  });
  const enrollMutation = useMutation({
    mutationFn: () => enrollStudent({ student_id: registration.student_id, section_id: registration.section_id, semester_id: registration.semester_id }),
    onSuccess: () => toast.success(t("toast.enrolled")),
    onError: (error) => toast.error(getMessage(error, byCode)),
    onSettled: refresh,
  });
  const busy = statusMutation.isPending || enrollMutation.isPending;

  return (
    <div className="flex items-center justify-end gap-2 md:justify-start">
      <NativeSelect
        aria-label={t("statusAriaLabel", { id: registration.registration_id })}
        className="h-8 w-32 text-xs"
        disabled={busy}
        value=""
        onChange={(event) => statusMutation.mutate(event.target.value as AdminStatus)}
      >
        <option value="" disabled>
          {t("setStatusPlaceholder")}
        </option>
        {ADMIN_STATUSES.filter((status) => status !== registration.status).map((status) => (
          <option key={status} value={status}>
            {statusLabel[status]}
          </option>
        ))}
      </NativeSelect>
      {registration.status !== "Enrolled" && (
        <Button variant="outline" size="sm" disabled={busy} onClick={() => enrollMutation.mutate()}>
          {t("enrollButton")}
        </Button>
      )}
    </div>
  );
}
