"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { roleHome } from "@/entities/user";
import { useApiErrorMessage } from "@/shared/api";
import { safeRedirectPath } from "@/shared/lib/safe-redirect";
import { Button } from "@/shared/ui/button";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { login } from "../api/login";

type Translator = ReturnType<typeof useTranslations>;

function buildSchema(t: Translator) {
  return z.object({
    email: z.email(t("validation.emailInvalid")),
    password: z.string().min(1, t("validation.passwordRequired")),
  });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("features.authByEmail");
  const getMessage = useApiErrorMessage();
  const [showPassword, setShowPassword] = useState(false);
  const schema = useMemo(() => buildSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      // A full load guarantees nothing cached for a previous user survives into this session.
      window.location.assign(safeRedirectPath(next, roleHome(user.role)));
    },
  });
  const busy = mutation.isPending || mutation.isSuccess;

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="email" label={t("form.emailLabel")} error={errors.email?.message}>
        <Input type="email" autoComplete="username" {...fieldProps("email", errors.email?.message)} {...register("email")} />
      </FormField>
      <FormField id="password" label={t("form.passwordLabel")} error={errors.password?.message}>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-10"
            {...fieldProps("password", errors.password?.message)}
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0"
            aria-label={showPassword ? t("form.hidePassword") : t("form.showPassword")}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((shown) => !shown)}
          >
            {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
        </div>
      </FormField>
      {mutation.isError && <FormError message={getMessage(mutation.error, { INVALID_CREDENTIALS: t("errors.invalidCredentials") })} />}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        {busy ? t("form.signingIn") : t("form.signIn")}
      </Button>
    </form>
  );
}
