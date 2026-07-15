-- Keep public.profiles aligned with every Supabase Auth account.
-- Required by both the desktop app and the customer portal.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
begin
  account_email := lower(coalesce(new.email, new.raw_user_meta_data ->> 'email'));

  if account_email is null or btrim(account_email) = '' then
    raise exception 'SR Editer requires an email address for every account';
  end if;

  insert into public.profiles (user_id, email)
  values (new.id, account_email)
  on conflict (user_id) do update
  set email = excluded.email;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Repair accounts created before the trigger was versioned.
insert into public.profiles (user_id, email)
select auth_user.id, lower(auth_user.email)
from auth.users as auth_user
where auth_user.email is not null
  and not exists (
    select 1
    from public.profiles as profile
    where profile.user_id = auth_user.id
  )
on conflict (user_id) do nothing;
