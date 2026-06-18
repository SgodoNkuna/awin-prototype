-- 1. Tighten storage SELECT on private 'documents' bucket
DROP POLICY IF EXISTS "Authenticated read document files" ON storage.objects;

CREATE POLICY "Members read allowed document files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND (
          d.visibility = 'public'
          OR (
            d.visibility = 'members'
            AND EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.membership_status = 'active'
                AND p.suspended = false
            )
          )
        )
    )
  )
);

CREATE POLICY "Public document files readable by anyone"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.file_path = storage.objects.name
      AND d.visibility = 'public'
  )
);

-- 2. Prevent users from self-promoting privileged profile fields
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.membership_status IS DISTINCT FROM OLD.membership_status
     OR NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
     OR NEW.suspended IS DISTINCT FROM OLD.suspended
     OR NEW.joined_at IS DISTINCT FROM OLD.joined_at THEN
    RAISE EXCEPTION 'Privileged profile fields can only be changed by an admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Explicit admin-only management policy on user_roles (defense in depth)
DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles;
CREATE POLICY "Admins manage user_roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Replace `WITH CHECK (true)` on public insert policies with input-shape checks
DROP POLICY IF EXISTS "Anyone can register" ON public.event_registrations;
CREATE POLICY "Anyone can register"
ON public.event_registrations FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(full_name) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 200
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applications;
CREATE POLICY "Anyone can submit applications"
ON public.applications FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(full_name) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 200
  AND char_length(motivation) BETWEEN 1 AND 5000
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
ON public.contact_messages FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(name) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 200
  AND char_length(subject) BETWEEN 1 AND 200
  AND char_length(message) BETWEEN 1 AND 5000
);

-- 5. Restrict EXECUTE on SECURITY DEFINER has_role — keep grant only where RLS needs it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;