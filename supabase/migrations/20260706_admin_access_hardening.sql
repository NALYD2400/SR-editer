-- Keep the virtual "owner" role consistent: owners are administrators in the
-- desktop profile and receive their console authority from superadmin_access.
update public.profiles as profile
set role = 'admin'
from public.superadmin_access as access
where access.user_id = profile.user_id
  and access.level = 'owner'
  and profile.role <> 'admin';

-- Profile changes must reach connected desktop clients immediately so a
-- suspension, write-mode change or page restriction takes effect live.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end
$$;

comment on table public.superadmin_access is
'Autorité de la superconsole. Le rôle profiles.admin seul ne donne aucun accès à la console.';
