"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Student, studentQueries } from "@/entities/student";
import { userQueries } from "@/entities/user";
import { applyFieldErrors, getErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { createStudent, updateStudent } from "../api/student-mutations";

const baseSchema = z.object({
  email: z.email("Enter a valid email address.").max(150, "Use at most 150 characters."),
  full_name: z.string().trim().min(1, "Enter the full name.").max(100, "Use at most 100 characters."),
  program: z.string().trim().max(80, "Use at most 80 characters."),
  year_level: z.number("Enter the year level.").int("Use a whole number.").min(1, "Year must be between 1 and 8.").max(8, "Year must be between 1 and 8."),
});
const THIS_YEAR = new Date().getFullYear();
const createSchema = baseSchema.extend({
  password: z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters."),
  enrollment_year: z.number("Enter the enrollment year.").int("Use a whole number.").min(2000, "Use a year from 2000.").max(THIS_YEAR + 1, `Use a year up to ${THIS_YEAR + 1}.`),
});
type Values = z.infer<typeof createSchema>;

const MESSAGES = { INTEGRITY_CONFLICT: "This email address is already in use." };

export function StudentForm({ student, onDone }: { student?: Student; onDone: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(student ? baseSchema : createSchema) as never,
    defaultValues: student
      ? { email: student.email, full_name: student.full_name, program: student.program ?? "", year_level: student.year_level }
      : { email: "", full_name: "", program: "", password: "", enrollment_year: THIS_YEAR },
  });
  const mutation = useMutation({
    mutationFn: ({ password, enrollment_year, ...values }: Values) => {
      const profile = { ...values, program: values.program || null };
      return student ? updateStudent(student.student_id, profile) : createStudent({ ...profile, password, enrollment_year });
    },
    onSuccess: async () => {
      toast.success(student ? "Student updated." : "Student created.");
      // The list's account status comes from /users, which gains a row when a student is created.
      await Promise.all([studentQueries.all, userQueries.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="full_name" label="Full name" error={errors.full_name?.message}>
        <Input {...fieldProps("full_name", errors.full_name?.message)} {...register("full_name")} />
      </FormField>
      <FormField id="student_email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="off" {...fieldProps("student_email", errors.email?.message)} {...register("email")} />
      </FormField>
      {!student && (
        <FormField id="student_password" label="Initial password" hint="At least 12 characters." error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...fieldProps("student_password", errors.password?.message)} {...register("password")} />
        </FormField>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="program" label="Program (optional)" error={errors.program?.message}>
          <Input {...fieldProps("program", errors.program?.message)} {...register("program")} />
        </FormField>
        <FormField id="year_level" label="Year level" error={errors.year_level?.message}>
          <Input type="number" min={1} max={8} {...fieldProps("year_level", errors.year_level?.message)} {...register("year_level", { valueAsNumber: true })} />
        </FormField>
      </div>
      {student ? (
        <p className="text-muted-foreground text-sm">
          Student ID <span className="text-foreground font-mono">{student.student_number}</span> is permanent.
        </p>
      ) : (
        <FormField id="enrollment_year" label="Enrollment year" hint="Its last two digits start the student ID, e.g. 24ID…; the ID cannot be changed later." error={errors.enrollment_year?.message}>
          <Input type="number" min={2000} max={THIS_YEAR + 1} {...fieldProps("enrollment_year", errors.enrollment_year?.message)} {...register("enrollment_year", { valueAsNumber: true })} />
        </FormField>
      )}
      {mutation.isError && <FormError message={getErrorMessage(mutation.error, MESSAGES)} />}
      <FormSubmit isPending={mutation.isPending} label={student ? "Save changes" : "Create student"} />
    </form>
  );
}

export function StudentFormDialog({ student, trigger }: { student?: Student; trigger: ReactNode }) {
  return (
    <FormDialog trigger={trigger} title={student ? `Edit ${student.full_name}` : "Add student"}>
      {(close) => <StudentForm student={student} onDone={close} />}
    </FormDialog>
  );
}
