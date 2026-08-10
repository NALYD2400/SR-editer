-- Migration: Restreindre la bibliothèque de modèles 3D aux utilisateurs Pro, Premium/Studio et admins

drop policy if exists "Allow read published models for authenticated users" on public.library_models;

create policy "Allow read published models for pro and studio users"
on public.library_models for select
to authenticated
using (
  status = 'published'
  and (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.subscription_tier in ('pro', 'premium')
    )
    or exists (select 1 from public.superadmin_access sa where sa.user_id = auth.uid())
    or (select role from public.profiles where user_id = auth.uid()) = 'admin'
  )
);
