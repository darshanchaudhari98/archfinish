import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, FileText, Image as ImageIcon } from "lucide-react";

interface Drawing {
  id: string;
  file_name: string;
  storage_path: string;
}

interface RoomLite {
  id: string;
  name: string;
  room_type: string | null;
  space_tag: string | null;
}

interface Props {
  drawing: Drawing | null;
  rooms: RoomLite[];
  highlightedRoomId: string | null;
  onHighlightRoom: (id: string | null) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

export default function DrawingViewer({ drawing, rooms, highlightedRoomId, onHighlightRoom }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [showAnnotations, setShowAnnotations] = useState(true);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const { data: signedUrl } = useQuery({
    queryKey: ["drawing-url", drawing?.id],
    enabled: !!drawing,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("drawings")
        .createSignedUrl(drawing!.storage_path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  const isPdf = !!drawing && /\.pdf$/i.test(drawing.file_name);

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    reset();
  }, [drawing?.id, reset]);

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setZoom((z) => {
      const next = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
      const k = next / z;
      setOffset((o) => ({ x: px - (px - o.x) * k, y: py - (py - o.y) * k }));
      return next;
    });
  }, []);

  const wheelRef = useRef((e: WheelEvent) => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-dy * 0.0015));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isPdf) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isPdf]);

  const zoomButton = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor);
  };

  if (!drawing) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
        <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Upload a drawing for this floor to view it here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {isPdf ? (
            <FileText className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <ImageIcon className="h-4 w-4 text-primary shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground truncate">{drawing.file_name}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isPdf && (
            <>
              <Badge variant="secondary" className="mr-1 text-[10px]">
                {Math.round(zoom * 100)}%
              </Badge>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => zoomButton(1 / 1.3)}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => zoomButton(1.3)}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={reset}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setShowAnnotations((s) => !s)}
          >
            {showAnnotations ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            AI annotations
          </Button>
        </div>
      </div>

      {isPdf ? (
        signedUrl ? (
          <iframe src={signedUrl} title={drawing.file_name} className="w-full h-[540px] bg-muted" />
        ) : (
          <div className="h-[540px] bg-muted animate-pulse" />
        )
      ) : (
        <div
          ref={containerRef}
          className="relative h-[540px] overflow-hidden bg-muted cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onPointerDown={(e) => {
            dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
          }}
          onPointerUp={() => (dragRef.current = null)}
          onPointerLeave={() => (dragRef.current = null)}
        >
          {signedUrl ? (
            <img
              src={signedUrl}
              alt={`Architectural drawing ${drawing.file_name}`}
              draggable={false}
              className="max-w-none select-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-muted" />
          )}
        </div>
      )}

      {showAnnotations && rooms.length > 0 && (
        <div className="border-t border-border bg-card/60 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Detected spaces — click to highlight in the schedule
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onHighlightRoom(highlightedRoomId === room.id ? null : room.id)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  highlightedRoomId === room.id
                    ? "border-primary bg-primary/15 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {room.name}
                {room.space_tag ? ` · ${room.space_tag}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
