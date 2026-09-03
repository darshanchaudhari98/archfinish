import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  LogOut,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Info,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DrawingUploader from "@/components/DrawingUploader";
import DrawingCard from "@/components/DrawingCard";
import RoomTable from "@/components/RoomTable";
import DrawingViewer from "@/components/DrawingViewer";
import FloorSidebar, { Floor } from "@/components/FloorSidebar";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import {
  exportToExcel,
  exportToPDF,
  exportProjectToExcel,
  exportProjectToPDF,
} from "@/lib/exportUtils";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  const [highlightedRoomId, setHighlightedRoomId] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: floors = [] } = useQuery({
    queryKey: ["floors", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floors")
        .select("*")
        .eq("project_id", id!)
        .order("level_order", { ascending: true });
      if (error) throw error;
      return data as Floor[];
    },
  });

  const { data: drawings = [], isLoading: drawingsLoading } = useQuery({
    queryKey: ["drawings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawings")
        .select("*")
        .eq("project_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("project_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deleteDrawing = useMutation({
    mutationFn: async (drawingId: string) => {
      const drawing = drawings.find((d) => d.id === drawingId);
      if (drawing) {
        await supabase.storage.from("drawings").remove([drawing.storage_path]);
      }
      const { error } = await supabase.from("drawings").delete().eq("id", drawingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings", id] });
      queryClient.invalidateQueries({ queryKey: ["rooms", id] });
      toast({ title: "Drawing deleted" });
    },
  });

  const isProjectView = activeFloorId === null;

  const floorDrawings = useMemo(
    () => (isProjectView ? drawings : drawings.filter((d) => d.floor_id === activeFloorId)),
    [drawings, activeFloorId, isProjectView]
  );

  const floorRooms = useMemo(
    () => (isProjectView ? rooms : rooms.filter((r) => r.floor_id === activeFloorId)),
    [rooms, activeFloorId, isProjectView]
  );

  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rooms.forEach((r) => {
      if (r.floor_id) counts[r.floor_id] = (counts[r.floor_id] ?? 0) + 1;
    });
    return counts;
  }, [rooms]);

  const floorGroups = useMemo(() => {
    const groups = floors
      .map((f) => ({ floorName: f.name, rooms: rooms.filter((r) => r.floor_id === f.id) }))
      .filter((g) => g.rooms.length > 0);
    const unassigned = rooms.filter((r) => !r.floor_id);
    if (unassigned.length > 0) groups.push({ floorName: "Unassigned", rooms: unassigned });
    return groups;
  }, [floors, rooms]);

  const activeFloorName = floors.find((f) => f.id === activeFloorId)?.name ?? "Whole Project";

  const feedbackDrawings = floorDrawings.filter((d) => d.analysis_feedback);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold font-heading text-foreground">ArchEasy</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading text-foreground">
              {project?.name ?? "Loading..."}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              <span>{floors.length} floors</span>
              <span>·</span>
              <span>{rooms.length} rooms</span>
              <span>·</span>
              <span>{drawings.length} drawings</span>
            </div>
          </div>
          {rooms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportProjectToExcel(floorGroups, project?.name ?? "Project")}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Project SOF · Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => exportProjectToPDF(floorGroups, project?.name ?? "Project")}
              >
                <FileText className="h-4 w-4" />
                Project SOF · PDF
              </Button>
            </div>
          )}
        </motion.div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_380px]">
          <FloorSidebar
            projectId={id!}
            floors={floors}
            activeFloorId={activeFloorId}
            onSelectFloor={(fid) => {
              setActiveFloorId(fid);
              setHighlightedRoomId(null);
            }}
            roomCounts={roomCounts}
          />

          <div className="min-w-0 space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold font-heading text-foreground">{activeFloorName}</h2>
              <Badge variant="secondary" className="text-[10px]">
                {floorRooms.length} rooms
              </Badge>
            </div>

            {isProjectView ? (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
                Select a floor on the left to upload a drawing, view it and run detection. This view shows
                the combined project schedule below.
              </div>
            ) : (
              <DrawingUploader projectId={id!} floorId={activeFloorId} />
            )}

            {!isProjectView && (
              <DrawingViewer
                drawing={floorDrawings[0] ?? null}
                rooms={floorRooms}
                highlightedRoomId={highlightedRoomId}
                onHighlightRoom={setHighlightedRoomId}
              />
            )}

            {floorDrawings.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold font-heading text-foreground mb-3">
                  Drawings ({floorDrawings.length})
                </h3>
                {drawingsLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {floorDrawings.map((drawing) => (
                      <DrawingCard
                        key={drawing.id}
                        drawing={drawing}
                        onDelete={() => deleteDrawing.mutate(drawing.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {feedbackDrawings.length > 0 && (
              <section>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold font-heading text-foreground">
                    Verify With Original Design
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review the AI's notes below and cross-check these areas against your original drawing.
                  </p>
                </div>
                <div className="space-y-4">
                  {feedbackDrawings.map((d) => {
                    const feedback = d.analysis_feedback ?? "";
                    const isWarning =
                      /could not detect|unable to|not detected|missing|unclear|undetected/i.test(feedback);
                    const isError = /error|failed/i.test(feedback);

                    const items = feedback
                      .split(/\n+|(?:^|\s)[-•*]\s+|;\s*/g)
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);

                    const tone = isError
                      ? {
                          border: "border-destructive/30",
                          bg: "bg-destructive/5",
                          iconBg: "bg-destructive/10",
                          iconColor: "text-destructive",
                          label: "Analysis Error",
                          Icon: AlertTriangle,
                        }
                      : isWarning
                        ? {
                            border: "border-warning/30",
                            bg: "bg-warning/5",
                            iconBg: "bg-warning/10",
                            iconColor: "text-warning",
                            label: "Needs Verification",
                            Icon: AlertTriangle,
                          }
                        : {
                            border: "border-primary/30",
                            bg: "bg-primary/5",
                            iconBg: "bg-primary/10",
                            iconColor: "text-primary",
                            label: "AI Notes",
                            Icon: Info,
                          };

                    const ToneIcon = tone.Icon;

                    return (
                      <div
                        key={d.id}
                        className={`rounded-xl border ${tone.border} ${tone.bg} overflow-hidden`}
                      >
                        <div className="flex items-start gap-3 p-4 border-b border-border/50 bg-card/40">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone.iconBg} shrink-0`}
                          >
                            <ToneIcon className={`h-4 w-4 ${tone.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{d.file_name}</p>
                            <p className={`text-xs font-medium ${tone.iconColor} mt-0.5`}>{tone.label}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          {items.length > 1 ? (
                            <ul className="space-y-2">
                              {items.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm text-foreground/85"
                                >
                                  <CheckCircle2
                                    className={`h-4 w-4 mt-0.5 shrink-0 ${tone.iconColor}`}
                                  />
                                  <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                              {feedback}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Schedule of Finishes */}
            {isProjectView ? (
              floorGroups.length > 0 && (
                <section className="space-y-8">
                  <h3 className="text-sm font-semibold font-heading text-foreground">
                    Project Schedule of Finishes
                  </h3>
                  {floorGroups.map((group) => (
                    <div key={group.floorName}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {group.floorName}
                          <span className="ml-2 text-muted-foreground normal-case tracking-normal font-normal">
                            {group.rooms.length} rooms
                          </span>
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() =>
                              exportToExcel(group.rooms, `${project?.name ?? "Project"}_${group.floorName}`)
                            }
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Excel
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() =>
                              exportToPDF(group.rooms, `${project?.name ?? "Project"}_${group.floorName}`)
                            }
                          >
                            <FileText className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                        </div>
                      </div>
                      <RoomTable rooms={group.rooms} projectId={id!} />
                    </div>
                  ))}
                </section>
              )
            ) : (
              floorRooms.length > 0 && (
                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold font-heading text-foreground">
                      Schedule of Finishes · {activeFloorName}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          exportToExcel(floorRooms, `${project?.name ?? "Project"}_${activeFloorName}`)
                        }
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          exportToPDF(floorRooms, `${project?.name ?? "Project"}_${activeFloorName}`)
                        }
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>
                  <RoomTable
                    rooms={floorRooms}
                    projectId={id!}
                    highlightedRoomId={highlightedRoomId}
                  />
                </section>
              )
            )}
          </div>

          <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
            <RecommendationsPanel
              projectId={id!}
              floorId={activeFloorId}
              rooms={floorRooms}
              highlightedRoomId={highlightedRoomId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
