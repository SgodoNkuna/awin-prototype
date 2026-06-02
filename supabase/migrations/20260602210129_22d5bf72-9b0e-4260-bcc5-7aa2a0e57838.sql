
CREATE TYPE public.membership_tier AS ENUM ('general', 'active', 'patron');
CREATE TYPE public.investment_experience AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  id_number text NOT NULL,
  occupation text NOT NULL,
  employer text,
  experience public.investment_experience NOT NULL,
  motivation text NOT NULL,
  referral text,
  tier public.membership_tier NOT NULL,
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.applications TO anon, authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit applications" ON public.applications FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
