
CREATE TABLE public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  summary text,
  body text,
  cover_image text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  member_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT ALL ON public.portfolio_items TO service_role;

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published portfolio items"
  ON public.portfolio_items FOR SELECT
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert portfolio items"
  ON public.portfolio_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update portfolio items"
  ON public.portfolio_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete portfolio items"
  ON public.portfolio_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX portfolio_items_status_sort_idx ON public.portfolio_items (status, sort_order, created_at DESC);

-- Seed a few sample published items so the carousel and grid render
INSERT INTO public.portfolio_items (title, slug, summary, body, cover_image, social_links, status, sort_order) VALUES
  ('Thabo Capital', 'thabo-capital', 'Boutique advisory helping women build property portfolios across SA.', 'Thabo Capital partners with A-WIN members to source, finance, and manage residential and small commercial property in Gauteng and the Western Cape.', null, '{"instagram":"https://instagram.com/thabocapital","linkedin":"https://linkedin.com/company/thabocapital","website":"https://thabocapital.example"}'::jsonb, 'published', 10),
  ('Lerato Ventures', 'lerato-ventures', 'Early-stage fund backing female founders in fintech and edtech.', 'Lerato Ventures writes R250k–R2m cheques into pre-seed African startups led by women, with hands-on operating support.', null, '{"linkedin":"https://linkedin.com/company/leratoventures","twitter":"https://twitter.com/leratovc","website":"https://leratoventures.example"}'::jsonb, 'published', 20),
  ('Naledi & Co.', 'naledi-and-co', 'Independent wealth planners for first-generation wealth builders.', 'Naledi & Co. offers fee-only financial planning, focused on women navigating their first inheritance, business exit, or windfall.', null, '{"instagram":"https://instagram.com/nalediandco","website":"https://nalediandco.example"}'::jsonb, 'published', 30),
  ('Imbali Studio', 'imbali-studio', 'Brand and digital studio for women-led businesses.', 'Imbali Studio designs identities, websites, and launch campaigns for women founders across the continent.', null, '{"instagram":"https://instagram.com/imbalistudio","website":"https://imbalistudio.example"}'::jsonb, 'published', 40),
  ('Zola Wellness', 'zola-wellness', 'Holistic wellness retreats for women in leadership.', 'Quarterly retreats combining financial wellness, mindfulness, and movement — designed for women carrying senior roles.', null, '{"instagram":"https://instagram.com/zolawellness","website":"https://zolawellness.example"}'::jsonb, 'published', 50),
  ('Asha Agritech', 'asha-agritech', 'AgriTech startup unlocking finance for women farmers.', 'Asha Agritech provides input financing and market access for smallholder women farmers in KZN and the Eastern Cape.', null, '{"linkedin":"https://linkedin.com/company/ashaagritech","website":"https://ashaagritech.example"}'::jsonb, 'published', 60);
