/** Google Drive helper — service account + Shared Drive folder. */

export type DriveUploadResult = {
  id: string;
  webViewLink: string | null;
  webContentLink: string | null;
};

function b64url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    raw.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

function parseServiceAccount(raw: string): ServiceAccount | null {
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed?.client_email || !parsed?.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function driveConfigFromEnv() {
  const json = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "";
  const folderId = (Deno.env.get("GOOGLE_DRIVE_FOLDER_ID") ?? "").trim();
  const account = json ? parseServiceAccount(json) : null;
  return {
    configured: Boolean(account && folderId),
    account,
    folderId,
  };
}

let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.value;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: account.client_email,
    // drive (pas drive.file) : Shared Drive + upload résumable + partage lien
    scope: "https://www.googleapis.com/auth/drive",
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64url(signature)}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google OAuth échoué: ${response.status} ${errText.slice(0, 200)}`);
  }
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Token Google Drive manquant.");
  cachedToken = {
    value: payload.access_token,
    exp: now + (Number(payload.expires_in) || 3600),
  };
  return payload.access_token;
}

export async function uploadFileToDrive(params: {
  account: ServiceAccount;
  folderId: string;
  filename: string;
  bytes: Uint8Array;
  mimeType?: string;
}): Promise<DriveUploadResult> {
  const token = await getAccessToken(params.account);
  const metadata = {
    name: params.filename,
    parents: [params.folderId],
  };
  const boundary = `srbound${crypto.randomUUID().replace(/-/g, "")}`;
  const metaPart =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const fileHeader =
    `--${boundary}\r\nContent-Type: ${params.mimeType || "application/octet-stream"}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const head = encoder.encode(metaPart + fileHeader);
  const tail = encoder.encode(closing);
  const body = new Uint8Array(head.length + params.bytes.length + tail.length);
  body.set(head, 0);
  body.set(params.bytes, head.length);
  body.set(tail, head.length + params.bytes.length);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Upload Drive échoué: ${response.status} ${errText.slice(0, 300)}`);
  }
  const data = await response.json() as DriveUploadResult;
  return {
    id: data.id,
    webViewLink: data.webViewLink ?? null,
    webContentLink: data.webContentLink ?? null,
  };
}

export async function deleteDriveFile(account: ServiceAccount, fileId: string): Promise<void> {
  if (!fileId) return;
  const token = await getAccessToken(account);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Suppression Drive échouée: ${response.status} ${errText.slice(0, 200)}`);
  }
}

/** Démarre un upload résumable Drive (le navigateur envoie ensuite des chunks via l’edge). */
export async function startResumableDriveUpload(params: {
  account: ServiceAccount;
  folderId: string;
  filename: string;
  size: number;
  mimeType?: string;
}): Promise<string> {
  const token = await getAccessToken(params.account);
  const mimeType = params.mimeType || "application/zip";
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
        "X-Upload-Content-Length": String(params.size),
      },
      body: JSON.stringify({
        name: params.filename,
        parents: [params.folderId],
      }),
    },
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Session Drive impossible: ${response.status} ${errText.slice(0, 300)}`);
  }
  const uploadUrl = response.headers.get("Location");
  if (!uploadUrl) throw new Error("URL d’upload Drive manquante.");
  return uploadUrl;
}

export async function uploadResumableDriveChunk(params: {
  account: ServiceAccount;
  uploadUrl: string;
  bytes: Uint8Array;
  offset: number;
  total: number;
}): Promise<{ done: boolean; file?: DriveUploadResult }> {
  const token = await getAccessToken(params.account);
  const start = params.offset;
  const end = params.offset + params.bytes.length - 1;
  const response = await fetch(params.uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Length": String(params.bytes.length),
      "Content-Range": `bytes ${start}-${end}/${params.total}`,
      "Content-Type": "application/zip",
    },
    body: params.bytes,
  });

  // 308 Resume Incomplete = chunk accepté, pas fini
  if (response.status === 308) {
    return { done: false };
  }
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Chunk Drive échoué: ${response.status} ${errText.slice(0, 300)}`);
  }
  const data = await response.json() as DriveUploadResult;
  return {
    done: true,
    file: {
      id: data.id,
      webViewLink: data.webViewLink ?? null,
      webContentLink: data.webContentLink ?? null,
    },
  };
}

/** Lien public lecture seule — l’app peut télécharger sans compte Google. */
export async function shareDriveFileAnyoneWithLink(
  account: ServiceAccount,
  fileId: string,
): Promise<void> {
  const token = await getAccessToken(account);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    },
  );
  if (!response.ok && response.status !== 409) {
    const errText = await response.text();
    throw new Error(`Partage Drive échoué: ${response.status} ${errText.slice(0, 200)}`);
  }
}

export function driveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}
