import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, LogOut, Trash2, FileSpreadsheet, FileText, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DrawingUploader from "@/components/DrawingUploader";
import DrawingCard from "@/components/DrawingCard";
import RoomTable from "@/components/RoomTable";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold font-heading text-foreground">ArchFinish</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold font-heading text-foreground">
            {project?.name ?? "Loading..."}
          </h1>
          {project?.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </motion.div>

        {/* Upload */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold font-heading text-foreground mb-4">Upload Drawings</h2>
          <DrawingUploader projectId={id!} />
        </section>

        {/* Drawings */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold font-heading text-foreground mb-4">
            Drawings ({drawings.length})
          </h2>
          {drawingsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : drawings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No drawings uploaded yet. Use the uploader above.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {drawings.map((drawing) => (
                <DrawingCard
                  key={drawing.id}
                  drawing={drawing}
                  onDelete={() => deleteDrawing.mutate(drawing.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* AI Feedback */}
        {drawings.some((d) => d.analysis_feedback) && (
          <section className="mt-10">
            <div className="mb-4">
              <h2 className="text-xl font-semibold font-heading text-foreground">
                Verify With Original Design
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Review the AI's notes below and cross-check these areas against your original drawing.
              </p>
            </div>
            <div className="space-y-4">
              {drawings
                .filter((d) => d.analysis_feedback)
                .map((d) => {
                  const feedback = d.analysis_feedback ?? "";
                  const isWarning = /could not detect|unable to|not detected|missing|unclear|undetected/i.test(feedback);
                  const isError = /error|failed/i.test(feedback);

                  // Parse feedback into structured items (split by newlines, bullets, or semicolons)
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
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone.iconBg} shrink-0`}>
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
                              <li key={idx} className="flex items-start gap-2 text-sm text-foreground/85">
                                <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${tone.iconColor}`} />
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
        {rooms.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold font-heading text-foreground">
                Schedule of Finishes ({rooms.length} rooms)
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => exportToExcel(rooms, project?.name ?? "Project")}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => exportToPDF(rooms, project?.name ?? "Project")}
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
            <RoomTable rooms={rooms} projectId={id!} />
          </section>
        )}
      </main>
    </div>
  );
}
