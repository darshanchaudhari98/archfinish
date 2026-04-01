import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  projectId: string;
}

export default function DrawingUploader({ projectId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const uploadAndAnalyze = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true);
      setProgress("Uploading...");

      const storagePath = `${user!.id}/${projectId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("drawings")
        .upload(storagePath, file);
      if (uploadError) throw uploadError;

      setProgress("Saving record...");
      const { data: drawing, error: insertError } = await supabase
        .from("drawings")
        .insert({
          project_id: projectId,
          user_id: user!.id,
          file_name: file.name,
          storage_path: storagePath,
          file_size: file.size,
          analysis_status: "analyzing",
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Convert file to base64 for AI analysis
      setProgress("Analyzing with AI...");
      const base64 = await fileToBase64(file);

      try {
        const { data: analysisData, error: fnError } = await supabase.functions.invoke(
          "analyze-drawing",
          {
            body: {
              imageBase64: base64,
              drawingId: drawing.id,
              projectId,
              userId: user!.id,
              fileName: file.name,
            },
          }
        );
        if (fnError) throw fnError;

        await supabase
          .from("drawings")
          .update({ analysis_status: "completed" })
          .eq("id", drawing.id);

        setProgress("Done!");
        return analysisData;
      } catch (err) {
        await supabase
          .from("drawings")
          .update({ analysis_status: "failed" })
          .eq("id", drawing.id);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings", projectId] });
      queryClient.invalidateQueries({ queryKey: ["rooms", projectId] });
      toast({ title: "Drawing uploaded & analyzed!" });
      setUploading(false);
      setProgress("");
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setUploading(false);
      setProgress("");
    },
  });

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) {
        uploadAndAnalyze.mutate(accepted[0]);
      }
    },
    [uploadAndAnalyze]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
        isDragActive
          ? "border-primary bg-blueprint-light"
          : uploading
          ? "border-border bg-muted/50 cursor-wait"
          : "border-border hover:border-primary/50 hover:bg-blueprint-light/50"
      }`}
    >
      <input {...getInputProps()} />
      <AnimatePresence mode="wait">
        {uploading ? (
          <motion.div
            key="uploading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-foreground">{progress}</p>
            <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blueprint-light">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <p className="text-base font-medium text-foreground">
              {isDragActive ? "Drop your drawing here" : "Drag & drop an architectural drawing"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              PNG, JPG, WEBP, PDF up to 20MB • AI will extract room data automatically
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}
