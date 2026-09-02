import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Plus, Pencil, Trash2, Check, X, LayoutGrid } from "lucide-react";

export interface Floor {
  id: string;
  name: string;
  level_order: number;
}

interface Props {
  projectId: string;
  floors: Floor[];
  activeFloorId: string | null;
  onSelectFloor: (id: string | null) => void;
  roomCounts: Record<string, number>;
}

export default function FloorSidebar({
  projectId,
  floors,
  activeFloorId,
  onSelectFloor,
  roomCounts,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["floors", projectId] });
  };

  const addFloor = useMutation({
    mutationFn: async () => {
      const nextOrder = floors.length;
      const defaults = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "Fourth Floor"];
      const { data, error } = await supabase
        .from("floors")
        .insert({
          project_id: projectId,
          user_id: user!.id,
          name: defaults[nextOrder] ?? `Floor ${nextOrder + 1}`,
          level_order: nextOrder,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidate();
      onSelectFloor(data.id);
      toast({ title: "Floor added" });
    },
    onError: (e: any) => toast({ title: "Could not add floor", description: e.message, variant: "destructive" }),
  });

  const renameFloor = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("floors").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
  });

  const deleteFloor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("floors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["drawings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["rooms", projectId] });
      if (activeFloorId === id) onSelectFloor(null);
      toast({ title: "Floor deleted" });
    },
  });

  return (
    <aside className="lg:sticky lg:top-20 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold font-heading text-foreground">Floors</h2>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => addFloor.mutate()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <button
        onClick={() => onSelectFloor(null)}
        className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
          activeFloorId === null
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Whole Project
      </button>

      <div className="mt-2 space-y-1">
        {floors.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            No floors yet. Add a floor to start uploading drawings per level.
          </p>
        )}
        {floors.map((floor) => (
          <div
            key={floor.id}
            className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
              activeFloorId === floor.id ? "bg-primary/10" : "hover:bg-muted"
            }`}
          >
            {editingId === floor.id ? (
              <>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="h-7 text-xs"
                  autoFocus
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-primary"
                  onClick={() => renameFloor.mutate({ id: floor.id, name: draftName.trim() || floor.name })}
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onSelectFloor(floor.id)}
                  className={`flex-1 text-left text-sm truncate ${
                    activeFloorId === floor.id ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  {floor.name}
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {roomCounts[floor.id] ?? 0} rooms
                  </span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    setEditingId(floor.id);
                    setDraftName(floor.name);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteFloor.mutate(floor.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
