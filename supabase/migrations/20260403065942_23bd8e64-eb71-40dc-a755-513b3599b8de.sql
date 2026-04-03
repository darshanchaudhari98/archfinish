
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS floor_level text DEFAULT '',
  ADD COLUMN IF NOT EXISTS space_tag text DEFAULT '',
  ADD COLUMN IF NOT EXISTS flooring_size text DEFAULT '',
  ADD COLUMN IF NOT EXISTS flooring_finish text DEFAULT '',
  ADD COLUMN IF NOT EXISTS flooring_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS flooring_make text DEFAULT '',
  ADD COLUMN IF NOT EXISTS flooring_rate text DEFAULT '',
  ADD COLUMN IF NOT EXISTS skirting_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS skirting_make text DEFAULT '',
  ADD COLUMN IF NOT EXISTS skirting_rate text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ceiling_material_2 text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ceiling_size text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ceiling_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ceiling_make text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ceiling_rate text DEFAULT '',
  ADD COLUMN IF NOT EXISTS remark text DEFAULT '';
