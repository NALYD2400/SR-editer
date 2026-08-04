# Google Drive — packs modèles (pas Supabase Storage)

Supabase a ~**500 Mo** : on n’y met **que** les previews (WEBP/GLB légers).  
Les packs (YDR/skin, jusqu’à ~500–800 Mo) partent **directement sur Google Drive** par chunks de 2 Mo.

## Secrets (Supabase → Edge Function `admin-users`)

Pas Vercel.

```
GOOGLE_SERVICE_ACCOUNT_JSON=<json service account>
GOOGLE_DRIVE_FOLDER_ID=<id dossier Shared Drive>
```

Puis :
```bash
supabase functions deploy admin-users
supabase db push   # migration 20260804_library_models.sql
```

## Shared Drive
1. Active Drive API (Google Cloud)
2. Service Account + clé JSON
3. Shared Drive → ajoute le SA en **Content manager**
4. Dossier `SR-Editer-Models` → copie l’ID

## Flux
1. Admin zip le pack dans le navigateur
2. Edge ouvre une session résumable Drive
3. Navigateur envoie des chunks 2 Mo via l’edge → Drive (rien ne reste sur Storage)
4. Fiche `library_models` en DB + lien download Drive
5. Previews seulement sur bucket `models-library`
