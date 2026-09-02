import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, Check, X, Pencil, Loader2, ArrowRight } from "lucide-react";

interface RoomLite {
  id: string;
  name: string;
  room_type: string | null;
  floor_finish: string | null;
  wall_finish: string | null;
  ceiling_finish: string | null;
}

interface Recommendation {
  id: string;
  room_id: string;
  surface: string;
  tier: string;
  detected_finish: string | null;
  recommended_finish: string;
  rationale: string | null;
  durability: string | null;
  maintenance: string | null;
  moisture_slip: string | null;
  cost_note: string | null;
  status: string;
}

interface Props {
  projectId: string;
  floorId: string | null;
  rooms: RoomLite[];
  highlightedRoomId: string | null;
}

const SURFACE_LABEL: Record<string, string> = {
  floor: "Flooring",
  wall: "Wall",
  ceiling: "Ceiling",
};

const tierVariant = (tier: string) =>
  tier === "premium" ? "default" : tier === "budget" ? "outline" : "secondary";

export default function RecommendationsPanel({ projectId, floorId, rooms, highlightedRoomId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const roomIds = rooms.map((r) => r.id);

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ["recommendations", projectId, floorId, roomIds.length],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_recommendations")
        .select("*")
        .in("room_id", roomIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Recommendation[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["recommendations"] });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("recommend-materials", {
        body: {
          projectId,
          floorId,
          userId: user!.id,
          rooms: rooms.map((r) => ({
            id: r.id,
            name: r.name,
            room_type: r.room_type,
            floor_finish: r.floor_finish,
            wall_finish: r.wall_finish,
            ceiling_finish: r.ceiling_finish,
          })),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "AI recommendations generated" });
    },
    onError: (e: any) =>
      toast({ title: "Could not generate recommendations", description: e.message, variant: "destructive" }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status, finish }: { id: string; status: string; finish?: string }) => {
      const payload: Record<string, string> = { status };
      if (finish !== undefined) payload.recommended_finish = finish;
      const { error } = await supabase.from("room_recommendations").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
  });

  const applyToRoom = useMutation({
    mutationFn: async (rec: Recommendation) => {
      const column =
        rec.surface === "floor" ? "floor_finish" : rec.surface === "wall" ? "wall_finish" : "ceiling_finish";
      const { error } = await supabase
        .from("rooms")
        .update({ [column]: rec.recommended_finish })
        .eq("id", rec.room_id);
      if (error) throw error;
      await supabase.from("room_recommendations").update({ status: "accepted" }).eq("id", rec.id);
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["rooms", projectId] });
      toast({ title: "Applied to schedule" });
    },
  });

  const visibleRooms = highlightedRoomId ? rooms.filter((r) => r.id === highlightedRoomId) : rooms;

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold font-heading text-foreground">AI Recommendations</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            AI-generated suggestions — review before use.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs shrink-0"
          disabled={rooms.length === 0 || generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {recs.length > 0 ? "Regenerate" : "Generate"}
        </Button>
      </div>

      <div className="max-h-[720px] overflow-y-auto p-4 space-y-4">
        {rooms.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Detect rooms first — recommendations are based on the detected schedule.
          </p>
        ) : isLoading ? (
          <div className="h-24 rounded-lg bg-muted animate-pulse" />
        ) : recs.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No recommendations yet. Click Generate to get budget, standard and premium options per surface.
          </p>
        ) : (
          visibleRooms.map((room) => {
            const roomRecs = recs.filter((r) => r.room_id === room.id);
            if (roomRecs.length === 0) return null;
            return (
              <div key={room.id} className="rounded-lg border border-border/70">
                <div className="border-b border-border/70 bg-muted/40 px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">{room.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{room.room_type ?? "general"}</p>
                </div>
                <div className="divide-y divide-border/60">
                  {["floor", "wall", "ceiling"].map((surface) => {
                    const surfaceRecs = roomRecs.filter((r) => r.surface === surface);
                    if (surfaceRecs.length === 0) return null;
                    const detected = surfaceRecs[0].detected_finish;
                    return (
                      <div key={surface} className="p-3">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {SURFACE_LABEL[surface]}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                          <span className="text-muted-foreground">Detected:</span>
                          <span className="text-foreground/80">{detected || "—"}</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          {surfaceRecs.map((rec) => (
                            <div
                              key={rec.id}
                              className={`rounded-md border p-2.5 ${
                                rec.status === "accepted"
                                  ? "border-primary/40 bg-primary/5"
                                  : rec.status === "rejected"
                                    ? "border-border/50 bg-muted/30 opacity-60"
                                    : "border-border/70"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant={tierVariant(rec.tier)} className="text-[9px] capitalize">
                                  {rec.tier}
                                </Badge>
                                {rec.status !== "pending" && (
                                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                                    {rec.status}
                                  </span>
                                )}
                              </div>
                              {editingId === rec.id ? (
                                <div className="mt-2 flex items-center gap-1">
                                  <Input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    className="h-7 text-xs"
                                    autoFocus
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-primary"
                                    onClick={() =>
                                      setStatus.mutate({ id: rec.id, status: "edited", finish: draft })
                                    }
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => setEditingId(null)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <p className="mt-1.5 text-xs font-medium text-foreground leading-snug">
                                  {rec.recommended_finish}
                                </p>
                              )}
                              {rec.rationale && (
                                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                                  {rec.rationale}
                                </p>
                              )}
                              <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                                {rec.durability && <span>Durability: {rec.durability}</span>}
                                {rec.maintenance && <span>Upkeep: {rec.maintenance}</span>}
                                {rec.moisture_slip && <span>Moisture/slip: {rec.moisture_slip}</span>}
                                {rec.cost_note && <span>Cost: {rec.cost_note}</span>}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 gap-1 px-2 text-[10px] text-primary"
                                  onClick={() => applyToRoom.mutate(rec)}
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  Accept &amp; apply
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 gap-1 px-2 text-[10px]"
                                  onClick={() => {
                                    setEditingId(rec.id);
                                    setDraft(rec.recommended_finish);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 gap-1 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                                  onClick={() => setStatus.mutate({ id: rec.id, status: "rejected" })}
                                >
                                  <X className="h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
