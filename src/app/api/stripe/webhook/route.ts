import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/stripe";
import { markPaid } from "@/lib/repo/payments";
import { getDb } from "@/lib/db";
import { toLocalStamp } from "@/lib/dates";

/**
 * Stripe tells us a checkout completed here.
 *
 * The signature is verified before anything is read from the body: this
 * endpoint is public, so an unsigned request claiming a payment succeeded must
 * never be believed.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const verdict = verifyWebhookSignature(payload, request.headers.get("stripe-signature"));

  if (!verdict.ok) {
    console.warn("[stripe] rejected webhook:", verdict.reason);
    return NextResponse.json({ error: verdict.reason }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: { id?: string; metadata?: Record<string, string> } } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge everything else so Stripe stops retrying.
    return NextResponse.json({ received: true });
  }

  const sessionId = event.data?.object?.id;
  if (!sessionId) return NextResponse.json({ error: "No session id" }, { status: 400 });

  // markPaid returns a row only on the first delivery of this session.
  const payment = markPaid(sessionId);
  if (!payment) return NextResponse.json({ received: true, duplicate: true });

  const db = getDb();

  if (payment.kind === "deposit" && payment.job_id) {
    // A paid deposit is a firm booking, so lift it out of "booked".
    db.prepare("UPDATE jobs SET status = 'confirmed' WHERE id = ? AND status = 'booked'").run(payment.job_id);
  }

  if (payment.kind === "invoice" && payment.invoice_id) {
    db.prepare(
      "UPDATE invoices SET status = 'paid', paid_at = ?, payment_method = 'Card' WHERE id = ?",
    ).run(toLocalStamp(new Date()).slice(0, 10), payment.invoice_id);
  }

  return NextResponse.json({ received: true });
}
