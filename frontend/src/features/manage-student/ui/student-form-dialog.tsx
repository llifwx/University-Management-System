"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Student, studentQueries } from "@/entities/student";
import { userQueries } from "@/entities/user";
import { applyFieldErrors, getErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { NativeSelect } from "@/shared/ui/native-select";
import { Switch } from "@/shared/ui/switch";

import { createStudent, updateStudent } from "../api/student-mutations";

const phoneNumber = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[0-9+()\-\s]{6,20}$/.test(value), "Use 6–20 digits, spaces, +, -, or parentheses.");
const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.");

const baseSchema = z.object({
  email: z.email("Enter a valid email address.").max(150, "Use at most 150 characters."),
  last_name: z.string().trim().min(1, "Enter the last name.").max(100, "Use at most 100 characters."),
  first_name: z.string().trim().min(1, "Enter the first name.").max(100, "Use at most 100 characters."),
  patronymic: z.string().trim().max(100, "Use at most 100 characters."),
  program: z.string().trim().max(80, "Use at most 80 characters."),
  year_level: z.number("Enter the year level.").int("Use a whole number.").min(1, "Year must be between 1 and 8.").max(8, "Year must be between 1 and 8."),
  phone_number: phoneNumber,
  personal_email: optionalEmail,
  birth_date: z.string().trim(),
  gender: z.enum(["", "MALE", "FEMALE"]),
  marital_status: z.enum(["", "SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]),
  nationality: z.string().trim().max(80, "Use at most 80 characters."),
  citizenship: z.string().trim().max(80, "Use at most 80 characters."),
  is_resident: z.boolean(),
  needs_dormitory: z.boolean(),
  admission_year: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{4}$/.test(value), "Use the format YYYY-YYYY."),
  advisor: z.string().trim().max(100, "Use at most 100 characters."),
  study_form: z.string().trim().max(80, "Use at most 80 characters."),
  winter_admission: z.enum(["", "true", "false"]),
});
const THIS_YEAR = new Date().getFullYear();
const createSchema = baseSchema.extend({
  password: z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters."),
  enrollment_year: z.number("Enter the enrollment year.").int("Use a whole number.").min(2000, "Use a year from 2000.").max(THIS_YEAR + 1, `Use a year up to ${THIS_YEAR + 1}.`),
});
type Values = z.infer<typeof createSchema>;

const MESSAGES = { INTEGRITY_CONFLICT: "This email address is already in use." };

function emptyToNull(value: string): string | null {
  return value || null;
}

function defaultValuesFor(student?: Student): Omit<Values, "password" | "enrollment_year"> {
  if (!student) {
    return {
      email: "",
      last_name: "",
      first_name: "",
      patronymic: "",
      program: "",
      year_level: 1,
      phone_number: "",
      personal_email: "",
      birth_date: "",
      gender: "",
      marital_status: "",
      nationality: "",
      citizenship: "",
      is_resident: true,
      needs_dormitory: false,
      admission_year: "",
      advisor: "",
      study_form: "",
      winter_admission: "",
    };
  }
  return {
    email: student.email,
    last_name: student.last_name,
    first_name: student.first_name,
    patronymic: student.patronymic ?? "",
    program: student.program ?? "",
    year_level: student.year_level,
    phone_number: student.phone_number ?? "",
    personal_email: student.personal_email ?? "",
    birth_date: student.birth_date ?? "",
    gender: student.gender ?? "",
    marital_status: student.marital_status ?? "",
    nationality: student.nationality ?? "",
    citizenship: student.citizenship ?? "",
    is_resident: student.is_resident,
    needs_dormitory: student.needs_dormitory,
    admission_year: student.admission_year ?? "",
    advisor: student.advisor ?? "",
    study_form: student.study_form ?? "",
    winter_admission: student.winter_admission === null ? "" : student.winter_admission ? "true" : "false",
  };
}

export function StudentForm({ student, onDone }: { student?: Student; onDone: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(student ? baseSchema : createSchema) as never,
    defaultValues: student ? defaultValuesFor(student) : { ...defaultValuesFor(), password: "", enrollment_year: THIS_YEAR },
  });
  const mutation = useMutation({
    // StudentCreate has no phone_number field; it is admin-editable only after the student exists.
    mutationFn: ({ password, enrollment_year, phone_number, patronymic, nationality, citizenship, admission_year, advisor, study_form, birth_date, personal_email, gender, marital_status, winter_admission, ...values }: Values) => {
      const profile = {
        ...values,
        program: values.program || null,
        patronymic: emptyToNull(patronymic),
        nationality: emptyToNull(nationality),
        citizenship: emptyToNull(citizenship),
        admission_year: emptyToNull(admission_year),
        advisor: emptyToNull(advisor),
        study_form: emptyToNull(study_form),
        birth_date: emptyToNull(birth_date),
        personal_email: emptyToNull(personal_email),
        gender: gender || null,
        marital_status: marital_status || null,
        winter_admission: winter_admission === "" ? null : winter_admission === "true",
      };
      return student
        ? updateStudent(student.student_id, { ...profile, phone_number: emptyToNull(phone_number) })
        : createStudent({ ...profile, password, enrollment_year });
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
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="last_name" label="Last name" error={errors.last_name?.message}>
            <Input {...fieldProps("last_name", errors.last_name?.message)} {...register("last_name")} />
          </FormField>
          <FormField id="first_name" label="First name" error={errors.first_name?.message}>
            <Input {...fieldProps("first_name", errors.first_name?.message)} {...register("first_name")} />
          </FormField>
        </div>
        <FormField id="patronymic" label="Patronymic (optional)" error={errors.patronymic?.message}>
          <Input {...fieldProps("patronymic", errors.patronymic?.message)} {...register("patronymic")} />
        </FormField>
        <FormField id="student_email" label="Login email" error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...fieldProps("student_email", errors.email?.message)} {...register("email")} />
        </FormField>
        {!student && (
          <FormField id="student_password" label="Initial password" hint="At least 12 characters." error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...fieldProps("student_password", errors.password?.message)} {...register("password")} />
          </FormField>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Academic record</h3>
        {student ? (
          <p className="text-muted-foreground text-sm">
            Student ID <span className="text-foreground font-mono">{student.student_number}</span> is permanent.
          </p>
        ) : (
          <FormField id="enrollment_year" label="Enrollment year" hint="Its last two digits start the student ID, e.g. 24ID…; the ID cannot be changed later." error={errors.enrollment_year?.message}>
            <Input type="number" min={2000} max={THIS_YEAR + 1} {...fieldProps("enrollment_year", errors.enrollment_year?.message)} {...register("enrollment_year", { valueAsNumber: true })} />
          </FormField>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="program" label="Program (optional)" error={errors.program?.message}>
            <Input {...fieldProps("program", errors.program?.message)} {...register("program")} />
          </FormField>
          <FormField id="year_level" label="Year level" error={errors.year_level?.message}>
            <Input type="number" min={1} max={8} {...fieldProps("year_level", errors.year_level?.message)} {...register("year_level", { valueAsNumber: true })} />
          </FormField>
          <FormField id="admission_year" label="Admission year (optional)" hint="Format: YYYY-YYYY" error={errors.admission_year?.message}>
            <Input placeholder="2024-2025" {...fieldProps("admission_year", errors.admission_year?.message)} {...register("admission_year")} />
          </FormField>
          <FormField id="study_form" label="Study form (optional)" error={errors.study_form?.message}>
            <Input placeholder="Bachelor's (4 years)" {...fieldProps("study_form", errors.study_form?.message)} {...register("study_form")} />
          </FormField>
          <FormField id="advisor" label="Advisor (optional)" error={errors.advisor?.message}>
            <Input {...fieldProps("advisor", errors.advisor?.message)} {...register("advisor")} />
          </FormField>
          <FormField id="winter_admission" label="Winter admission">
            <NativeSelect id="winter_admission" {...register("winter_admission")}>
              <option value="">Not set</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </NativeSelect>
          </FormField>
        </div>
        <Controller
          control={control}
          name="needs_dormitory"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <span className="text-sm">Needs dormitory</span>
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Needs dormitory" />
            </div>
          )}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Personal information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="birth_date" label="Date of birth (optional)" error={errors.birth_date?.message}>
            <Input type="date" {...fieldProps("birth_date", errors.birth_date?.message)} {...register("birth_date")} />
          </FormField>
          <FormField id="gender" label="Gender">
            <NativeSelect id="gender" {...register("gender")}>
              <option value="">Not set</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </NativeSelect>
          </FormField>
          <FormField id="marital_status" label="Marital status">
            <NativeSelect id="marital_status" {...register("marital_status")}>
              <option value="">Not set</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
            </NativeSelect>
          </FormField>
          <FormField id="nationality" label="Nationality (optional)" error={errors.nationality?.message}>
            <Input {...fieldProps("nationality", errors.nationality?.message)} {...register("nationality")} />
          </FormField>
          <FormField id="citizenship" label="Citizenship (optional)" error={errors.citizenship?.message}>
            <Input {...fieldProps("citizenship", errors.citizenship?.message)} {...register("citizenship")} />
          </FormField>
        </div>
        <Controller
          control={control}
          name="is_resident"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <span className="text-sm">Resident</span>
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Resident" />
            </div>
          )}
        />
      </div>

      {student && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Contact details</h3>
          <p className="text-muted-foreground -mt-2 text-xs">The student can also change these themselves.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="personal_email" label="Personal email (optional)" error={errors.personal_email?.message}>
              <Input type="email" {...fieldProps("personal_email", errors.personal_email?.message)} {...register("personal_email")} />
            </FormField>
            <FormField id="phone_number" label="Phone number (optional)" error={errors.phone_number?.message}>
              <Input type="tel" {...fieldProps("phone_number", errors.phone_number?.message)} {...register("phone_number")} />
            </FormField>
          </div>
        </div>
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
