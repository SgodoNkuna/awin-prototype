
-- Attach Tseleng's profile card
UPDATE public.team_members
SET profile_card_url = '/__l5e/assets-v1/616b15cb-3680-447d-8c81-935bd81eb04f/tseleng-thamaga.jpg'
WHERE lower(name) LIKE '%tseleng%thamaga%';

-- Auto-promote the seeded admin account
CREATE OR REPLACE FUNCTION public.auto_promote_seeded_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'admin@awin.test' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_promote_seeded_admin_trg ON auth.users;
CREATE TRIGGER auto_promote_seeded_admin_trg
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_promote_seeded_admin();

-- Retroactive promotion if the account already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin@awin.test'
ON CONFLICT (user_id, role) DO NOTHING;
