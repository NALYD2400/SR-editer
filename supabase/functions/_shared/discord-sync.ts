export type DiscordTier = "free" | "standard" | "pro" | "premium";

export type DiscordIdentity = {
  id: string;
  provider: string;
};

export type AuthUserWithIdentities = {
  identities?: DiscordIdentity[] | null;
};

export type DiscordSyncResponse = {
  success: boolean;
  tier: DiscordTier;
  results?: Array<{ guild_id: string; status: string }>;
};

export function getDiscordId(user: AuthUserWithIdentities | null | undefined): string | null {
  return user?.identities?.find((identity) => identity.provider === "discord")?.id ?? null;
}

export async function syncDiscordRole(
  discordId: string,
  tier: DiscordTier,
): Promise<DiscordSyncResponse> {
  const botUrl = (Deno.env.get("DISCORD_BOT_URL") || "https://sre-discord-bot.onrender.com")
    .replace(/\/$/, "");
  const secret = Deno.env.get("SYNC_SECRET_TOKEN")?.trim();
  if (!secret) throw new Error("SYNC_SECRET_TOKEN is not configured.");

  const response = await fetch(`${botUrl}/api/sync-user`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ discord_id: discordId, tier }),
    signal: AbortSignal.timeout(10_000),
  });

  const payload = await response.json().catch(() => null) as DiscordSyncResponse | null;
  if (!response.ok || !payload?.success) {
    throw new Error(`Discord role sync failed (${response.status}).`);
  }
  return payload;
}
