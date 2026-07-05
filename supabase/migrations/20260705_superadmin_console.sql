create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_licenses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio', 'lifetime')),
  status text not null default 'active' check (status in ('trialing', 'active', 'past_due', 'canceled', 'suspended')),
  device_limit integer not null default 1 check (device_limit between 1 and 25),
  expires_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.device_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null,
  device_name text,
  app_version text,
  revoked boolean not null default false,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_hash)
);

create table if not exists public.superadmin_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level text not null default 'collaborator' check (level in ('owner', 'collaborator')),
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_kind text not null check (author_kind in ('user', 'admin')),
  content text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.release_records (
  version text primary key,
  notes text not null default '',
  artifact_url text not null,
  signature text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;
alter table public.customer_licenses enable row level security;
alter table public.device_activations enable row level security;
alter table public.superadmin_access enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.contact_messages enable row level security;
alter table public.release_records enable row level security;

revoke all on public.admin_audit_logs, public.customer_licenses, public.device_activations, public.superadmin_access,
  public.support_tickets, public.support_messages, public.contact_messages,
  public.release_records from anon, authenticated;

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets(status, updated_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages(status, created_at desc);
create index if not exists device_activations_user_idx on public.device_activations(user_id, last_seen_at desc);

insert into public.superadmin_access (user_id, level, permissions)
select user_id, 'owner', '{"console":true,"users":true,"licenses":true,"support":true,"contacts":true,"releases":true,"audit":true,"system":true,"team":true}'::jsonb
from public.profiles
where role = 'admin' and user_id is not null
order by created_at asc
limit 1
on conflict (user_id) do nothing;
