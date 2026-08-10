-- Migration: Table de logs de sécurité et d'intrusions (SIEM)

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  origin text,
  ip_address text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_created_at_idx on public.security_events (created_at desc);
create index if not exists security_events_severity_idx on public.security_events (severity, created_at desc);

alter table public.security_events enable row level security;

revoke all on public.security_events from anon, authenticated;

-- Seuls les superadmins/owners peuvent lire les logs de sécurité
create policy "Superadmins can read security events"
on public.security_events for select
to authenticated
using (
  exists (
    select 1 from public.superadmin_access sa
    where sa.user_id = auth.uid()
  )
  or (select role from public.profiles where user_id = auth.uid()) = 'admin'
);
