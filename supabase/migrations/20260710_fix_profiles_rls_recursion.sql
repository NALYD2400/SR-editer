-- Fix infinite recursion in public.profiles RLS policies by using a security definer function.
-- This function runs with the privileges of the creator (bypassing RLS on public.profiles).

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Drop the old recursive policies
drop policy if exists "profiles_admin_select" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;

-- Recreate the policies using the security definer function
create policy "profiles_admin_select"
on public.profiles for select
to authenticated
using (public.is_admin());

create policy "profiles_admin_update"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
