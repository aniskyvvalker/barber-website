-- Migration: add is_read column to appointments
-- Run this against your Supabase database (SQL editor or psql)

-- 1) Add column if not exists with default false
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- 2) Backfill existing NULLs to false (idempotent)
UPDATE public.appointments
SET is_read = false
WHERE is_read IS NULL;

-- 3) (Optional) Make column NOT NULL if you want a strict schema
-- ALTER TABLE public.appointments
-- ALTER COLUMN is_read SET NOT NULL;

-- 4) (Optional) Index to speed queries by is_read
CREATE INDEX IF NOT EXISTS idx_appointments_is_read
ON public.appointments USING btree (is_read);
