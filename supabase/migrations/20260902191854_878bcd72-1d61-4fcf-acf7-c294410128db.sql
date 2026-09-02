CREATE TABLE public.floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Ground Floor',
  level_order integer NOT NULL DEFAULT 0,
  notes text DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.floors TO authenticated;
GRANT ALL ON public.floors TO service_role;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own floors" ON public.floors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own floors" ON public.floors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own floors" ON public.floors FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own floors" ON public.floors FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON public.floors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.drawings ADD COLUMN floor_id uuid REFERENCES public.floors(id) ON DELETE SET NULL;
ALTER TABLE public.rooms ADD COLUMN floor_id uuid REFERENCES public.floors(id) ON DELETE SET NULL;

CREATE TABLE public.room_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  floor_id uuid REFERENCES public.floors(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  surface text NOT NULL DEFAULT 'floor',
  detected_finish text DEFAULT ''::text,
  recommended_finish text NOT NULL DEFAULT ''::text,
  tier text NOT NULL DEFAULT 'standard',
  rationale text DEFAULT ''::text,
  durability text DEFAULT ''::text,
  maintenance text DEFAULT ''::text,
  moisture_slip text DEFAULT ''::text,
  cost_note text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_recommendations TO authenticated;
GRANT ALL ON public.room_recommendations TO service_role;
ALTER TABLE public.room_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" ON public.room_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own recommendations" ON public.room_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recommendations" ON public.room_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recommendations" ON public.room_recommendations FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_room_recommendations_updated_at BEFORE UPDATE ON public.room_recommendations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_floors_project ON public.floors(project_id);
CREATE INDEX idx_drawings_floor ON public.drawings(floor_id);
CREATE INDEX idx_rooms_floor ON public.rooms(floor_id);
CREATE INDEX idx_recs_room ON public.room_recommendations(room_id);