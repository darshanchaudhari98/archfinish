import { Image, Trash2, CheckCircle, Loader2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Drawing {
  id: string;
  file_name: string;
  file_size: number;
  analysis_status: string;
  created_at: string;
}

interface Props {
  drawing: Drawing;
  onDelete: () => void;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  pending: { icon: Clock, label: "Pending", className: "text-muted-foreground bg-muted" },
  analyzing: { icon: Loader2, label: "Analyzing...", className: "text-warning bg-warning/10" },
  completed: { icon: CheckCircle, label: "Completed", className: "text-success bg-success/10" },
  failed: { icon: AlertCircle, label: "Failed", className: "text-destructive bg-destructive/10" },
};

export default function DrawingCard({ drawing, onDelete }: Props) {
  const status = statusConfig[drawing.analysis_status] ?? statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blueprint-light">
          <Image className="h-5 w-5 text-primary" />
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <h3 className="mt-3 text-sm font-medium text-foreground truncate">{drawing.file_name}</h3>
      <p className="text-xs text-muted-foreground mt-1">
        {(drawing.file_size / 1024).toFixed(0)} KB • {new Date(drawing.created_at).toLocaleDateString()}
      </p>
      <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
        <StatusIcon className={`h-3.5 w-3.5 ${drawing.analysis_status === "analyzing" ? "animate-spin" : ""}`} />
        {status.label}
      </div>
    </motion.div>
  );
}
