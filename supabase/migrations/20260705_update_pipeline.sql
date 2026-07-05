create table if not exists public.release_records (
  version text primary key,
  notes text not null default '',
  artifact_url text not null,
  signature text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.release_records add column if not exists notes text not null default '';
alter table public.release_records add column if not exists artifact_url text;
alter table public.release_records add column if not exists signature text;
alter table public.release_records add column if not exists published boolean not null default false;
alter table public.release_records add column if not exists created_at timestamptz not null default now();
alter table public.release_records add column if not exists updated_at timestamptz not null default now();

alter table public.release_records enable row level security;
revoke all on public.release_records from anon, authenticated;

create index if not exists release_records_published_updated_idx
  on public.release_records (published, updated_at desc);

-- Corrige les profils créés automatiquement par un trigger Auth : la fonction
-- admin-users effectue désormais un UPSERT sur user_id au lieu d'un INSERT.
-- Cette requête supprime uniquement d'éventuels doublons orphelins sans Auth.
delete from public.profiles profile
where profile.user_id is null
  and exists (
    select 1
    from public.profiles linked
    where linked.user_id is not null
      and lower(linked.email) = lower(profile.email)
  );
