# Backend Supabase — admin et mises à jour

## Première installation

Depuis `website/SR editer` :

```powershell
npx supabase login
npx supabase link --project-ref vcikzkfyjrcgvoiktagg
npx supabase db push
npx supabase functions deploy admin-users --no-verify-jwt
npx supabase functions deploy app-update --no-verify-jwt
```

`--no-verify-jwt` est volontaire : `admin-users` vérifie lui-même le jeton et le rôle administrateur, tandis que `app-update` doit rester publiquement lisible par Tauri. La clé `SUPABASE_SERVICE_ROLE_KEY` reste uniquement dans les secrets automatiques des fonctions Edge.

Si `db push` n'est pas utilisé, exécuter dans le SQL Editor, dans cet ordre :

1. `migrations/20260704_secure_profiles.sql`
2. `migrations/20260705_superadmin_console.sql`
3. `migrations/20260705_update_pipeline.sql`

Vérifier ensuite qu'au moins un profil possède `role = 'admin'` et le `user_id` correspondant à `auth.users.id`.

## Publication d'une mise à jour

1. Construire l'installateur signé avec `npm run tauri:build:signed`.
2. Créer une GitHub Release publique taguée `X.Y.Z`.
3. Joindre l'installateur sous le nom `SR.Editer_X.Y.Z_x64-setup.exe`.
4. Dans la console admin, ouvrir **Releases**, coller l'URL GitHub et la signature, cocher **Publier immédiatement**, puis enregistrer.

La fonction `app-update` expose alors le manifeste public. Vercel redirige `/update.json` vers cette fonction : le site client et l'application installée utilisent donc exactement la même release.

La création de comptes est protégée par `admin-users`. Elle utilise un `upsert` sur `profiles.user_id`, ce qui reste compatible avec un trigger Supabase qui crée déjà automatiquement le profil.
