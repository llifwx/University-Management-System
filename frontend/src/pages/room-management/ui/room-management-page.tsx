"use client";

import { useQuery } from "@tanstack/react-query";
import { DoorOpen, Plus } from "lucide-react";

import { Room, roomQueries } from "@/entities/room";
import { DeleteRoomButton, RoomActiveSwitch, RoomFormDialog } from "@/features/manage-room";
import { Button } from "@/shared/ui/button";
import { Column, DataTable } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { EmptyState, QueryState } from "@/shared/ui/states";

const columns: Column<Room>[] = [
  { header: "Code", cell: (room) => <span className="font-medium">{room.code}</span> },
  { header: "Building", cell: (room) => room.building ?? "—" },
  { header: "Capacity", cell: (room) => room.capacity ?? "—" },
  { header: "Available for assignment", cell: (room) => <RoomActiveSwitch room={room} /> },
  {
    header: "Actions",
    cell: (room) => (
      <div className="flex justify-end gap-1 md:justify-start">
        <RoomFormDialog
          room={room}
          trigger={
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          }
        />
        <DeleteRoomButton room={room} />
      </div>
    ),
  },
];

export function RoomManagementPage() {
  const rooms = useQuery(roomQueries.list());
  return (
    <>
      <PageHeader
        title="Rooms"
        description="Classrooms available for scheduling. An inactive room cannot be assigned to new meetings."
        actions={
          <RoomFormDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                Add room
              </Button>
            }
          />
        }
      />
      <QueryState query={rooms}>
        {(rows) => (rows.length === 0 ? <EmptyState icon={DoorOpen} title="No rooms yet" /> : <DataTable caption="Rooms" columns={columns} rows={rows} rowKey={(room) => room.room_id} />)}
      </QueryState>
    </>
  );
}
