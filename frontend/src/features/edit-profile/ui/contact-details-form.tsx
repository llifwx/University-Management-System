"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Student, studentQueries } from "@/entities/student";
import { applyFieldErrors, getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { updateMyContactDetails } from "../api/profile-mutations";

const schema = z.object({
  phone_number: z
    .string()
    .trim()
    .max(20, "Use at most 20 characters.")
    .refine((value) => value === "" || /^[0-9+()\-\s]{6,20}$/.test(value), "Use 6–20 digits, spaces, +, -, or parentheses."),
  personal_email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address."),
});
type Values = z.infer<typeof schema>;

export function ContactDetailsForm({ student }: { student: Student }) {
  const queryClient = useQueryClient();
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
      toast.success("Contact details updated.");
      await queryClient.invalidateQueries({ queryKey: studentQueries.all });
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Contact details</CardTitle>
        <CardDescription>The only details you can change yourself. Everything else needs a university administrator.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="login_email" label="Login email">
              <Input id="login_email" value={student.email} readOnly tabIndex={-1} className="bg-muted/40 cursor-default" />
            </FormField>
            <FormField id="personal_email" label="Personal email" error={errors.personal_email?.message}>
              <Input type="email" {...fieldProps("personal_email", errors.personal_email?.message)} {...register("personal_email")} />
            </FormField>
            <FormField id="phone_number" label="Phone number" error={errors.phone_number?.message}>
              <Input type="tel" placeholder="+1 555 123 4567" {...fieldProps("phone_number", errors.phone_number?.message)} {...register("phone_number")} />
            </FormField>
          </div>
          {mutation.isError && <FormError message={getErrorMessage(mutation.error)} />}
          <Button type="submit" disabled={mutation.isPending || !isDirty}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
