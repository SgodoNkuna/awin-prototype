
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.applications(id) ON DELETE SET NULL,
  tier text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  provider text NOT NULL DEFAULT 'payfast',
  m_payment_id text NOT NULL UNIQUE,
  pf_payment_id text,
  email text,
  full_name text,
  raw_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX payments_user_id_idx ON public.payments(user_id);
CREATE INDEX payments_status_idx ON public.payments(status);
CREATE INDEX payments_created_at_idx ON public.payments(created_at DESC);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'payfast',
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  m_payment_id text,
  pf_payment_id text,
  payload jsonb NOT NULL,
  source_ip text,
  signature_valid boolean NOT NULL DEFAULT false,
  source_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  last_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_webhook_events TO authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook events" ON public.payment_webhook_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage webhook events" ON public.payment_webhook_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX webhook_events_processed_idx ON public.payment_webhook_events(processed, created_at DESC);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  reason text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND actor_id = auth.uid());
CREATE INDEX audit_logs_target_idx ON public.audit_logs(target_type, target_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.membership_status IS DISTINCT FROM OLD.membership_status
     OR NEW.membership_tier IS DISTINCT FROM OLD.membership_tier
     OR NEW.suspended IS DISTINCT FROM OLD.suspended
     OR NEW.joined_at IS DISTINCT FROM OLD.joined_at
     OR NEW.membership_expires_at IS DISTINCT FROM OLD.membership_expires_at
     OR NEW.last_payment_at IS DISTINCT FROM OLD.last_payment_at THEN
    RAISE EXCEPTION 'Privileged profile fields can only be changed by an admin';
  END IF;
  RETURN NEW;
END;
$function$;

INSERT INTO public.membership_tiers (tier, name, price_zar, benefits, featured, active) VALUES
  ('general'::public.membership_tier, 'General Member', 500,
    '["Monthly newsletter","Public events","Community forum","Resources library"]'::jsonb, false, true),
  ('active'::public.membership_tier, 'Active Member', 1500,
    '["Everything in General","Voting rights at AGM","Member-only workshops","Investment club participation","Mentorship matching","Discounted event tickets"]'::jsonb, true, true),
  ('patron'::public.membership_tier, 'Patron Member', 5000,
    '["Everything in Active","Priority access to all events","1-on-1 advisory sessions","Patron-only summits","Donor wall recognition","Direct executive line"]'::jsonb, false, true)
ON CONFLICT DO NOTHING;
