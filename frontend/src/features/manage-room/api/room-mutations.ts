import type { Room } from "@/entities/room";
import { apiRequest, components } from "@/shared/api";

export type RoomCreate = components["schemas"]["RoomCreate"];

export const createRoom = (json: RoomCreate) => apiRequest<Room>("/rooms", { method: "POST", json });
export const updateRoom = (id: number, json: Partial<RoomCreate>) => apiRequest<Room>(`/rooms/${id}`, { method: "PATCH", json });
export const deleteRoom = (id: number) => apiRequest<{ message: string }>(`/rooms/${id}`, { method: "DELETE" });
