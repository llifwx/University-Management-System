"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Semester, semesterQueries } from "@/entities/semester";
import { applyFieldErrors, getErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { createSemester, updateSemester } from "../api/semester-mutations";

export const semesterSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(80, "Use at most 80 characters."),
    start_date: z.iso.date("Choose a start date."),
    end_date: z.iso.date("Choose an end date."),
    is_active: z.boolean(),
  })
  .refine((values) => values.start_date < values.end_date, { path: ["end_date"], message: "The end date must be after the start date." });
type Values = z.infer<typeof semesterSchema>;

const MESSAGES = { INTEGRITY_CONFLICT: "A semester with this name already exists." };

export function SemesterForm({ semester, onDone }: { semester?: Semester; onDone: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(semesterSchema),
    defaultValues: semester ?? { name: "", start_date: "", end_date: "", is_active: true },
  });
  const mutation = useMutation({
    mutationFn: ({ name, start_date, end_date, is_active }: Values) => {
      const json = { name, start_date, end_date, is_active };
      return semester ? updateSemester(semester.semester_id, json) : createSemester(json);
    },
    onSuccess: async () => {
      toast.success(semester ? "Semester updated." : "Semester created.");
      await queryClient.invalidateQueries({ queryKey: semesterQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="semester_name" label="Name" error={errors.name?.message}>
        <Input {...fieldProps("semester_name", errors.name?.message)} {...register("name")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="start_date" label="Start date" error={errors.start_date?.message}>
          <Input type="date" {...fieldProps("start_date", errors.start_date?.message)} {...register("start_date")} />
        </FormField>
        <FormField id="end_date" label="End date" error={errors.end_date?.message}>
          <Input type="date" {...fieldProps("end_date", errors.end_date?.message)} {...register("end_date")} />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register("is_active")} />
        Open for registration
      </label>
      {mutation.isError && <FormError message={getErrorMessage(mutation.error, MESSAGES)} />}
      <FormSubmit isPending={mutation.isPending} label={semester ? "Save changes" : "Create semester"} />
    </form>
  );
}

export function SemesterFormDialog({ semester, trigger }: { semester?: Semester; trigger: ReactNode }) {
  return (
    <FormDialog trigger={trigger} title={semester ? `Edit ${semester.name}` : "Add semester"}>
      {(close) => <SemesterForm semester={semester} onDone={close} />}
    </FormDialog>
  );
}
