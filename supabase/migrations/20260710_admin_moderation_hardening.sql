-- Run this migration in the Supabase SQL editor before deploying the matching
-- admin-users Edge Function. It keeps end-user support access scoped to the
-- authenticated owner while the Edge Function remains the only admin channel.

alter table public.profiles
add column if not exists app_permissions jsonb not null default '{
  "project": true,
  "explorer": true,
  "converter": true,
  "assets": true,
  "materials": true,
  "textures": true,
  "modeling": true,
  "library": true,
  "ai": true,
  "settings": true
}'::jsonb;

alter table public.profiles
alter column app_permissions set default '{
  "project": true,
  "explorer": true,
  "converter": true,
  "assets": true,
  "materials": true,
  "textures": true,
  "modeling": true,
  "library": true,
  "ai": true,
  "settings": true
}'::jsonb;

update public.profiles
set app_permissions = app_permissions || '{"converter": true}'::jsonb
where not (app_permissions ? 'converter');

grant select, insert on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;

drop policy if exists "support_tickets_read_own" on public.support_tickets;
create policy "support_tickets_read_own"
on public.support_tickets for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "support_tickets_create_own" on public.support_tickets;
create policy "support_tickets_create_own"
on public.support_tickets for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "support_messages_read_own_ticket" on public.support_messages;
create policy "support_messages_read_own_ticket"
on public.support_messages for select
to authenticated
using (
  exists (
    select 1 from public.support_tickets ticket
    where ticket.id = support_messages.ticket_id
      and ticket.user_id = (select auth.uid())
  )
);

drop policy if exists "support_messages_create_own_ticket" on public.support_messages;
create policy "support_messages_create_own_ticket"
on public.support_messages for insert
to authenticated
with check (
  author_user_id = (select auth.uid())
  and author_kind = 'user'
  and exists (
    select 1 from public.support_tickets ticket
    where ticket.id = support_messages.ticket_id
      and ticket.user_id = (select auth.uid())
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_tickets'
  ) then
    alter publication supabase_realtime add table public.support_tickets;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end
$$;

drop policy if exists "Allow admins to insert textures storage" on storage.objects;
drop policy if exists "Allow admins to update textures storage" on storage.objects;
drop policy if exists "Allow admins to delete textures storage" on storage.objects;

create policy "Console library operators can insert textures"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'textures-library'
  and exists (
    select 1
    from public.superadmin_access access
    join public.profiles profile on profile.user_id = access.user_id
    where access.user_id = (select auth.uid())
      and profile.role <> 'suspendu'
      and (access.level = 'owner' or coalesce((access.permissions ->> 'library')::boolean, false))
  )
);

create policy "Console library operators can update textures"
on storage.objects for update
to authenticated
using (
  bucket_id = 'textures-library'
  and exists (
    select 1
    from public.superadmin_access access
    join public.profiles profile on profile.user_id = access.user_id
    where access.user_id = (select auth.uid())
      and profile.role <> 'suspendu'
      and (access.level = 'owner' or coalesce((access.permissions ->> 'library')::boolean, false))
  )
)
with check (
  bucket_id = 'textures-library'
  and exists (
    select 1
    from public.superadmin_access access
    join public.profiles profile on profile.user_id = access.user_id
    where access.user_id = (select auth.uid())
      and profile.role <> 'suspendu'
      and (access.level = 'owner' or coalesce((access.permissions ->> 'library')::boolean, false))
  )
);

create policy "Console library operators can delete textures"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'textures-library'
  and exists (
    select 1
    from public.superadmin_access access
    join public.profiles profile on profile.user_id = access.user_id
    where access.user_id = (select auth.uid())
      and profile.role <> 'suspendu'
      and (access.level = 'owner' or coalesce((access.permissions ->> 'library')::boolean, false))
  )
);
