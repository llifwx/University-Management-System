"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Room, roomQueries } from "@/entities/room";
import { applyFieldErrors, useApiErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { createRoom, updateRoom } from "../api/room-mutations";

/**
 * Kept as a plain schema (not a translator-driven builder) because it is imported directly by
 * room-form-dialog.test.ts; the form itself validates with the translated `buildRoomSchema` below.
 */
export const roomSchema = z.object({
  code: z.string().trim().min(1, "Enter a room code.").max(20, "Use at most 20 characters."),
  // Blank building is sent as null, which clears it.
  building: z
    .string()
    .trim()
    .max(80, "Use at most 80 characters.")
    .transform((value) => value || null),
  capacity: z
    .union([z.coerce.number().int().positive("Capacity must be at least 1."), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
  is_active: z.boolean(),
});
type Input = z.input<typeof roomSchema>;
type Output = z.output<typeof roomSchema>;
const EMPTY: Input = { code: "", building: "", capacity: "", is_active: true };

function buildRoomSchema(t: ReturnType<typeof useTranslations>) {
  return z.object({
    code: z.string().trim().min(1, t("validation.codeRequired")).max(20, t("validation.codeTooLong")),
    building: z
      .string()
      .trim()
      .max(80, t("validation.buildingTooLong"))
      .transform((value) => value || null),
    capacity: z
      .union([z.coerce.number().int().positive(t("validation.capacityPositive")), z.literal("")])
      .transform((value) => (value === "" ? null : value)),
    is_active: z.boolean(),
  });
}

export function RoomForm({ room, onDone }: { room?: Room; onDone: () => void }) {
  const t = useTranslations("features.manageRoom");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const schema = useMemo(() => buildRoomSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: room ? { code: room.code, building: room.building ?? "", capacity: room.capacity ?? "", is_active: room.is_active } : EMPTY,
  });
  const mutation = useMutation({
    mutationFn: (values: Output) => (room ? updateRoom(room.room_id, values) : createRoom(values)),
    onSuccess: async () => {
      toast.success(room ? t("toast.updated") : t("toast.created"));
      await queryClient.invalidateQueries({ queryKey: roomQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="code" label={t("fields.code")} error={errors.code?.message}>
        <Input {...fieldProps("code", errors.code?.message)} {...register("code")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="building" label={t("fields.building")} error={errors.building?.message}>
          <Input {...fieldProps("building", errors.building?.message)} {...register("building")} />
        </FormField>
        <FormField id="capacity" label={t("fields.capacity")} error={errors.capacity?.message}>
          <Input type="number" min={1} {...fieldProps("capacity", errors.capacity?.message)} {...register("capacity")} />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register("is_active")} />
        {t("fields.active")}
      </label>
      {mutation.isError && <FormError message={getMessage(mutation.error, { INTEGRITY_CONFLICT: t("errors.codeInUse") })} />}
      <FormSubmit isPending={mutation.isPending} label={room ? t("saveChangesLabel") : t("createLabel")} />
    </form>
  );
}

export function RoomFormDialog({ room, trigger }: { room?: Room; trigger: ReactNode }) {
  const t = useTranslations("features.manageRoom");
  return (
    <FormDialog trigger={trigger} title={room ? t("editDialogTitle", { code: room.code }) : t("addDialogTitle")}>
      {(close) => <RoomForm room={room} onDone={close} />}
    </FormDialog>
  );
}
