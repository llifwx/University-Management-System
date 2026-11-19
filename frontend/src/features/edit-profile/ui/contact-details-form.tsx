"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Student, studentQueries } from "@/entities/student";
import { applyFieldErrors, useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { updateMyContactDetails } from "../api/profile-mutations";

type Translator = ReturnType<typeof useTranslations>;

function buildSchema(t: Translator) {
  return z.object({
    phone_number: z
      .string()
      .trim()
      .max(20, t("validation.phoneMax"))
      .refine((value) => value === "" || /^[0-9+()\-\s]{6,20}$/.test(value), t("validation.phoneFormat")),
    personal_email: z
      .string()
      .trim()
      .refine((value) => value === "" || z.email().safeParse(value).success, t("validation.emailInvalid")),
  });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

export function ContactDetailsForm({ student }: { student: Student }) {
  const t = useTranslations("features.editProfile.contactForm");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const schema = useMemo(() => buildSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phone_number: student.phone_number ?? "", personal_email: student.personal_email ?? "" },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      updateMyContactDetails({ phone_number: values.phone_number || null, personal_email: values.personal_email || null }),
    onSuccess: async () => {
      toast.success(t("toast.success"));
      await queryClient.invalidateQueries({ queryKey: studentQueries.all });
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="login_email" label={t("loginEmailLabel")}>
              <Input id="login_email" value={student.email} readOnly tabIndex={-1} className="bg-muted/40 cursor-default" />
            </FormField>
            <FormField id="personal_email" label={t("personalEmailLabel")} error={errors.personal_email?.message}>
              <Input type="email" {...fieldProps("personal_email", errors.personal_email?.message)} {...register("personal_email")} />
            </FormField>
            <FormField id="phone_number" label={t("phoneNumberLabel")} error={errors.phone_number?.message}>
              <Input type="tel" placeholder="+1 555 123 4567" {...fieldProps("phone_number", errors.phone_number?.message)} {...register("phone_number")} />
            </FormField>
          </div>
          {mutation.isError && <FormError message={getMessage(mutation.error)} />}
          <Button type="submit" disabled={mutation.isPending || !isDirty}>
            {mutation.isPending ? t("saving") : t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
