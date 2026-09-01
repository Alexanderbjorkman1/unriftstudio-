/**
 * Email and SMS delivery.
 *
 * Credentials come from environment variables only — never from the settings
 * table, which is serialised into client components. Each provider is a plain
 * HTTPS call, so there are no SDK dependencies to install or keep current.
 *
 * With no credentials configured the senders report `configured: false` and the
 * outbox marks messages "skipped" rather than failing, so the whole app works
 * end to end before any account exists.
 */

export interface SendResult {
  ok: boolean;
  provider: string;
  error?: string;
}

export interface ProviderStatus {
  configured: boolean;
  provider: string;
  hint: string;
}

/* --------------------------------------------------------------------- email */

export function emailStatus(): ProviderStatus {
  if (process.env.RESEND_API_KEY) {
    return { configured: true, provider: "resend", hint: "Sending through Resend." };
  }
  return {
    configured: false,
    provider: "none",
    hint: "Set RESEND_API_KEY to start sending email. Until then messages are logged, not delivered.",
  };
}

export async function sendEmail(opts: {
  to: string;
  from: string;
  subject: string;
  text: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, provider: "none", error: "No email provider configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: opts.from,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, provider: "resend", error: `${res.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true, provider: "resend" };
  } catch (error) {
    return { ok: false, provider: "resend", error: error instanceof Error ? error.message : "Network error" };
  }
}

/* ----------------------------------------------------------------------- sms */

export function smsStatus(): ProviderStatus {
  if (process.env.ELKS_API_USERNAME && process.env.ELKS_API_PASSWORD) {
    return { configured: true, provider: "46elks", hint: "Sending through 46elks." };
  }
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return { configured: true, provider: "twilio", hint: "Sending through Twilio." };
  }
  return {
    configured: false,
    provider: "none",
    hint: "Set ELKS_API_USERNAME and ELKS_API_PASSWORD (or the Twilio pair) to start sending SMS.",
  };
}

export async function sendSms(opts: { to: string; from: string; text: string }): Promise<SendResult> {
  const status = smsStatus();
  if (!status.configured) return { ok: false, provider: "none", error: "No SMS provider configured" };

  try {
    if (status.provider === "46elks") {
      const auth = Buffer.from(
        `${process.env.ELKS_API_USERNAME}:${process.env.ELKS_API_PASSWORD}`,
      ).toString("base64");
      const res = await fetch("https://api.46elks.com/a1/sms", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ from: opts.from, to: opts.to, message: opts.text }),
      });
      if (!res.ok) {
        const detail = await res.text();
        return { ok: false, provider: "46elks", error: `${res.status}: ${detail.slice(0, 300)}` };
      }
      return { ok: true, provider: "46elks" };
    }

    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: opts.from, To: opts.to, Body: opts.text }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, provider: "twilio", error: `${res.status}: ${detail.slice(0, 300)}` };
    }
    return { ok: true, provider: "twilio" };
  } catch (error) {
    return { ok: false, provider: status.provider, error: error instanceof Error ? error.message : "Network error" };
  }
}

/**
 * Swedish numbers are typed as 070-123 45 67 but providers want +46701234567.
 * Anything already in international form is left alone.
 */
export function normalisePhone(raw: string, countryCode = "46") {
  const trimmed = raw.replace(/[\s-()]/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("00")) return `+${trimmed.slice(2)}`;
  if (trimmed.startsWith("0")) return `+${countryCode}${trimmed.slice(1)}`;
  return `+${trimmed}`;
}
