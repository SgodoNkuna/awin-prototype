-- Client request (Wisani, ThuthukaSA, 2026-08-09): LOA/RPA submissions must
-- be visible only to ThuthukaSA (the FSP), never to A-Win committee members
-- holding the generic 'admin' role. Adds a distinct 'advisor' role so access
-- can be scoped to ThuthukaSA staff specifically.
--
-- ALTER TYPE ... ADD VALUE must run in its own migration/transaction — a
-- later migration in the same run may reference 'advisor' in RLS policies.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advisor';
