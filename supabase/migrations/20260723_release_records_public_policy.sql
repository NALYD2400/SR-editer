-- Migration pour autoriser la lecture publique (anon / authenticated) des releases publiées sur public.release_records

grant select on public.release_records to anon, authenticated;

drop policy if exists "Allow public select for published releases" on public.release_records;

create policy "Allow public select for published releases"
  on public.release_records for select
  to anon, authenticated
  using (published = true);
