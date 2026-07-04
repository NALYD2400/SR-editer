create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'membre' check (role in ('membre', 'moderateur', 'admin', 'suspendu')),
  write_mode text not null default 'direct' check (write_mode in ('direct', 'draft')),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'membre';
alter table public.profiles add column if not exists write_mode text not null default 'direct';
alter table public.profiles add column if not exists created_at timestamptz not null default now();

update public.profiles as profile
set user_id = auth_user.id
from auth.users as auth_user
where profile.user_id is null and lower(profile.email) = lower(auth_user.email);

create unique index if not exists profiles_user_id_key on public.profiles(user_id);
create unique index if not exists profiles_email_key on public.profiles(lower(email));

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_self" on public.profiles;
create policy "profiles_read_self"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
