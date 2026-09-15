/**
 * Notification provider interface. The app writes a row to `notifications`
 * (see migration 0010) and calls dispatch() — it never talks to a specific
 * SMS/WhatsApp/email vendor directly. Swapping providers means writing one
 * new file that implements NotificationProvider; nothing else changes.
 *
 * IMPORTANT: there is no "fake" provider that pretends to succeed. If no
 * real provider is configured, dispatch() throws a clear, typed error and
 * the caller must surface that to the user (e.g. "OTP could not be sent —
 * SMS provider not configured") rather than silently continuing as if it
 * worked. This satisfies the "fail gracefully, never pretend to succeed"
 * requirement.
 */

export type NotificationChannel = "sms" | "whatsapp" | "email" | "push" | "in_app";

export interface NotificationPayload {
  toProfileId: string;
  channel: NotificationChannel;
  title?: string;
  body: string;
  data?: Record<string, unknown>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(channel: NotificationChannel) {
    super(
      `No notification provider is configured for channel "${channel}". ` +
        `Set the relevant environment variables and implement lib/notifications/providers/${channel}.ts, ` +
        `then register it in lib/notifications/registry.ts.`
    );
    this.name = "ProviderNotConfiguredError";
  }
}

export interface NotificationProvider {
  channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<{ providerMessageId: string }>;
}

/**
 * Registry: add a real provider implementation and register it here.
 * Left empty in this build because no SMS/WhatsApp/email vendor credentials
 * were provided — see .env.example and docs/NOTIFICATIONS.md.
 *
 * IN-APP notifications (channel: 'in_app') always work with zero external
 * configuration, since they're just rows in `notifications` read by the
 * client via Supabase Realtime/polling — no third-party dependency.
 */
const registry = new Map<NotificationChannel, NotificationProvider>();

export function registerProvider(provider: NotificationProvider) {
  registry.set(provider.channel, provider);
}

export async function dispatchNotification(payload: NotificationPayload) {
  if (payload.channel === "in_app") {
    return { providerMessageId: "in_app", delivered: true };
  }
  const provider = registry.get(payload.channel);
  if (!provider) {
    throw new ProviderNotConfiguredError(payload.channel);
  }
  const result = await provider.send(payload);
  return { ...result, delivered: true };
}
