import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/modules/payments/razorpay/client";
import { reconcileRazorpayPayment } from "@/modules/payments/razorpay/actions";
import { getAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { notifyClientUsers } from "@/modules/notifications/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    // 1. Cryptographic Webhook Signature Verification
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("Security Alert: Invalid Razorpay webhook signature received.");
      return NextResponse.json(
        { error: "Invalid signature verification failed" },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const eventId = payload.id || `evt_${payload.created_at || Date.now()}`;

    // 2. Webhook Idempotency Check
    const adminClient = getAdminClient() || (await createServerClient());

    const { data: existingEvent } = await (adminClient as any)
      .from("razorpay_webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json(
        { received: true, duplicate: true, message: "Event already processed." },
        { status: 200 }
      );
    }

    // Record Event in Deduplication Ledger
    await (adminClient as any).from("razorpay_webhook_events").insert({
      event_id: eventId,
      event_type: eventType,
      payload,
    });

    // 3. Process Webhook Event Types
    switch (eventType) {
      case "payment.captured": {
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity) {
          return NextResponse.json({ error: "Missing payment entity" }, { status: 400 });
        }

        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const amountInPaise = paymentEntity.amount;
        const paidAmount = Number(amountInPaise) / 100;
        const scheduleItemId = paymentEntity.notes?.schedule_item_id;

        const result = await reconcileRazorpayPayment({
          orderId,
          paymentId,
          scheduleItemId,
          paidAmount,
          notes: "Automated payment reconciliation via Razorpay webhook.",
        });

        if (!result.success) {
          console.error("Error reconciling webhook payment:", result.error);
          return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
          status: "success",
          reconciled: true,
          paymentRecordId: result.paymentRecordId,
        });
      }

      case "payment.failed": {
        const paymentEntity = payload.payload?.payment?.entity;
        const scheduleItemId = paymentEntity?.notes?.schedule_item_id;
        const clientId = paymentEntity?.notes?.client_id;
        const errorReason = paymentEntity?.error_description || "Card or bank declined the transaction.";

        if (clientId && scheduleItemId) {
          await notifyClientUsers({
            clientId,
            type: "PAYMENT_FAILED",
            title: "Online Payment Failed",
            message: `Your recent online payment attempt could not be processed (${errorReason}). Please retry or use Bank Transfer.`,
            link: `/client/payments/${scheduleItemId}`,
          });
        }

        return NextResponse.json({ status: "success", recorded: true });
      }

      default: {
        // Unhandled event types acknowledged with 200
        return NextResponse.json({ status: "ignored", event: eventType }, { status: 200 });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook processing error";
    console.error("Error processing Razorpay webhook:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
