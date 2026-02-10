import { useAuth } from "@/contexts/AuthContext";
import { Building2, LogOut, Plus, FolderOpen, Upload, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import CreateProjectDialog from "@/components/CreateProjectDialog";
import StatsCards from "@/components/StatsCards";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const [drawingsRes, roomsRes] = await Promise.all([
        supabase.from("drawings").select("id", { count: "exact", head: true }),
        supabase.from("rooms").select("id", { count: "exact", head: true }),
      ]);
      return {
        projects: projects.length,
        drawings: drawingsRes.count ?? 0,
        rooms: roomsRes.count ?? 0,
      };
    },
    enabled: projects.length >= 0,
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project deleted" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
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
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold font-heading text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your architectural projects and drawing analyses
          </p>
        </motion.div>

        {/* Stats */}
        <StatsCards
          projects={projects.length}
          drawings={stats?.drawings ?? 0}
          rooms={stats?.rooms ?? 0}
        />

        {/* Projects */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold font-heading text-foreground">Projects</h2>
            <Button onClick={() => setShowCreateDialog(true)} className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-16 text-center"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blueprint-light">
                <FolderOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold font-heading text-foreground">No projects yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Create your first project to start uploading and analyzing architectural drawings
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-6 gradient-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="group cursor-pointer rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:border-primary/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blueprint-light">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                      {project.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold font-heading text-foreground group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {project.description || "No description"}
                  </p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateProjectDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </div>
  );
}
