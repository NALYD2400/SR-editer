-- Fix models-library storage uploads:
-- authenticated cannot SELECT superadmin_access (REVOKE ALL), so storage
-- policies that subquery it raise "permission denied for table superadmin_access".
-- Use a security definer helper (same pattern as public.is_admin()).

create or replace function public.has_library_console_access()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.superadmin_access access
    join public.profiles profile on profile.user_id = access.user_id
    where access.user_id = auth.uid()
      and profile.role is distinct from 'suspendu'
      and (
        access.level = 'owner'
        or coalesce((access.permissions ->> 'library')::boolean, false)
      )
  );
end;
$$;

revoke all on function public.has_library_console_access() from public;
grant execute on function public.has_library_console_access() to authenticated;

insert into storage.buckets (id, name, public)
values ('models-library', 'models-library', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Allow public read access to models storage" on storage.objects;
drop policy if exists "Allow admins to insert models storage" on storage.objects;
drop policy if exists "Allow admins to update models storage" on storage.objects;
drop policy if exists "Allow admins to delete models storage" on storage.objects;

create policy "Allow public read access to models storage"
on storage.objects for select
to public
using (bucket_id = 'models-library');

create policy "Console library operators can insert models"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'models-library'
  and public.has_library_console_access()
);

create policy "Console library operators can update models"
on storage.objects for update
to authenticated
using (
  bucket_id = 'models-library'
  and public.has_library_console_access()
)
with check (
  bucket_id = 'models-library'
  and public.has_library_console_access()
);

create policy "Console library operators can delete models"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'models-library'
  and public.has_library_console_access()
);
