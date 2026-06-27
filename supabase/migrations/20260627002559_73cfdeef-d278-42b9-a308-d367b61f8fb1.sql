
-- Duplicate-application prevention: also cover id_number across active/approved statuses.
CREATE UNIQUE INDEX IF NOT EXISTS applications_unique_active_id_number
  ON public.applications (id_number)
  WHERE id_number IS NOT NULL
    AND status IN ('pending'::application_status, 'under_review'::application_status, 'approved'::application_status);

-- Event RSVP status + cancellation support.
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','cancelled'));

CREATE INDEX IF NOT EXISTS idx_event_regs_event_status
  ON public.event_registrations (event_id, status);
