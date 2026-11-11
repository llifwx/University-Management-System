"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ApiError, apiRequest, applyFieldErrors, getErrorMessage } from "@/shared/api";
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

const isWrongCurrent = (error: unknown) => error instanceof ApiError && error.code === "INVALID_CURRENT_PASSWORD";

export function ChangePasswordForm() {
  const [visible, setVisible] = useState(false);
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
      setVisible(false);
    },
    onError: (error) => {
      if (isWrongCurrent(error)) setError("current_password", { message: "Current password is incorrect." }, { shouldFocus: true });
      else applyFieldErrors(error, setError);
    },
  });
  const type = visible ? "text" : "password";
  const showFormError = mutation.isError && !isWrongCurrent(mutation.error) && !(mutation.error instanceof ApiError && mutation.error.status === 422);
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="current_password" label="Current password" error={errors.current_password?.message}>
        <Input type={type} autoComplete="current-password" {...fieldProps("current_password", errors.current_password?.message)} {...register("current_password")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="new_password" label="New password" hint="At least 12 characters." error={errors.new_password?.message}>
          <Input type={type} autoComplete="new-password" {...fieldProps("new_password", errors.new_password?.message)} {...register("new_password")} />
        </FormField>
        <FormField id="confirm_password" label="Repeat new password" error={errors.confirm?.message}>
          <Input type={type} autoComplete="new-password" {...fieldProps("confirm_password", errors.confirm?.message)} {...register("confirm")} />
        </FormField>
      </div>
      <label className="text-muted-foreground flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="accent-primary size-4" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        Show passwords
      </label>
      {showFormError && <FormError message={getErrorMessage(mutation.error)} />}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
