// Helper d'Alerte & Journalisation de Sécurité (SIEM)
// Enregistre les anomalies dans public.security_events etnotifie Discord si configuré

export type SecuritySeverity = "info" | "warning" | "critical";

export type SecurityAlertPayload = {
  severity: SecuritySeverity;
  eventType: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  origin?: string | null;
  ipAddress?: string | null;
  details?: Record<string, unknown>;
};

export async function logSecurityAlert(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  payload: SecurityAlertPayload
): Promise<void> {
  const { severity, eventType, actorUserId, actorEmail, origin, ipAddress, details } = payload;

  try {
    // 1. Log dans la base SQL public.security_events
    await supabaseAdmin.from("security_events").insert({
      severity,
      event_type: eventType,
      actor_user_id: actorUserId ?? null,
      actor_email: actorEmail ?? null,
      origin: origin ?? null,
      ip_address: ipAddress ?? null,
      details: details ?? {},
    });
  } catch (err) {
    console.error("Erreur lors de l'enregistrement du log de sécurité :", err);
  }

  // 2. Notification instantanée sur Discord si DISCORD_SECURITY_WEBHOOK_URL est configuré
  const webhookUrl = Deno.env.get("DISCORD_SECURITY_WEBHOOK_URL")?.trim()
    || Deno.env.get("DISCORD_WEBHOOK_URL")?.trim();
  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return;
  }

  const colorMap: Record<SecuritySeverity, number> = {
    info: 0x3498db,      // Bleu
    warning: 0xf39c12,   // Orange
    critical: 0xe74c3c,  // Rouge
  };

  const titleEmoji: Record<SecuritySeverity, string> = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  };

  const fields = [
    { name: "Type d'événement", value: eventType, inline: true },
    { name: "Sévérité", value: severity.toUpperCase(), inline: true },
  ];

  if (actorEmail) fields.push({ name: "Utilisateur", value: actorEmail, inline: true });
  if (origin) fields.push({ name: "Origine HTTP", value: origin, inline: true });

  const embed = {
    title: `${titleEmoji[severity]} ALERTE SÉCURITÉ SR EDITER — ${eventType}`,
    color: colorMap[severity],
    fields,
    description: details && Object.keys(details).length
      ? "```json\n" + JSON.stringify(details, null, 2).slice(0, 1800) + "\n```"
      : undefined,
    timestamp: new Date().toISOString(),
    footer: { text: "SR Editer Security Radar Engine" },
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    console.error("Erreur d'envoi du webhook de sécurité Discord :", err);
  }
}
