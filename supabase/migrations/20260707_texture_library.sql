-- Create the library_textures table
create table if not exists public.library_textures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  color text not null,
  url text not null,
  created_at timestamptz not null default now()
);

-- Create the library_favorites table
create table if not exists public.library_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  texture_id uuid not null references public.library_textures(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, texture_id)
);

-- Enable Row Level Security (RLS)
alter table public.library_textures enable row level security;
alter table public.library_favorites enable row level security;

-- Revoke all direct permissions from public/anon/authenticated by default
revoke all on public.library_textures, public.library_favorites from anon, authenticated;

-- Grant select to authenticated users for textures
grant select on public.library_textures to authenticated;

-- Grant select, insert, delete to authenticated users for favorites
grant select, insert, delete on public.library_favorites to authenticated;

-- RLS Policies for library_textures
create policy "Allow read access to textures for authenticated users"
on public.library_textures for select
to authenticated
using (true);

-- RLS Policies for library_favorites
create policy "Allow users to read their own favorites"
on public.library_favorites for select
to authenticated
using (auth.uid() = user_id);

create policy "Allow users to insert their own favorites"
on public.library_favorites for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Allow users to delete their own favorites"
on public.library_favorites for delete
to authenticated
using (auth.uid() = user_id);

-- Create public bucket for textures-library if not exists
insert into storage.buckets (id, name, public)
values ('textures-library', 'textures-library', true)
on conflict (id) do nothing;

-- Storage Policies for textures-library bucket
-- Allow public access to read files
create policy "Allow public read access to textures storage"
on storage.objects for select
to public
using (bucket_id = 'textures-library');

-- Allow admins to insert files
create policy "Allow admins to insert textures storage"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'textures-library'
  and (select role from public.profiles where user_id = auth.uid()) = 'admin'
);

-- Allow admins to update files
create policy "Allow admins to update textures storage"
on storage.objects for update
to authenticated
using (
  bucket_id = 'textures-library'
  and (select role from public.profiles where user_id = auth.uid()) = 'admin'
);

-- Allow admins to delete files
create policy "Allow admins to delete textures storage"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'textures-library'
  and (select role from public.profiles where user_id = auth.uid()) = 'admin'
);

-- Update default app_permissions constraint/default on profiles
alter table public.profiles
alter column app_permissions set default '{
  "project": true,
  "explorer": true,
  "assets": true,
  "materials": true,
  "textures": true,
  "ai": true,
  "settings": true,
  "library": true
}'::jsonb;

-- Merge "library": true into existing app_permissions for all profiles
update public.profiles
set app_permissions = app_permissions || '{"library": true}'::jsonb
where not (app_permissions ? 'library');

-- Merge "library": true into existing superadmin_access permissions
update public.superadmin_access
set permissions = permissions || '{"library": true}'::jsonb
where not (permissions ? 'library');
