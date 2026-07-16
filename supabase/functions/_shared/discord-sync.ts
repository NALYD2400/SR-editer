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
  tier?: DiscordTier;
  code?: string;
  error?: string;
  results?: Array<{ guild_id: string; status: string }>;
};

export class DiscordMembershipRequiredError extends Error {
  constructor() {
    super("Tu dois être membre du serveur Discord SR Editer pour utiliser Discord avec ton compte.");
    this.name = "DiscordMembershipRequiredError";
  }
}

export function getDiscordId(user: AuthUserWithIdentities | null | undefined): string | null {
  return user?.identities?.find((identity) => identity.provider === "discord")?.id ?? null;
}

export async function syncDiscordRole(
  discordId: string,
  tier: DiscordTier,
  requireMembership = false,
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
    body: JSON.stringify({
      discord_id: discordId,
      tier,
      require_membership: requireMembership,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const payload = await response.json().catch(() => null) as DiscordSyncResponse | null;
  if (response.status === 403 && payload?.code === "DISCORD_MEMBERSHIP_REQUIRED") {
    throw new DiscordMembershipRequiredError();
  }
  if (!response.ok || !payload?.success) {
    throw new Error(`Discord role sync failed (${response.status}).`);
  }
  return payload;
}
