alter table public.profiles
add column if not exists app_permissions jsonb not null default '{
  "project": true,
  "explorer": true,
  "assets": true,
  "materials": true,
  "textures": true,
  "ai": true,
  "settings": true
}'::jsonb;

alter table public.profiles
drop constraint if exists profiles_app_permissions_object;

alter table public.profiles
add constraint profiles_app_permissions_object
check (jsonb_typeof(app_permissions) = 'object');

comment on column public.profiles.app_permissions is
'Zones de l application desktop autorisees pour ce compte. Une valeur false bloque la zone.';
