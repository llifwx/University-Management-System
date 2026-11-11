"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { apiRequest, applyFieldErrors, getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });
type Values = z.infer<typeof schema>;

const changePassword = ({ current_password, new_password }: Values) =>
  apiRequest<{ message: string }>("/auth/password", { method: "POST", json: { current_password, new_password } });

export function ChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { current_password: "", new_password: "", confirm: "" } });
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password changed. Your other devices were signed out.");
      reset();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="current_password" label="Current password" error={errors.current_password?.message}>
        <Input type="password" autoComplete="current-password" {...fieldProps("current_password", errors.current_password?.message)} {...register("current_password")} />
      </FormField>
      <FormField id="new_password" label="New password" hint="At least 12 characters." error={errors.new_password?.message}>
        <Input type="password" autoComplete="new-password" {...fieldProps("new_password", errors.new_password?.message)} {...register("new_password")} />
      </FormField>
      <FormField id="confirm_password" label="Repeat new password" error={errors.confirm?.message}>
        <Input type="password" autoComplete="new-password" {...fieldProps("confirm_password", errors.confirm?.message)} {...register("confirm")} />
      </FormField>
      {mutation.isError && <FormError message={getErrorMessage(mutation.error)} />}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
