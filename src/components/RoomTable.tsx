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
  floor_level: string | null;
  space_tag: string | null;
  room_type: string | null;
  floor_finish: string | null;
  flooring_size: string | null;
  flooring_finish: string | null;
  flooring_code: string | null;
  flooring_make: string | null;
  flooring_rate: string | null;
  skirting: string | null;
  skirting_code: string | null;
  skirting_make: string | null;
  skirting_rate: string | null;
  ceiling_finish: string | null;
  ceiling_material_2: string | null;
  ceiling_size: string | null;
  ceiling_code: string | null;
  ceiling_make: string | null;
  ceiling_rate: string | null;
  wall_finish: string | null;
  paint_color: string | null;
  dado: string | null;
  remark: string | null;
  area: number | null;
  area_unit: string | null;
  ceiling_height: number | null;
  notes: string | null;
}

interface Props {
  rooms: Room[];
  projectId: string;
}

const columnGroups = [
  {
    label: "",
    columns: [
      { key: "floor_level", label: "Floor" },
      { key: "name", label: "Space Description" },
      { key: "space_tag", label: "Space/Room Tag" },
    ],
  },
  {
    label: "FLOORING",
    columns: [
      { key: "floor_finish", label: "Material" },
      { key: "flooring_size", label: "Size" },
      { key: "flooring_finish", label: "Finish" },
      { key: "flooring_code", label: "Code No" },
      { key: "flooring_make", label: "Make" },
      { key: "flooring_rate", label: "Basic Rate" },
    ],
  },
  {
    label: "SKIRTING",
    columns: [
      { key: "skirting", label: "Material" },
      { key: "skirting_code", label: "Code No" },
      { key: "skirting_make", label: "Make" },
      { key: "skirting_rate", label: "Basic Rate" },
    ],
  },
  {
    label: "CEILING",
    columns: [
      { key: "ceiling_finish", label: "Material 1" },
      { key: "ceiling_material_2", label: "Material 2" },
      { key: "ceiling_size", label: "Size" },
      { key: "ceiling_code", label: "Code No" },
      { key: "ceiling_make", label: "Make" },
      { key: "ceiling_rate", label: "Basic Rate" },
    ],
  },
  {
    label: "",
    columns: [{ key: "remark", label: "Remark" }],
  },
];

const allColumns = columnGroups.flatMap((g) => g.columns);

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

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {/* Group header row */}
            <TableRow className="bg-primary/10 border-b-2 border-primary/20">
              <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider text-primary w-10">
                Sr.No
              </TableHead>
              {columnGroups.map((group, i) => (
                <TableHead
                  key={i}
                  colSpan={group.columns.length}
                  className="text-center text-[10px] font-bold uppercase tracking-wider text-primary border-l border-border/50"
                >
                  {group.label}
                </TableHead>
              ))}
              <TableHead className="w-20 border-l border-border/50" />
            </TableRow>
            {/* Sub-header row */}
            <TableRow className="bg-muted/50">
              <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-10">
                #
              </TableHead>
              {allColumns.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-l border-border/30 min-w-[100px]"
                >
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-20 border-l border-border/30" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room, idx) => (
              <TableRow key={room.id} className="hover:bg-muted/30">
                <TableCell className="text-xs text-muted-foreground font-medium">
                  {idx + 1}
                </TableCell>
                {allColumns.map((col) => (
                  <TableCell key={col.key} className="text-xs border-l border-border/20">
                    {editingId === room.id ? (
                      <Input
                        value={String(editData[col.key as keyof Room] ?? "")}
                        onChange={(e) =>
                          setEditData({ ...editData, [col.key]: e.target.value })
                        }
                        className="h-7 text-xs min-w-[80px]"
                      />
                    ) : (
                      <span className="text-foreground">
                        {(room as any)[col.key] || "—"}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell className="border-l border-border/20">
                  <div className="flex gap-1">
                    {editingId === room.id ? (
                      <>
                        <Button variant="ghost" size="icon" onClick={saveEdit} className="h-6 w-6 text-primary">
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-6 w-6">
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(room)} className="h-6 w-6">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRoom.mutate(room.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
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
