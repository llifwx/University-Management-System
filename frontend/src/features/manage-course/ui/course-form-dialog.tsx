"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Course, courseQueries } from "@/entities/course";
import { applyFieldErrors, useApiErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import { createCourse, updateCourse } from "../api/course-mutations";

type Translator = ReturnType<typeof useTranslations>;

function buildSchema(t: Translator) {
  return z.object({
    course_code: z.string().trim().min(1, t("validation.codeRequired")).max(30, t("validation.codeMax")),
    course_title: z.string().trim().min(1, t("validation.titleRequired")).max(200, t("validation.titleMax")),
    description: z.string(),
    credits: z.number(t("validation.creditsRequired")).int(t("validation.creditsInt")).min(1, t("validation.creditsRange")).max(30, t("validation.creditsRange")),
    ects: z.number().int(t("validation.ectsInt")).min(1, t("validation.ectsRange")).max(60, t("validation.ectsRange")).nullable(),
  });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

export function CourseForm({ course, onDone }: { course?: Course; onDone: () => void }) {
  const t = useTranslations("features.manageCourse");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const courseSchema = useMemo(() => buildSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(courseSchema),
    defaultValues: course
      ? { course_code: course.course_code, course_title: course.course_title, description: course.description ?? "", credits: course.credits, ects: course.ects ?? null }
      : { course_code: "", course_title: "", description: "", ects: null },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const json = { ...values, description: values.description.trim() || null };
      return course ? updateCourse(course.course_id, json) : createCourse(json);
    },
    onSuccess: async () => {
      toast.success(course ? t("toast.updated") : t("toast.created"));
      await queryClient.invalidateQueries({ queryKey: courseQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="course_code" label={t("form.codeLabel")} error={errors.course_code?.message}>
        <Input {...fieldProps("course_code", errors.course_code?.message)} {...register("course_code")} />
      </FormField>
      <FormField id="course_title" label={t("form.titleLabel")} error={errors.course_title?.message}>
        <Input {...fieldProps("course_title", errors.course_title?.message)} {...register("course_title")} />
      </FormField>
      <FormField id="credits" label={t("form.creditsLabel")} error={errors.credits?.message}>
        <Input type="number" min={1} max={30} {...fieldProps("credits", errors.credits?.message)} {...register("credits", { valueAsNumber: true })} />
      </FormField>
      <FormField id="ects" label={t("form.ectsLabel")} error={errors.ects?.message}>
        <Input
          type="number"
          min={1}
          max={60}
          {...fieldProps("ects", errors.ects?.message)}
          {...register("ects", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
        />
      </FormField>
      <FormField id="description" label={t("form.descriptionLabel")} error={errors.description?.message}>
        <Textarea {...fieldProps("description", errors.description?.message)} {...register("description")} />
      </FormField>
      {mutation.isError && <FormError message={getMessage(mutation.error, { INTEGRITY_CONFLICT: t("errors.duplicateCode") })} />}
      <FormSubmit isPending={mutation.isPending} label={course ? t("form.saveChanges") : t("form.createCourse")} />
    </form>
  );
}

export function CourseFormDialog({ course, trigger }: { course?: Course; trigger: ReactNode }) {
  const t = useTranslations("features.manageCourse");
  return (
    <FormDialog trigger={trigger} title={course ? t("dialog.editTitle", { code: course.course_code }) : t("dialog.addTitle")}>
      {(close) => <CourseForm course={course} onDone={close} />}
    </FormDialog>
  );
}
