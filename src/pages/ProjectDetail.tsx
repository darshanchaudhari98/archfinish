import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, LogOut, Trash2, FileSpreadsheet, FileText } from "lucide-react";
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
