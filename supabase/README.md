# Backend sécurisé de la console admin

La console ne crée plus de comptes avec la clé publique du navigateur. Toutes les opérations privilégiées passent par la fonction Edge `admin-users`.

## Déploiement

1. Appliquer `migrations/20260704_secure_profiles.sql` dans le SQL Editor Supabase.
2. Vérifier qu'au moins ton propre profil possède `role = 'admin'` et le bon `user_id`.
3. Appliquer ensuite `20260705_superadmin_console.sql` pour les licences, appareils, tickets, contacts, releases, audit et délégations superadmin.
4. Définir `ADMIN_ALLOWED_ORIGINS=https://sr-editer.vercel.app` dans les secrets de la fonction.
5. Déployer la fonction : `supabase functions deploy admin-users`.

La première ligne `profiles` ayant le rôle `admin` devient propriétaire de la superconsole lors de la migration. Elle peut ensuite déléguer des permissions précises depuis l’onglet **Équipe superadmin**.
4. Définir `ADMIN_ALLOWED_ORIGINS` avec le domaine Vercel de production (plusieurs origines séparées par des virgules).
5. Laisser `demoMode: false` dans `js/config.js`.

`SUPABASE_SERVICE_ROLE_KEY` reste exclusivement dans les secrets de la fonction Edge. Elle ne doit jamais être copiée dans le site.
