"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { User, userQueries } from "@/entities/user";
import { applyFieldErrors, getErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { NativeSelect } from "@/shared/ui/native-select";
import { Switch } from "@/shared/ui/switch";

import { createStaff, updateStaff } from "../api/staff-mutations";

const password = z.string().min(12, "Use at least 12 characters.").max(128, "Use at most 128 characters.");
const createSchema = z.object({
  email: z.email("Enter a valid email address.").max(150, "Use at most 150 characters."),
  password,
  role: z.enum(["TEACHER", "ADMIN"]),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateStaffForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { email: "", password: "", role: "TEACHER" } });
  const mutation = useMutation({
    mutationFn: createStaff,
    onSuccess: async () => {
      toast.success("Account created.");
      await queryClient.invalidateQueries({ queryKey: userQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="staff_email" label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="off" {...fieldProps("staff_email", errors.email?.message)} {...register("email")} />
      </FormField>
      <FormField id="staff_password" label="Initial password" hint="At least 12 characters." error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...fieldProps("staff_password", errors.password?.message)} {...register("password")} />
      </FormField>
      <FormField id="staff_role" label="Role">
        <NativeSelect id="staff_role" {...register("role")}>
          <option value="TEACHER">Teacher</option>
          <option value="ADMIN">Administrator</option>
        </NativeSelect>
      </FormField>
      {mutation.isError && <FormError message={getErrorMessage(mutation.error, { INTEGRITY_CONFLICT: "This email address is already in use." })} />}
      <FormSubmit isPending={mutation.isPending} label="Create account" />
    </form>
  );
}

export function CreateStaffDialog({ trigger }: { trigger: ReactNode }) {
  return (
    <FormDialog trigger={trigger} title="Add staff account">
      {(close) => <CreateStaffForm onDone={close} />}
    </FormDialog>
  );
}

const resetSchema = z.object({ password });

function ResetPasswordForm({ user, onDone }: { user: User; onDone: () => void }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: "" } });
  const mutation = useMutation({
    mutationFn: (values: { password: string }) => updateStaff(user.id, values),
    onSuccess: () => {
      toast.success("Password changed. The account's sessions were signed out.");
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="reset_password" label="New password" hint="At least 12 characters." error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...fieldProps("reset_password", errors.password?.message)} {...register("password")} />
      </FormField>
      {mutation.isError && <FormError message={getErrorMessage(mutation.error)} />}
      <FormSubmit isPending={mutation.isPending} label="Change password" />
    </form>
  );
}

export function ResetPasswordDialog({ user, trigger }: { user: User; trigger: ReactNode }) {
  return (
    <FormDialog trigger={trigger} title={`Change password for ${user.email}`} description="All of this account's sessions are revoked.">
      {(close) => <ResetPasswordForm user={user} onDone={close} />}
    </FormDialog>
  );
}

export function StaffActiveSwitch({ user, disabled }: { user: User; disabled?: boolean }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (is_active: boolean) => updateStaff(user.id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueries.all }),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return (
    <Switch checked={user.is_active} disabled={disabled || mutation.isPending} onCheckedChange={(checked) => mutation.mutate(checked)} aria-label={`${user.email} active`} />
  );
}
