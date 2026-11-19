"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ReactNode, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Student, studentQueries } from "@/entities/student";
import { userQueries } from "@/entities/user";
import { applyFieldErrors, useApiErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { NativeSelect } from "@/shared/ui/native-select";
import { Switch } from "@/shared/ui/switch";

import { createStudent, updateStudent } from "../api/student-mutations";

type Translator = ReturnType<typeof useTranslations>;

const THIS_YEAR = new Date().getFullYear();

function buildBaseSchema(t: Translator) {
  const phoneNumber = z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9+()\-\s]{6,20}$/.test(value), t("validation.phoneFormat"));
  const optionalEmail = z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, t("validation.emailInvalid"));

  return z.object({
    email: z.email(t("validation.emailInvalid")).max(150, t("validation.emailMax")),
    last_name: z.string().trim().min(1, t("validation.lastNameRequired")).max(100, t("validation.maxLength100")),
    first_name: z.string().trim().min(1, t("validation.firstNameRequired")).max(100, t("validation.maxLength100")),
    patronymic: z.string().trim().max(100, t("validation.maxLength100")),
    program: z.string().trim().max(80, t("validation.maxLength80")),
    year_level: z.number(t("validation.yearLevelRequired")).int(t("validation.wholeNumber")).min(1, t("validation.yearLevelRange")).max(8, t("validation.yearLevelRange")),
    phone_number: phoneNumber,
    personal_email: optionalEmail,
    birth_date: z.string().trim(),
    gender: z.enum(["", "MALE", "FEMALE"]),
    marital_status: z.enum(["", "SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]),
    nationality: z.string().trim().max(80, t("validation.maxLength80")),
    citizenship: z.string().trim().max(80, t("validation.maxLength80")),
    is_resident: z.boolean(),
    needs_dormitory: z.boolean(),
    admission_year: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{4}-\d{4}$/.test(value), t("validation.admissionYearFormat")),
    advisor: z.string().trim().max(100, t("validation.maxLength100")),
    study_form: z.string().trim().max(80, t("validation.maxLength80")),
    winter_admission: z.enum(["", "true", "false"]),
  });
}

function buildCreateSchema(t: Translator) {
  return buildBaseSchema(t).extend({
    password: z.string().min(12, t("validation.passwordMin")).max(128, t("validation.passwordMax")),
    enrollment_year: z
      .number(t("validation.enrollmentYearRequired"))
      .int(t("validation.wholeNumber"))
      .min(2000, t("validation.enrollmentYearMin"))
      .max(THIS_YEAR + 1, t("validation.enrollmentYearMax", { max: THIS_YEAR + 1 })),
  });
}
type Values = z.infer<ReturnType<typeof buildCreateSchema>>;

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
  const t = useTranslations("features.manageStudent");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const baseSchema = useMemo(() => buildBaseSchema(t), [t]);
  const createSchema = useMemo(() => buildCreateSchema(t), [t]);
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
      toast.success(student ? t("toast.updated") : t("toast.created"));
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
          <FormField id="last_name" label={t("form.lastNameLabel")} error={errors.last_name?.message}>
            <Input {...fieldProps("last_name", errors.last_name?.message)} {...register("last_name")} />
          </FormField>
          <FormField id="first_name" label={t("form.firstNameLabel")} error={errors.first_name?.message}>
            <Input {...fieldProps("first_name", errors.first_name?.message)} {...register("first_name")} />
          </FormField>
        </div>
        <FormField id="patronymic" label={t("form.patronymicLabel")} error={errors.patronymic?.message}>
          <Input {...fieldProps("patronymic", errors.patronymic?.message)} {...register("patronymic")} />
        </FormField>
        <FormField id="student_email" label={t("form.loginEmailLabel")} error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...fieldProps("student_email", errors.email?.message)} {...register("email")} />
        </FormField>
        {!student && (
          <FormField id="student_password" label={t("form.initialPasswordLabel")} hint={t("form.initialPasswordHint")} error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...fieldProps("student_password", errors.password?.message)} {...register("password")} />
          </FormField>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t("form.academicRecordHeading")}</h3>
        {student ? (
          <p className="text-muted-foreground text-sm">
            {t("form.studentIdPrefix")} <span className="text-foreground font-mono">{student.student_number}</span> {t("form.studentIdSuffix")}
          </p>
        ) : (
          <FormField id="enrollment_year" label={t("form.enrollmentYearLabel")} hint={t("form.enrollmentYearHint")} error={errors.enrollment_year?.message}>
            <Input type="number" min={2000} max={THIS_YEAR + 1} {...fieldProps("enrollment_year", errors.enrollment_year?.message)} {...register("enrollment_year", { valueAsNumber: true })} />
          </FormField>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="program" label={t("form.programLabel")} error={errors.program?.message}>
            <Input {...fieldProps("program", errors.program?.message)} {...register("program")} />
          </FormField>
          <FormField id="year_level" label={t("form.yearLevelLabel")} error={errors.year_level?.message}>
            <Input type="number" min={1} max={8} {...fieldProps("year_level", errors.year_level?.message)} {...register("year_level", { valueAsNumber: true })} />
          </FormField>
          <FormField id="admission_year" label={t("form.admissionYearLabel")} hint={t("form.admissionYearHint")} error={errors.admission_year?.message}>
            <Input placeholder="2024-2025" {...fieldProps("admission_year", errors.admission_year?.message)} {...register("admission_year")} />
          </FormField>
          <FormField id="study_form" label={t("form.studyFormLabel")} error={errors.study_form?.message}>
            <Input placeholder={t("form.studyFormPlaceholder")} {...fieldProps("study_form", errors.study_form?.message)} {...register("study_form")} />
          </FormField>
          <FormField id="advisor" label={t("form.advisorLabel")} error={errors.advisor?.message}>
            <Input {...fieldProps("advisor", errors.advisor?.message)} {...register("advisor")} />
          </FormField>
          <FormField id="winter_admission" label={t("form.winterAdmissionLabel")}>
            <NativeSelect id="winter_admission" {...register("winter_admission")}>
              <option value="">{t("form.notSet")}</option>
              <option value="true">{t("form.yes")}</option>
              <option value="false">{t("form.no")}</option>
            </NativeSelect>
          </FormField>
        </div>
        <Controller
          control={control}
          name="needs_dormitory"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <span className="text-sm">{t("form.needsDormitoryLabel")}</span>
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={t("form.needsDormitoryLabel")} />
            </div>
          )}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t("form.personalInfoHeading")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="birth_date" label={t("form.birthDateLabel")} error={errors.birth_date?.message}>
            <Input type="date" {...fieldProps("birth_date", errors.birth_date?.message)} {...register("birth_date")} />
          </FormField>
          <FormField id="gender" label={t("form.genderLabel")}>
            <NativeSelect id="gender" {...register("gender")}>
              <option value="">{t("form.notSet")}</option>
              <option value="MALE">{t("form.male")}</option>
              <option value="FEMALE">{t("form.female")}</option>
            </NativeSelect>
          </FormField>
          <FormField id="marital_status" label={t("form.maritalStatusLabel")}>
            <NativeSelect id="marital_status" {...register("marital_status")}>
              <option value="">{t("form.notSet")}</option>
              <option value="SINGLE">{t("form.single")}</option>
              <option value="MARRIED">{t("form.married")}</option>
              <option value="DIVORCED">{t("form.divorced")}</option>
              <option value="WIDOWED">{t("form.widowed")}</option>
            </NativeSelect>
          </FormField>
          <FormField id="nationality" label={t("form.nationalityLabel")} error={errors.nationality?.message}>
            <Input {...fieldProps("nationality", errors.nationality?.message)} {...register("nationality")} />
          </FormField>
          <FormField id="citizenship" label={t("form.citizenshipLabel")} error={errors.citizenship?.message}>
            <Input {...fieldProps("citizenship", errors.citizenship?.message)} {...register("citizenship")} />
          </FormField>
        </div>
        <Controller
          control={control}
          name="is_resident"
          render={({ field }) => (
            <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
              <span className="text-sm">{t("form.residentLabel")}</span>
              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={t("form.residentLabel")} />
            </div>
          )}
        />
      </div>

      {student && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">{t("form.contactDetailsHeading")}</h3>
          <p className="text-muted-foreground -mt-2 text-xs">{t("form.contactDetailsHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="personal_email" label={t("form.personalEmailLabel")} error={errors.personal_email?.message}>
              <Input type="email" {...fieldProps("personal_email", errors.personal_email?.message)} {...register("personal_email")} />
            </FormField>
            <FormField id="phone_number" label={t("form.phoneNumberLabel")} error={errors.phone_number?.message}>
              <Input type="tel" {...fieldProps("phone_number", errors.phone_number?.message)} {...register("phone_number")} />
            </FormField>
          </div>
        </div>
      )}

      {mutation.isError && <FormError message={getMessage(mutation.error, { INTEGRITY_CONFLICT: t("errors.duplicateEmail") })} />}
      <FormSubmit isPending={mutation.isPending} label={student ? t("form.saveChanges") : t("form.createStudent")} />
    </form>
  );
}

export function StudentFormDialog({ student, trigger }: { student?: Student; trigger: ReactNode }) {
  const t = useTranslations("features.manageStudent");
  return (
    <FormDialog trigger={trigger} title={student ? t("dialog.editTitle", { name: student.full_name }) : t("dialog.addTitle")}>
      {(close) => <StudentForm student={student} onDone={close} />}
    </FormDialog>
  );
}
