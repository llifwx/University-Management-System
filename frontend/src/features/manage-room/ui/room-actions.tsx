"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Room, roomQueries } from "@/entities/room";
import { useApiErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Switch } from "@/shared/ui/switch";

import { deleteRoom, updateRoom } from "../api/room-mutations";

export function RoomActiveSwitch({ room }: { room: Room }) {
  const t = useTranslations("features.manageRoom");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (is_active: boolean) => updateRoom(room.room_id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomQueries.all }),
    onError: (error) => toast.error(getMessage(error)),
  });
  return (
    <Switch
      checked={room.is_active}
      disabled={mutation.isPending}
      onCheckedChange={(checked) => mutation.mutate(checked)}
      aria-label={t("availableAriaLabel", { code: room.code })}
    />
  );
}

export function DeleteRoomButton({ room }: { room: Room }) {
  const t = useTranslations("features.manageRoom");
  const getMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteRoom(room.room_id),
    onSuccess: async () => {
      toast.success(t("toast.deleted"));
      await queryClient.invalidateQueries({ queryKey: roomQueries.all });
    },
  });
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm">
          {t("deleteButton")}
        </Button>
      }
      title={t("deleteConfirmTitle", { code: room.code })}
      description={t("deleteConfirmDescription")}
      confirmLabel={t("deleteConfirmLabel")}
      isPending={mutation.isPending}
      error={mutation.isError ? getMessage(mutation.error) : undefined}
      onConfirm={(close) => mutation.mutate(undefined, { onSuccess: close })}
    />
  );
}
