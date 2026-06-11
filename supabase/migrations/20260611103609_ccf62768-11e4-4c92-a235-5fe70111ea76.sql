
-- Add 'submitted' and 'under_review' values; keep existing pending/approved/rejected
ALTER TYPE public.application_status ADD VALUE IF NOT EXISTS 'under_review' BEFORE 'approved';

-- Timestamp fields for status timeline
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill submitted_at to created_at for existing rows
UPDATE public.applications SET submitted_at = created_at WHERE submitted_at IS DISTINCT FROM created_at;

-- Trigger to maintain timestamps on status change
CREATE OR REPLACE FUNCTION public.applications_track_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, now());
    NEW.status_updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at := now();
    IF NEW.status = 'under_review' AND NEW.reviewed_at IS NULL THEN
      NEW.reviewed_at := now();
    END IF;
    IF NEW.status IN ('approved','rejected') AND NEW.decided_at IS NULL THEN
      NEW.decided_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_applications_track_status ON public.applications;
CREATE TRIGGER trg_applications_track_status
BEFORE INSERT OR UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.applications_track_status();
