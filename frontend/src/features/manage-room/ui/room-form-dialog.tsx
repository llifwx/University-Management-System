"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Room, roomQueries } from "@/entities/room";
import { applyFieldErrors, getErrorMessage } from "@/shared/api";
import { FormDialog, FormSubmit } from "@/shared/ui/form-dialog";
import { FormError, FormField, fieldProps } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";

import { createRoom, updateRoom } from "../api/room-mutations";

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

const MESSAGES = { INTEGRITY_CONFLICT: "A room with this code already exists." };

export function RoomForm({ room, onDone }: { room?: Room; onDone: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(roomSchema),
    defaultValues: room ? { code: room.code, building: room.building ?? "", capacity: room.capacity ?? "", is_active: room.is_active } : EMPTY,
  });
  const mutation = useMutation({
    mutationFn: (values: Output) => (room ? updateRoom(room.room_id, values) : createRoom(values)),
    onSuccess: async () => {
      toast.success(room ? "Room updated." : "Room created.");
      await queryClient.invalidateQueries({ queryKey: roomQueries.all });
      onDone();
    },
    onError: (error) => applyFieldErrors(error, setError),
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
      <FormField id="code" label="Room code" error={errors.code?.message}>
        <Input {...fieldProps("code", errors.code?.message)} {...register("code")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="building" label="Building (optional)" error={errors.building?.message}>
          <Input {...fieldProps("building", errors.building?.message)} {...register("building")} />
        </FormField>
        <FormField id="capacity" label="Capacity (optional)" error={errors.capacity?.message}>
          <Input type="number" min={1} {...fieldProps("capacity", errors.capacity?.message)} {...register("capacity")} />
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" {...register("is_active")} />
        Active
      </label>
      {mutation.isError && <FormError message={getErrorMessage(mutation.error, MESSAGES)} />}
      <FormSubmit isPending={mutation.isPending} label={room ? "Save changes" : "Create room"} />
    </form>
  );
}

export function RoomFormDialog({ room, trigger }: { room?: Room; trigger: ReactNode }) {
  return (
    <FormDialog trigger={trigger} title={room ? `Edit ${room.code}` : "Add room"}>
      {(close) => <RoomForm room={room} onDone={close} />}
    </FormDialog>
  );
}
