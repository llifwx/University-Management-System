"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Section, sectionQueries } from "@/entities/course-section";
import { adminRegistrationErrorMessages, registrationQueries } from "@/entities/registration";
import { scheduleQueries } from "@/entities/schedule";
import type { Student } from "@/entities/student";
import { useApiErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { NativeSelect } from "@/shared/ui/native-select";

import { enrollStudent } from "../api/registration-mutations";

function buildSchema(t: ReturnType<typeof useTranslations>) {
  return z.object({
    student_id: z.number(t("validation.chooseStudent")).positive(t("validation.chooseStudent")),
    section_id: z.number(t("validation.chooseSection")).positive(t("validation.chooseSection")),
  });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;
const toId = (value: string) => (value ? Number(value) : NaN);

export type EnrollOptions = { students: Student[]; sections: Section[]; sectionLabel: (section: Section) => string };

function EnrollForm({ options, onDone }: { options: EnrollOptions; onDone: () => void }) {
  const t = useTranslations("features.manageRegistration");
  const queryClient = useQueryClient();
  const getMessage = useApiErrorMessage();
  const tErrors = useTranslations("entities.registration.errors");
  const byCode = adminRegistrationErrorMessages(tErrors);
  const schema = useMemo(() => buildSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: ({ student_id, section_id }: Values) => {
      const section = options.sections.find((s) => s.section_id === section_id);
      return enrollStudent({ student_id, section_id, semester_id: section!.semester_id });
    },
    onSuccess: () => {
      toast.success(t("toast.enrolled"));
      onDone();
    },
    onSettled: () => Promise.all([registrationQueries.all, sectionQueries.all, scheduleQueries.all].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="enroll_student" label={t("form.studentLabel")} error={errors.student_id?.message}>
        <NativeSelect {...fieldProps("enroll_student", errors.student_id?.message)} {...register("student_id", { setValueAs: toId })}>
          <option value="">{t("form.chooseStudent")}</option>
          {options.students.map((student) => (
            <option key={student.student_id} value={student.student_id}>
              {student.full_name} ({student.email})
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="enroll_section" label={t("form.sectionLabel")} error={errors.section_id?.message}>
        <NativeSelect {...fieldProps("enroll_section", errors.section_id?.message)} {...register("section_id", { setValueAs: toId })}>
          <option value="">{t("form.chooseSection")}</option>
          {options.sections.map((section) => (
            <option key={section.section_id} value={section.section_id}>
              {options.sectionLabel(section)}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      {mutation.isError && <FormError message={getMessage(mutation.error, byCode)} />}
      <FormSubmit isPending={mutation.isPending} label={t("form.submitLabel")} />
    </form>
  );
}

export function EnrollStudentDialog({ options, trigger }: { options: EnrollOptions; trigger: ReactNode }) {
  const t = useTranslations("features.manageRegistration");
  return (
    <FormDialog trigger={trigger} title={t("dialog.title")} description={t("dialog.description")}>
      {(close) => <EnrollForm options={options} onDone={close} />}
    </FormDialog>
  );
}
