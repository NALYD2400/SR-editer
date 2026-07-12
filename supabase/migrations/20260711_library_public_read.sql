-- Public catalog browse (right-click save image works for guests).
-- Uploads / upserts stay admin-only via edge function + storage policies.

grant select on public.library_textures to anon;

drop policy if exists "Allow read access to textures for authenticated users" on public.library_textures;

create policy "Allow public read access to library_textures"
on public.library_textures
for select
to anon, authenticated
using (true);
