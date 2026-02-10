import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Trash2 } from "lucide-react";

interface Room {
  id: string;
  name: string;
  room_type: string | null;
  area: number | null;
  area_unit: string | null;
  wall_finish: string | null;
  floor_finish: string | null;
  ceiling_finish: string | null;
  ceiling_height: number | null;
  skirting: string | null;
  dado: string | null;
  paint_color: string | null;
  notes: string | null;
}

interface Props {
  rooms: Room[];
  projectId: string;
}

export default function RoomTable({ rooms, projectId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Room>>({});

  const updateRoom = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Room> }) => {
      const { error } = await supabase.from("rooms").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", projectId] });
      setEditingId(null);
      toast({ title: "Room updated" });
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", projectId] });
      toast({ title: "Room deleted" });
    },
  });

  const startEdit = (room: Room) => {
    setEditingId(room.id);
    setEditData(room);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = () => {
    if (editingId) {
      updateRoom.mutate({ id: editingId, data: editData });
    }
  };

  const columns = [
    { key: "name", label: "Room" },
    { key: "room_type", label: "Type" },
    { key: "area", label: "Area" },
    { key: "wall_finish", label: "Wall Finish" },
    { key: "floor_finish", label: "Floor Finish" },
    { key: "ceiling_finish", label: "Ceiling" },
    { key: "paint_color", label: "Paint" },
    { key: "skirting", label: "Skirting" },
  ] as const;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead key={col.key} className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id} className="hover:bg-muted/30">
                {columns.map((col) => (
                  <TableCell key={col.key} className="text-sm">
                    {editingId === room.id ? (
                      <Input
                        value={String(editData[col.key as keyof Room] ?? "")}
                        onChange={(e) =>
                          setEditData({ ...editData, [col.key]: col.key === "area" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })
                        }
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="text-foreground">
                        {room[col.key as keyof Room] ?? "—"}
                        {col.key === "area" && room.area ? ` ${room.area_unit ?? ""}` : ""}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-1">
                    {editingId === room.id ? (
                      <>
                        <Button variant="ghost" size="icon" onClick={saveEdit} className="h-7 w-7 text-success">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-7 w-7">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(room)} className="h-7 w-7">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRoom.mutate(room.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
