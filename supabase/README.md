# Backend Supabase — admin, mises à jour et Stripe

## Première installation

Depuis `website/SR-editer` :

```powershell
npx supabase login
npx supabase link --project-ref vcikzkfyjrcgvoiktagg
npx supabase db push
npx supabase functions deploy admin-users --no-verify-jwt
npx supabase functions deploy app-update --no-verify-jwt
npx supabase functions deploy stripe-checkout
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy stripe-customer-portal
npx supabase functions deploy stripe-coupons
npx supabase functions deploy account-management
```

`--no-verify-jwt` est volontaire pour `admin-users` (vérifie le JWT + `superadmin_access`), `app-update` (public pour Tauri) et `stripe-webhook` (signature Stripe). Les autres fonctions Stripe vérifient le JWT utilisateur.

Secrets requis :

```powershell
npx supabase secrets set STRIPE_SECRET_KEY=sk_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set DISCORD_BOT_URL=https://sr-discord-bot.onrender.com
npx supabase secrets set SYNC_SECRET_TOKEN=le_meme_secret_que_sur_le_bot
# optionnel (sinon fallback IDs dans le code) :
npx supabase secrets set STRIPE_PRICE_STANDARD=price_...
npx supabase secrets set STRIPE_PRICE_PRO=price_...
npx supabase secrets set STRIPE_PRICE_PREMIUM=price_...
npx supabase secrets set ADMIN_ALLOWED_ORIGINS=https://sr-editer.vercel.app
```

La clé `SUPABASE_SERVICE_ROLE_KEY` reste uniquement dans les secrets automatiques des fonctions Edge.

Si `db push` n'est pas utilisé, exécuter dans le SQL Editor, dans cet ordre :

1. `migrations/20260704_secure_profiles.sql`
2. `migrations/20260705_superadmin_console.sql`
3. `migrations/20260705_update_pipeline.sql`
4. `migrations/20260711_stripe_profiles.sql`
5. `migrations/20260715_account_lifecycle.sql`

Vérifier ensuite qu'au moins un profil possède `role = 'admin'` et le `user_id` correspondant à `auth.users.id`.

Dans **Authentication → Configuration**, active aussi **Manual identity linking** et
autorise les redirections `https://sr-editer.vercel.app/dashboard.html` et
`srediter://auth/callback`. La migration de cycle de vie crée automatiquement un
profil pour chaque inscription e-mail ou Discord et répare les comptes existants.

## Cycle de vie du compte et Discord

- `account-management` vérifie le JWT utilisateur avant toute action.
- Une liaison Discord déclenche immédiatement la synchronisation du rôle payant.
- Une déliaison retire d'abord les rôles payants, puis détache l'identité Discord.
- Une suppression autonome exige la saisie de l'e-mail, annule Stripe, supprime le
  customer Stripe, retire les rôles Discord, nettoie les données liées puis supprime
  l'utilisateur Auth.
- Les comptes administrateurs doivent transférer leurs droits avant de se supprimer.

## Entitlements

Source de vérité desktop / portail : `profiles.subscription_tier` (`free|standard|pro|premium`).

- Stripe webhook met à jour `subscription_tier`, `subscription_status`, `stripe_customer_id`.
- Le panneau admin « Licences » (`customer_licenses`) miroite vers `subscription_tier` via `license-upsert` (`pro→pro`, `studio|lifetime→premium`).

## Publication d'une mise à jour

1. Construire l'installateur signé avec `npm run tauri:build:signed`.
2. Créer une GitHub Release publique taguée `X.Y.Z`.
3. Joindre l'installateur sous le nom `SR.Editer_X.Y.Z_x64-setup.exe`.
4. Dans la console admin, ouvrir **Releases**, coller l'URL GitHub et la signature, cocher **Publier immédiatement**, puis enregistrer.

La fonction `app-update` expose alors le manifeste public. Vercel redirige `/update.json` vers cette fonction : le site client et l'application installée utilisent donc exactement la même release.

La création de comptes est protégée par `admin-users`. Elle utilise un `upsert` sur `profiles.user_id`, ce qui reste compatible avec un trigger Supabase qui crée déjà automatiquement le profil.

# Accès aux pages de l'application

La migration `migrations/20260705_app_page_permissions.sql` ajoute la matrice `app_permissions` aux profils. Après modification depuis la fiche utilisateur de la console admin, redéploie la fonction `admin-users` si son code a changé.
