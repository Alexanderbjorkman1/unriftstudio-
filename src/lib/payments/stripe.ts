import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe Checkout over the REST API.
 *
 * No SDK: the two calls this app makes are form-encoded POSTs, and keeping the
 * dependency list short has been worth more here than the convenience. The
 * secret key is read from the environment only.
 */

export interface StripeStatus {
  configured: boolean;
  webhookReady: boolean;
  mode: "live" | "test" | "none";
  hint: string;
}

export function stripeStatus(): StripeStatus {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return {
      configured: false,
      webhookReady: false,
      mode: "none",
      hint: "Set STRIPE_SECRET_KEY to take card payments. Until then, customers pay on the day.",
    };
  }
  const webhookReady = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  return {
    configured: true,
    webhookReady,
    mode: key.startsWith("sk_live") ? "live" : "test",
    hint: webhookReady
      ? "Card payments are on."
      : "Key accepted, but STRIPE_WEBHOOK_SECRET is missing — payments will not be marked as paid automatically.",
  };
}

export interface CheckoutInput {
  amount: number; // major units, e.g. kronor
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");

  const body = new URLSearchParams({
    mode: "payment",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": input.currency.toLowerCase(),
    // Stripe works in the smallest unit — öre for SEK.
    "line_items[0][price_data][unit_amount]": String(Math.round(input.amount * 100)),
    "line_items[0][price_data][product_data][name]": input.description,
  });

  if (input.customerEmail) body.set("customer_email", input.customerEmail);
  for (const [k, v] of Object.entries(input.metadata)) body.set(`metadata[${k}]`, v);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.url || !json.id) {
    throw new Error(json.error?.message ?? `Stripe returned ${res.status}`);
  }
  return { id: json.id, url: json.url };
}

/**
 * Verifies a Stripe webhook signature.
 *
 * Without this check anyone who finds the endpoint could post a "payment
 * succeeded" event and mark jobs paid, so an unverifiable payload is rejected.
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
  toleranceSeconds = 300,
): { ok: boolean; reason?: string } {
  if (!secret) return { ok: false, reason: "No webhook secret configured" };
  if (!signatureHeader) return { ok: false, reason: "Missing signature header" };

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k.trim(), rest.join("=")];
    }),
  ) as Record<string, string>;

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return { ok: false, reason: "Malformed signature header" };

  // Reject replays of an old, legitimately-signed payload.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { ok: false, reason: "Signature timestamp outside tolerance" };
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "Signature mismatch" };
  }
  return { ok: true };
}

/** Builds the header Stripe would send — used by the tests. */
export function signPayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}
