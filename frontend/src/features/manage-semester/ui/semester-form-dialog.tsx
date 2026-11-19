"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Semester, semesterQueries } from "@/entities/semester";
import { applyFieldErrors, useApiErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { createSemester, updateSemester } from "../api/semester-mutations";

/**
 * Kept as a plain schema (not a translator-driven builder) because it is imported directly by
 * semester-form-dialog.test.ts; the form itself validates with the translated `buildSemesterSchema` below.
 */
export const semesterSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(80, "Use at most 80 characters."),
    start_date: z.iso.date("Choose a start date."),
    end_date: z.iso.date("Choose an end date."),
    is_active: z.boolean(),
  })
  .refine((values) => values.start_date < values.end_date, { path: ["end_date"], message: "The end date must be after the start date." });
type Values = z.infer<typeof semesterSchema>;

function buildSemesterSchema(t: ReturnType<typeof useTranslations>) {
  return z
    .object({
      name: z.string().trim().min(1, t("validation.nameRequired")).max(80, t("validation.nameTooLong")),
      start_date: z.iso.date(t("validation.startDateRequired")),
      end_date: z.iso.date(t("validation.endDateRequired")),
      is_active: z.boolean(),
    })
    .refine((values) => values.start_date < values.end_date, { path: ["end_date"], message: t("validation.endAfterStart") });
}

export function SemesterForm({ semester, onDone }: { semester?: Semester; onDone: () => void }) {
  const t = useTranslations("features.manageSemester");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const schema = useMemo(() => buildSemesterSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: semester ?? { name: "", start_date: "", end_date: "", is_active: true },
  });
  const mutation = useMutation({
    mutationFn: ({ name, start_date, end_date, is_active }: Values) => {
      const json = { name, start_date, end_date, is_active };
      return semester ? updateSemester(semester.semester_id, json) : createSemester(json);
    },
    onSuccess: async () => {
      toast.success(semester ? t("toast.updated") : t("toast.created"));
      await queryClient.invalidateQueries({ queryKey: semesterQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="semester_name" label={t("fields.name")} error={errors.name?.message}>
        <Input {...fieldProps("semester_name", errors.name?.message)} {...register("name")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="start_date" label={t("fields.startDate")} error={errors.start_date?.message}>
          <Input type="date" {...fieldProps("start_date", errors.start_date?.message)} {...register("start_date")} />
        </FormField>
        <FormField id="end_date" label={t("fields.endDate")} error={errors.end_date?.message}>
          <Input type="date" {...fieldProps("end_date", errors.end_date?.message)} {...register("end_date")} />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register("is_active")} />
        {t("fields.openForRegistration")}
      </label>
      {mutation.isError && <FormError message={getMessage(mutation.error, { INTEGRITY_CONFLICT: t("errors.nameInUse") })} />}
      <FormSubmit isPending={mutation.isPending} label={semester ? t("saveChangesLabel") : t("createLabel")} />
    </form>
  );
}

export function SemesterFormDialog({ semester, trigger }: { semester?: Semester; trigger: ReactNode }) {
  const t = useTranslations("features.manageSemester");
  return (
    <FormDialog trigger={trigger} title={semester ? t("editDialogTitle", { name: semester.name }) : t("addDialogTitle")}>
      {(close) => <SemesterForm semester={semester} onDone={close} />}
    </FormDialog>
  );
}
