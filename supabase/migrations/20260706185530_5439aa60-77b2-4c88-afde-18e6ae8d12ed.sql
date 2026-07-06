GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.team_members TO anon, authenticated;
GRANT SELECT ON public.news_articles TO anon, authenticated;
GRANT SELECT ON public.portfolio_items TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.membership_tiers TO anon, authenticated;
GRANT ALL ON public.events, public.team_members, public.news_articles, public.portfolio_items, public.site_settings, public.membership_tiers TO service_role;