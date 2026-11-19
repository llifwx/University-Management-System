"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ReactNode, useMemo } from "react";
import { FieldErrors, UseFormRegister, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { User, userQueries } from "@/entities/user";
import { applyFieldErrors, useApiErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { NativeSelect } from "@/shared/ui/native-select";
import { Switch } from "@/shared/ui/switch";

import { createStaff, updateStaff } from "../api/staff-mutations";

type Translate = ReturnType<typeof useTranslations>;

function buildPasswordSchema(t: Translate) {
  return z.string().min(12, t("validation.tooShort", { min: 12 })).max(128, t("validation.tooLong", { max: 128 }));
}

/** Blank optional fields are sent as null, which clears them. */
function buildOptionalField(t: Translate, max: number) {
  return z
    .string()
    .max(max, t("validation.tooLong", { max }))
    .transform((v) => v.trim() || null);
}

function buildProfileSchema(t: Translate) {
  return z.object({
    full_name: z.string().trim().min(1, t("validation.fullNameRequired")).max(100, t("validation.tooLong", { max: 100 })),
    title: buildOptionalField(t, 100),
    department: buildOptionalField(t, 100),
    office: buildOptionalField(t, 50),
    phone: buildOptionalField(t, 30).refine((v) => v === null || /^\+?[0-9()\- ]{3,30}$/.test(v), t("validation.phoneFormat")),
  });
}
type ProfileSchema = ReturnType<typeof buildProfileSchema>;
type ProfileInput = z.input<ProfileSchema>;
type ProfileOutput = z.output<ProfileSchema>;

function buildCreateSchema(t: Translate) {
  return buildProfileSchema(t).extend({
    email: z.email(t("validation.emailInvalid")).max(150, t("validation.tooLong", { max: 150 })),
    password: buildPasswordSchema(t),
    role: z.enum(["TEACHER", "ADMIN"]),
  });
}
type CreateSchema = ReturnType<typeof buildCreateSchema>;
type CreateInput = z.input<CreateSchema>;
type CreateValues = z.output<CreateSchema>;
const EMPTY_PROFILE: ProfileInput = { full_name: "", title: "", department: "", office: "", phone: "" };

function ProfileFields({ register, errors, t }: { register: UseFormRegister<ProfileInput>; errors: FieldErrors<ProfileInput>; t: Translate }) {
  const field = (name: keyof ProfileInput, label: string, extra: { type?: string; autoComplete?: string } = {}) => (
    <FormField id={`staff_${name}`} label={label} error={errors[name]?.message}>
      <Input autoComplete="off" {...extra} {...fieldProps(`staff_${name}`, errors[name]?.message)} {...register(name)} />
    </FormField>
  );
  return (
    <>
      {field("full_name", t("fields.fullName"))}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("title", t("fields.title"))}
        {field("department", t("fields.department"))}
        {field("office", t("fields.office"))}
        {field("phone", t("fields.phone"), { type: "tel" })}
      </div>
    </>
  );
}

function CreateStaffForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("features.manageStaff");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const schema = useMemo(() => buildCreateSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateInput, unknown, CreateValues>({ resolver: zodResolver(schema), defaultValues: { ...EMPTY_PROFILE, email: "", password: "", role: "TEACHER" } });
  const mutation = useMutation({
    mutationFn: createStaff,
    onSuccess: async () => {
      toast.success(t("toast.accountCreated"));
      await queryClient.invalidateQueries({ queryKey: userQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <ProfileFields register={register as unknown as UseFormRegister<ProfileInput>} errors={errors} t={t} />
      <FormField id="staff_email" label={t("fields.email")} error={errors.email?.message}>
        <Input type="email" autoComplete="off" {...fieldProps("staff_email", errors.email?.message)} {...register("email")} />
      </FormField>
      <FormField id="staff_password" label={t("fields.initialPassword")} hint={t("fields.passwordHint")} error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...fieldProps("staff_password", errors.password?.message)} {...register("password")} />
      </FormField>
      <FormField id="staff_role" label={t("fields.role")}>
        <NativeSelect id="staff_role" {...register("role")}>
          <option value="TEACHER">{t("roles.teacher")}</option>
          <option value="ADMIN">{t("roles.administrator")}</option>
        </NativeSelect>
      </FormField>
      {mutation.isError && <FormError message={getMessage(mutation.error, { INTEGRITY_CONFLICT: t("errors.emailInUse") })} />}
      <FormSubmit isPending={mutation.isPending} label={t("createSubmitLabel")} />
    </form>
  );
}

export function CreateStaffDialog({ trigger }: { trigger: ReactNode }) {
  const t = useTranslations("features.manageStaff");
  return (
    <FormDialog trigger={trigger} title={t("createDialogTitle")}>
      {(close) => <CreateStaffForm onDone={close} />}
    </FormDialog>
  );
}

function EditProfileForm({ user, onDone }: { user: User; onDone: () => void }) {
  const t = useTranslations("features.manageStaff");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const schema = useMemo(() => buildProfileSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user.full_name ?? "",
      title: user.title ?? "",
      department: user.department ?? "",
      office: user.office ?? "",
      phone: user.phone ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: ProfileOutput) => updateStaff(user.id, values),
    onSuccess: async () => {
      toast.success(t("toast.profileSaved"));
      await queryClient.invalidateQueries({ queryKey: userQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <ProfileFields register={register} errors={errors} t={t} />
      {mutation.isError && <FormError message={getMessage(mutation.error)} />}
      <FormSubmit isPending={mutation.isPending} label={t("saveProfileSubmitLabel")} />
    </form>
  );
}

export function EditStaffProfileDialog({ user, trigger }: { user: User; trigger: ReactNode }) {
  const t = useTranslations("features.manageStaff");
  return (
    <FormDialog trigger={trigger} title={t("editProfileDialogTitle", { email: user.email })}>
      {(close) => <EditProfileForm user={user} onDone={close} />}
    </FormDialog>
  );
}

function buildResetSchema(t: Translate) {
  return z.object({ password: buildPasswordSchema(t) });
}

function ResetPasswordForm({ user, onDone }: { user: User; onDone: () => void }) {
  const t = useTranslations("features.manageStaff");
  const getMessage = useApiErrorMessage();
  const schema = useMemo(() => buildResetSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<ReturnType<typeof buildResetSchema>>>({ resolver: zodResolver(schema), defaultValues: { password: "" } });
  const mutation = useMutation({
    mutationFn: (values: { password: string }) => updateStaff(user.id, values),
    onSuccess: () => {
      toast.success(t("toast.passwordReset"));
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });
  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="reset_password" label={t("fields.newPassword")} hint={t("fields.passwordHint")} error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...fieldProps("reset_password", errors.password?.message)} {...register("password")} />
      </FormField>
      {mutation.isError && <FormError message={getMessage(mutation.error)} />}
      <FormSubmit isPending={mutation.isPending} label={t("resetPasswordSubmitLabel")} />
    </form>
  );
}

export function ResetPasswordDialog({ user, trigger }: { user: User; trigger: ReactNode }) {
  const t = useTranslations("features.manageStaff");
  return (
    <FormDialog trigger={trigger} title={t("resetPasswordDialogTitle", { email: user.email })} description={t("resetPasswordDialogDescription")}>
      {(close) => <ResetPasswordForm user={user} onDone={close} />}
    </FormDialog>
  );
}

export function StaffActiveSwitch({ user, disabled }: { user: User; disabled?: boolean }) {
  const t = useTranslations("features.manageStaff");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (is_active: boolean) => updateStaff(user.id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueries.all }),
    onError: (error) => toast.error(getMessage(error)),
  });
  return (
    <Switch
      checked={user.is_active}
      disabled={disabled || mutation.isPending}
      onCheckedChange={(checked) => mutation.mutate(checked)}
      aria-label={t("activeAriaLabel", { email: user.email })}
    />
  );
}
