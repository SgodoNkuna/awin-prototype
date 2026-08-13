-- The 'documents' storage bucket was never actually created — only its RLS
-- policies were (see 20260603210810 and 20260618000936), causing every
-- upload/download/delete through Admin > Documents and the member portal's
-- document downloads to fail with "Bucket not found". Already applied
-- directly to the live database; this file brings repo history in sync.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 20971520)
on conflict (id) do nothing;
