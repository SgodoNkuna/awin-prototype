-- Client request (Phume Ndumo, ThuthukaSA, 2026-10-06): only one named
-- A-Win person (Tebogo) may approve new ThuthukaSA advisors. General A-Win
-- admins are not trusted on ThuthukaSA's side. 'tksa_manager' marks that
-- approver; it is granted only by support, never from the UI.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tksa_manager';
