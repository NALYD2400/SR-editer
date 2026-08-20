-- Migration: Correction des permissions RLS sur library_models et superadmin_access
-- Évite l'erreur 42501 (permission denied for table superadmin_access) lors de la lecture du catalogue

-- 1. Autoriser la lecture de son propre statut superadmin
grant select on public.superadmin_access to authenticated;

drop policy if exists "Users can check their own superadmin access" on public.superadmin_access;
create policy "Users can check their own superadmin access"
on public.superadmin_access for select
to authenticated
using (user_id = auth.uid());

-- 2. Fonction security definer pour vérifier les droits d'accès au catalogue
create or replace function public.is_admin_or_pro_user(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = target_user_id
      and (subscription_tier in ('pro', 'premium') or role = 'admin')
  ) or exists (
    select 1 from public.superadmin_access
    where user_id = target_user_id
  );
$$;

grant execute on function public.is_admin_or_pro_user(uuid) to authenticated;

-- 3. Mise à jour de la policy RLS sur library_models
drop policy if exists "Allow read published models for pro and studio users" on public.library_models;
drop policy if exists "Allow read published models for authenticated users" on public.library_models;

create policy "Allow read published models for pro and studio users"
on public.library_models for select
to authenticated
using (
  status = 'published'
  and public.is_admin_or_pro_user(auth.uid())
);
