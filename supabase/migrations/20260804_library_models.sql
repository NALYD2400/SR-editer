-- Bibliothèque modèles 3D (skins, véhicules, peds, armes, props)
-- Previews (image/glb) → Storage public models-library
-- Packs → Storage + sync Google Drive optionnelle (secrets edge)

create table if not exists public.library_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null default '',
  preview_image_url text,
  preview_glb_url text,
  pack_storage_path text,
  pack_public_url text,
  pack_drive_file_id text,
  pack_drive_url text,
  pack_size_bytes bigint not null default 0,
  pack_file_count integer not null default 0,
  status text not null default 'published'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_models_category_idx on public.library_models (category);
create index if not exists library_models_created_at_idx on public.library_models (created_at desc);

alter table public.library_models enable row level security;

revoke all on public.library_models from anon, authenticated;
grant select on public.library_models to authenticated;

drop policy if exists "Allow read published models for authenticated users" on public.library_models;
create policy "Allow read published models for authenticated users"
on public.library_models for select
to authenticated
using (status = 'published');

insert into storage.buckets (id, name, public)
values ('models-library', 'models-library', true)
on conflict (id) do nothing;

drop policy if exists "Allow public read access to models storage" on storage.objects;
create policy "Allow public read access to models storage"
on storage.objects for select
to public
using (bucket_id = 'models-library');

drop policy if exists "Allow admins to insert models storage" on storage.objects;
create policy "Allow admins to insert models storage"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'models-library'
  and (
    exists (select 1 from public.superadmin_access sa where sa.user_id = auth.uid())
    or (select role from public.profiles where user_id = auth.uid()) = 'admin'
  )
);

drop policy if exists "Allow admins to update models storage" on storage.objects;
create policy "Allow admins to update models storage"
on storage.objects for update
to authenticated
using (
  bucket_id = 'models-library'
  and (
    exists (select 1 from public.superadmin_access sa where sa.user_id = auth.uid())
    or (select role from public.profiles where user_id = auth.uid()) = 'admin'
  )
);

drop policy if exists "Allow admins to delete models storage" on storage.objects;
create policy "Allow admins to delete models storage"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'models-library'
  and (
    exists (select 1 from public.superadmin_access sa where sa.user_id = auth.uid())
    or (select role from public.profiles where user_id = auth.uid()) = 'admin'
  )
);
