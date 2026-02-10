import { motion } from "framer-motion";
import { FolderOpen, Image, DoorOpen } from "lucide-react";

interface StatsCardsProps {
  projects: number;
  drawings: number;
  rooms: number;
}

export default function StatsCards({ projects, drawings, rooms }: StatsCardsProps) {
  const stats = [
    { label: "Projects", value: projects, icon: FolderOpen, color: "bg-blueprint-light text-primary" },
    { label: "Drawings", value: drawings, icon: Image, color: "bg-accent/10 text-accent" },
    { label: "Rooms Detected", value: rooms, icon: DoorOpen, color: "bg-success/10 text-success" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-heading text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
