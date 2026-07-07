alter table public.profiles
alter column app_permissions set default '{
  "project": true,
  "explorer": true,
  "assets": true,
  "materials": true,
  "textures": true,
  "modeling": true,
  "library": true,
  "ai": true,
  "settings": true
}'::jsonb;

update public.profiles
set app_permissions = app_permissions || '{"modeling": true}'::jsonb
where not (app_permissions ? 'modeling');
