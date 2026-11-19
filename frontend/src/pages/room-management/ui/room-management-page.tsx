"use client";

import { useQuery } from "@tanstack/react-query";
import { DoorOpen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Room, roomQueries } from "@/entities/room";
import { DeleteRoomButton, RoomActiveSwitch, RoomFormDialog } from "@/features/manage-room";
import { Button } from "@/shared/ui/button";
import { Column, DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

function buildColumns(t: (key: string) => string): Column<Room>[] {
  return [
    { header: t("columns.code"), cell: (room) => <span className="font-medium">{room.code}</span> },
    { header: t("columns.building"), cell: (room) => room.building ?? "—" },
    { header: t("columns.capacity"), cell: (room) => room.capacity ?? "—" },
    { header: t("columns.availableForAssignment"), cell: (room) => <RoomActiveSwitch room={room} /> },
    {
      header: t("columns.actions"),
      cell: (room) => (
        <div className="flex justify-end gap-1 md:justify-start">
          <RoomFormDialog
            room={room}
            trigger={
              <Button variant="ghost" size="sm">
                {t("edit")}
              </Button>
            }
          />
          <DeleteRoomButton room={room} />
        </div>
      ),
    },
  ];
}

export function RoomManagementPage() {
  const t = useTranslations("pages.roomManagement");
  const rooms = useQuery(roomQueries.list());
  const columns = useMemo(() => buildColumns(t), [t]);
  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <RoomFormDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                {t("addRoom")}
              </Button>
            }
          />
        }
      />
      <QueryState query={rooms}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState icon={DoorOpen} title={t("empty.title")} />
          ) : (
            <DataTable caption={t("table.caption")} columns={columns} rows={rows} rowKey={(room) => room.room_id} />
          )
        }
      </QueryState>
    </>
  );
}
