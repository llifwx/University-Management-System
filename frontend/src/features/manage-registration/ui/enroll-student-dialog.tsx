"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Section, sectionQueries } from "@/entities/course-section";
import { ADMIN_REGISTRATION_ERROR_MESSAGES, registrationQueries } from "@/entities/registration";
import { scheduleQueries } from "@/entities/schedule";
import type { Student } from "@/entities/student";
import { getErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { NativeSelect } from "@/shared/ui/native-select";

import { enrollStudent } from "../api/registration-mutations";

const schema = z.object({
  student_id: z.number("Choose a student.").positive("Choose a student."),
  section_id: z.number("Choose a section.").positive("Choose a section."),
});
type Values = z.infer<typeof schema>;
const toId = (value: string) => (value ? Number(value) : NaN);

export type EnrollOptions = { students: Student[]; sections: Section[]; sectionLabel: (section: Section) => string };

function EnrollForm({ options, onDone }: { options: EnrollOptions; onDone: () => void }) {
  const queryClient = useQueryClient();
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
      toast.success("Student enrolled.");
      onDone();
    },
    onSettled: () => Promise.all([registrationQueries.all, sectionQueries.all, scheduleQueries.all].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="enroll_student" label="Student" error={errors.student_id?.message}>
        <NativeSelect {...fieldProps("enroll_student", errors.student_id?.message)} {...register("student_id", { setValueAs: toId })}>
          <option value="">Choose a student</option>
          {options.students.map((student) => (
            <option key={student.student_id} value={student.student_id}>
              {student.full_name} ({student.student_number})
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="enroll_section" label="Section" error={errors.section_id?.message}>
        <NativeSelect {...fieldProps("enroll_section", errors.section_id?.message)} {...register("section_id", { setValueAs: toId })}>
          <option value="">Choose a section</option>
          {options.sections.map((section) => (
            <option key={section.section_id} value={section.section_id}>
              {options.sectionLabel(section)}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      {mutation.isError && <FormError message={getErrorMessage(mutation.error, ADMIN_REGISTRATION_ERROR_MESSAGES)} />}
      <FormSubmit isPending={mutation.isPending} label="Enroll student" />
    </form>
  );
}

export function EnrollStudentDialog({ options, trigger }: { options: EnrollOptions; trigger: ReactNode }) {
  return (
    <FormDialog trigger={trigger} title="Enroll a student" description="Runs the same schedule, capacity and semester checks as a student's own registration.">
      {(close) => <EnrollForm options={options} onDone={close} />}
    </FormDialog>
  );
}
