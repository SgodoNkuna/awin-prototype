-- event_gallery had a hardcoded category check constraint (hike/wcw/
-- coaching/other only) even though admin.gallery.tsx's UI explicitly lets
-- an admin type any new category via "+ New category" — using that button
-- would have failed with a constraint violation the moment someone tried
-- it. Categories are admin-curated free text, not a fixed enum; drop the
-- constraint so the UI's own stated capability actually works.
alter table public.event_gallery drop constraint if exists event_gallery_category_check;
