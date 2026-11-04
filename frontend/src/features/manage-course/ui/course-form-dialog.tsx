"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Course, courseQueries } from "@/entities/course";
import { applyFieldErrors, getErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import { createCourse, updateCourse } from "../api/course-mutations";

export const courseSchema = z.object({
  course_code: z.string().trim().min(1, "Enter a course code.").max(30, "Use at most 30 characters."),
  course_title: z.string().trim().min(1, "Enter a title.").max(200, "Use at most 200 characters."),
  description: z.string(),
  credits: z.number("Enter the credits.").int("Use a whole number.").min(1, "Credits must be between 1 and 30.").max(30, "Credits must be between 1 and 30."),
});
type Values = z.infer<typeof courseSchema>;

const MESSAGES = { INTEGRITY_CONFLICT: "A course with this code already exists." };

export function CourseForm({ course, onDone }: { course?: Course; onDone: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(courseSchema),
    defaultValues: course
      ? { course_code: course.course_code, course_title: course.course_title, description: course.description ?? "", credits: course.credits }
      : { course_code: "", course_title: "", description: "" },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => {
      const json = { ...values, description: values.description.trim() || null };
      return course ? updateCourse(course.course_id, json) : createCourse(json);
    },
    onSuccess: async () => {
      toast.success(course ? "Course updated." : "Course created.");
      await queryClient.invalidateQueries({ queryKey: courseQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="course_code" label="Course code" error={errors.course_code?.message}>
        <Input {...fieldProps("course_code", errors.course_code?.message)} {...register("course_code")} />
      </FormField>
      <FormField id="course_title" label="Title" error={errors.course_title?.message}>
        <Input {...fieldProps("course_title", errors.course_title?.message)} {...register("course_title")} />
      </FormField>
      <FormField id="credits" label="Credits" error={errors.credits?.message}>
        <Input type="number" min={1} max={30} {...fieldProps("credits", errors.credits?.message)} {...register("credits", { valueAsNumber: true })} />
      </FormField>
      <FormField id="description" label="Description (optional)" error={errors.description?.message}>
        <Textarea {...fieldProps("description", errors.description?.message)} {...register("description")} />
      </FormField>
      {mutation.isError && <FormError message={getErrorMessage(mutation.error, MESSAGES)} />}
      <FormSubmit isPending={mutation.isPending} label={course ? "Save changes" : "Create course"} />
    </form>
  );
}

export function CourseFormDialog({ course, trigger }: { course?: Course; trigger: ReactNode }) {
  return (
    <FormDialog trigger={trigger} title={course ? `Edit ${course.course_code}` : "Add course"}>
      {(close) => <CourseForm course={course} onDone={close} />}
    </FormDialog>
  );
}
