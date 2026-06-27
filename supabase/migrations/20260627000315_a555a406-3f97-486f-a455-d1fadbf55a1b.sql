
-- Deduplicate then enforce uniqueness for applications & event registrations.

-- Applications: keep newest pending/under_review/approved per email
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(email) ORDER BY created_at DESC) AS rn
  FROM public.applications
  WHERE status IN ('pending','under_review','approved')
)
DELETE FROM public.applications a USING ranked r WHERE a.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS applications_unique_active_email
  ON public.applications (lower(email))
  WHERE status IN ('pending','under_review','approved');

-- Event registrations: dedupe by (event_id, user_id)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id, user_id ORDER BY created_at DESC) AS rn
  FROM public.event_registrations
  WHERE user_id IS NOT NULL
)
DELETE FROM public.event_registrations er USING ranked r WHERE er.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_unique_user
  ON public.event_registrations (event_id, user_id)
  WHERE user_id IS NOT NULL;

-- Event registrations: dedupe by (event_id, lower(email))
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY event_id, lower(email) ORDER BY created_at DESC) AS rn
  FROM public.event_registrations
  WHERE email IS NOT NULL
)
DELETE FROM public.event_registrations er USING ranked r WHERE er.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_unique_email
  ON public.event_registrations (event_id, lower(email))
  WHERE email IS NOT NULL;
