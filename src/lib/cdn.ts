/**
 * Public URLs for site media mirrored into the Supabase `gallery` bucket
 * (see scripts/mirror-lovable-assets.mjs). Replaces Lovable's *.asset.json
 * imports, whose /__l5e/ URLs only resolve inside Lovable's preview.
 */
const BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/assets/`;

/** asset("wcw/wcw-1.jpeg") → full public URL on Supabase storage. */
export const asset = (relPath: string): string => BASE + relPath;
