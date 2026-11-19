"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ReactNode, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { Course } from "@/entities/course";
import { Section, sectionQueries } from "@/entities/course-section";
import type { Semester } from "@/entities/semester";
import type { User } from "@/entities/user";
import { applyFieldErrors, useApiErrorMessage } from "@/shared/api";
import { WEEKDAYS, formatTime } from "@/shared/lib/time";
import { Button } from "@/shared/ui/button";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { NativeSelect } from "@/shared/ui/native-select";

import { createSection, updateSection } from "../api/section-mutations";
import { SectionValues, buildSectionSchema } from "../model/section-schema";

export type SectionFormOptions = { courses: Course[]; semesters: Semester[]; teachers: User[] };

const toId = (value: string) => (value ? Number(value) : NaN);
const NEW_MEETING = { meeting_day: 0, start_time: "", end_time: "" };

export function SectionForm({ section, options, onDone }: { section?: Section; options: SectionFormOptions; onDone: () => void }) {
  const t = useTranslations("features.manageSection");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const sectionSchema = useMemo(() => buildSectionSchema(t), [t]);
  const originalMeetings = section?.meetings.map((m) => ({ meeting_day: m.meeting_day, start_time: formatTime(m.start_time), end_time: formatTime(m.end_time) }));
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SectionValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: section
      ? {
          course_id: section.course_id,
          semester_id: section.semester_id,
          section_number: section.section_number,
          capacity: section.capacity,
          teacher_id: section.teacher_id,
          meetings: originalMeetings,
        }
      : { section_number: "", teacher_id: null, meetings: [NEW_MEETING] },
  });
  const meetings = useFieldArray({ control, name: "meetings" });
  const mutation = useMutation({
    mutationFn: (values: SectionValues) => {
      if (!section) return createSection(values);
      // The backend refuses any meeting replacement once students are enrolled, even an identical one.
      const unchanged = JSON.stringify(values.meetings) === JSON.stringify(originalMeetings);
      const { meetings: newMeetings, ...rest } = values;
      return updateSection(section.section_id, unchanged ? rest : { ...rest, meetings: newMeetings });
    },
    onSuccess: async () => {
      toast.success(section ? t("toast.updated") : t("toast.created"));
      await queryClient.invalidateQueries({ queryKey: sectionQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="course_id" label={t("form.courseLabel")} error={errors.course_id?.message}>
        <NativeSelect {...fieldProps("course_id", errors.course_id?.message)} {...register("course_id", { setValueAs: toId })}>
          <option value="">{t("form.chooseCourse")}</option>
          {options.courses.map((course) => (
            <option key={course.course_id} value={course.course_id}>
              {course.course_code} · {course.course_title}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField id="semester_id" label={t("form.semesterLabel")} error={errors.semester_id?.message}>
        <NativeSelect {...fieldProps("semester_id", errors.semester_id?.message)} {...register("semester_id", { setValueAs: toId })}>
          <option value="">{t("form.chooseSemester")}</option>
          {options.semesters.map((semester) => (
            <option key={semester.semester_id} value={semester.semester_id}>
              {semester.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="section_number" label={t("form.sectionNumberLabel")} error={errors.section_number?.message}>
          <Input {...fieldProps("section_number", errors.section_number?.message)} {...register("section_number")} />
        </FormField>
        <FormField id="capacity" label={t("form.capacityLabel")} error={errors.capacity?.message}>
          <Input type="number" min={1} {...fieldProps("capacity", errors.capacity?.message)} {...register("capacity", { valueAsNumber: true })} />
        </FormField>
      </div>
      <FormField id="teacher_id" label={t("form.teacherLabel")} error={errors.teacher_id?.message}>
        <NativeSelect {...fieldProps("teacher_id", errors.teacher_id?.message)} {...register("teacher_id", { setValueAs: (value) => (value ? Number(value) : null) })}>
          <option value="">{t("form.unassigned")}</option>
          {options.teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.full_name ? `${teacher.full_name} (${teacher.email})` : teacher.email}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{t("form.meetingsLegend")}</legend>
        {section && section.enrolled_count > 0 && <p className="text-muted-foreground text-xs">{t("form.meetingsLockedHint")}</p>}
        {meetings.fields.map((field, index) => {
          const rowErrors = errors.meetings?.[index];
          return (
            <div key={field.id} className="grid grid-cols-2 items-start gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <FormField id={`meeting-${index}-day`} label={t("form.dayLabel")}>
                <NativeSelect id={`meeting-${index}-day`} {...register(`meetings.${index}.meeting_day`, { valueAsNumber: true })}>
                  {WEEKDAYS.map((day, dayIndex) => (
                    <option key={day} value={dayIndex}>
                      {day}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField id={`meeting-${index}-start`} label={t("form.startLabel")} error={rowErrors?.start_time?.message}>
                <Input type="time" {...fieldProps(`meeting-${index}-start`, rowErrors?.start_time?.message)} {...register(`meetings.${index}.start_time`)} />
              </FormField>
              <FormField id={`meeting-${index}-end`} label={t("form.endLabel")} error={rowErrors?.end_time?.message}>
                <Input type="time" {...fieldProps(`meeting-${index}-end`, rowErrors?.end_time?.message)} {...register(`meetings.${index}.end_time`)} />
              </FormField>
              <Button type="button" variant="ghost" size="icon" className="self-end" aria-label={t("form.removeMeeting", { index: index + 1 })} disabled={meetings.fields.length === 1} onClick={() => meetings.remove(index)}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          );
        })}
        {errors.meetings?.message && <FormError message={errors.meetings.message} />}
        <Button type="button" variant="outline" size="sm" onClick={() => meetings.append(NEW_MEETING)}>
          <Plus aria-hidden />
          {t("form.addMeeting")}
        </Button>
      </fieldset>

      {mutation.isError && <FormError message={getMessage(mutation.error, { INTEGRITY_CONFLICT: t("errors.duplicateNumber") })} />}
      <FormSubmit isPending={mutation.isPending} label={section ? t("form.saveChanges") : t("form.createSection")} />
    </form>
  );
}

export function SectionFormDialog({ section, options, trigger }: { section?: Section; options: SectionFormOptions; trigger: ReactNode }) {
  const t = useTranslations("features.manageSection");
  return (
    <FormDialog trigger={trigger} title={section ? t("dialog.editTitle", { number: section.section_number }) : t("dialog.addTitle")}>
      {(close) => <SectionForm section={section} options={options} onDone={close} />}
    </FormDialog>
  );
}
