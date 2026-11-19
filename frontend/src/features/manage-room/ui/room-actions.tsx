"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Room, roomQueries } from "@/entities/room";
import { getErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Switch } from "@/shared/ui/switch";

import { deleteRoom, updateRoom } from "../api/room-mutations";

export function RoomActiveSwitch({ room }: { room: Room }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (is_active: boolean) => updateRoom(room.room_id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomQueries.all }),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  return <Switch checked={room.is_active} disabled={mutation.isPending} onCheckedChange={(checked) => mutation.mutate(checked)} aria-label={`${room.code} available for assignment`} />;
}

export function DeleteRoomButton({ room }: { room: Room }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteRoom(room.room_id),
    onSuccess: async () => {
      toast.success("Room deleted.");
      await queryClient.invalidateQueries({ queryKey: roomQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          Delete
        </Button>
      }
      title={`Delete ${room.code}?`}
      description="This permanently removes the room. Meetings assigned to it keep their schedule but lose their room."
      confirmLabel="Delete room"
      isPending={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
