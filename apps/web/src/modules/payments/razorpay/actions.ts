"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getRazorpayClient, verifyPaymentSignature } from "./client";
import { calculateScheduleStatus, formatCurrency } from "../utils";
import { notifyClientUsers, notifySuperAdmins } from "@/modules/notifications/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Returns a high-privilege Supabase client for payment reconciliation and webhook mutations.
 */
async function getPaymentMutationClient(): Promise<SupabaseClient<Database>> {
  const adminClient = getAdminClient();
  if (adminClient) {
    return adminClient;
  }
  try {
    return (await createServerClient()) as unknown as SupabaseClient<Database>;
  } catch {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
  }
}

export interface CreateRazorpayOrderResult {
  success: boolean;
  orderId?: string;
  amount?: number;
  amountInPaise?: number;
  currency?: string;
  keyId?: string;
  scheduleItemId?: string;
  invoiceTitle?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  error?: string;
}

/**
 * Server Action: Creates an authoritative Razorpay Order for a billing schedule item.
 * Strictly verifies client ownership and calculates remaining balance from the database.
 */
export async function createRazorpayOrderAction(params: {
  scheduleItemId: string;
  customAmount?: number;
}): Promise<CreateRazorpayOrderResult> {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile) {
      return { success: false, error: "Authentication required to initiate payment." };
    }

    const { scheduleItemId, customAmount } = params;
    if (!scheduleItemId) {
      return { success: false, error: "Billing schedule item ID is required." };
    }

    const supabase = await createServerClient();

    // Fetch authoritative schedule item with relations
    const { data: scheduleItem, error: fetchErr } = await supabase
      .from("billing_schedule_items")
      .select(`
        *,
        client:clients(id, name, primary_contact_name, primary_contact_email, primary_contact_phone),
        project:projects(id, name, service_type),
        billing_plan:billing_plans(id, name, billing_type),
        payments(
          id,
          amount,
          status
        )
      `)
      .eq("id", scheduleItemId)
      .maybeSingle();

    if (fetchErr || !scheduleItem) {
      return { success: false, error: "Invoice/schedule item not found." };
    }

    const item = scheduleItem as any;

    // Security: Verify client ownership
    if (profile.role !== "SUPER_ADMIN" && profile.client_id !== item.client_id) {
      return { success: false, error: "Forbidden: You do not have permission to pay this invoice." };
    }

    // Calculate authoritative remaining balance
    const paidPayments = (item.payments || []).filter((p: any) => p.status === "PAID");
    const totalPaid = paidPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, Number(item.amount) - totalPaid);

    // Validate payable states
    if (balanceDue <= 0 || item.status === "PAID" || item.status === "CANCELLED" || item.status === "WAIVED") {
      return { success: false, error: "This invoice is already settled or not payable." };
    }

    // Determine charge amount
    let chargeAmount = balanceDue;
    if (customAmount && customAmount > 0 && customAmount <= balanceDue) {
      chargeAmount = customAmount;
    }

    // Convert to paise (Razorpay standard subunit)
    const amountInPaise = Math.round(chargeAmount * 100);

    const razorpay = getRazorpayClient();

    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: item.currency || "INR",
      receipt: item.id.slice(0, 40),
      notes: {
        client_id: item.client_id,
        project_id: item.project_id || "",
        billing_plan_id: item.billing_plan_id,
        schedule_item_id: item.id,
      },
    });

    const clientEmail = profile.email || item.client?.primary_contact_email || "";
    const clientPhone = item.client?.primary_contact_phone || "";
    const clientName = item.client?.name || "Client";

    return {
      success: true,
      orderId: order.id,
      amount: chargeAmount,
      amountInPaise,
      currency: item.currency || "INR",
      keyId: env.nextPublicRazorpayKeyId,
      scheduleItemId: item.id,
      invoiceTitle: item.title,
      clientName,
      clientEmail,
      clientPhone,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to initialize Razorpay checkout.";
    console.error("Error in createRazorpayOrderAction:", err);
    return { success: false, error: msg };
  }
}

export interface ReconcilePaymentParams {
  orderId: string;
  paymentId: string;
  signature?: string | null;
  scheduleItemId?: string | null;
  paidAmount?: number;
  notes?: string | null;
  verifiedBy?: string | null;
  createdById?: string | null;
}

/**
 * Authoritative Payment Reconciliation Engine.
 * Idempotently records confirmed payments, updates balance & status, and sends notifications.
 * Can be triggered from client signature verification or webhook events.
 */
export async function reconcileRazorpayPayment(params: ReconcilePaymentParams): Promise<{
  success: boolean;
  paymentRecordId?: string;
  isDuplicate?: boolean;
  error?: string;
}> {
  try {
    const { orderId, paymentId, signature, scheduleItemId, paidAmount, notes, verifiedBy, createdById } = params;

    if (!paymentId) {
      return { success: false, error: "Payment ID is required for reconciliation." };
    }

    const supabase = await getPaymentMutationClient();

    // 1. Idempotency Check: Did we already process this paymentId?
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, amount")
      .eq("razorpay_payment_id", paymentId)
      .maybeSingle();

    if (existingPayment && existingPayment.status === "PAID") {
      return {
        success: true,
        paymentRecordId: existingPayment.id,
        isDuplicate: true,
      };
    }

    // 2. Fetch the target schedule item
    let targetItemId = scheduleItemId;
    if (!targetItemId) {
      // Lookup by order ID
      const { data: itemByOrder } = await supabase
        .from("billing_schedule_items")
        .select("id")
        .eq("id", params.scheduleItemId || "")
        .maybeSingle();

      if (itemByOrder) {
        targetItemId = itemByOrder.id;
      }
    }

    if (!targetItemId) {
      return { success: false, error: "Could not resolve schedule item for Razorpay payment." };
    }

    const { data: scheduleItemData, error: itemErr } = await supabase
      .from("billing_schedule_items")
      .select(`
        *,
        client:clients(id, name, primary_contact_name, primary_contact_email),
        project:projects(id, name),
        billing_plan:billing_plans(id, name, created_by),
        payments(id, amount, status)
      `)
      .eq("id", targetItemId)
      .single();

    if (itemErr || !scheduleItemData) {
      return { success: false, error: `Failed to load schedule item ${targetItemId}: ${itemErr?.message}` };
    }

    const item = scheduleItemData as any;

    // Calculate payment amount
    const paidPayments = (item.payments || []).filter(
      (p: any) => p.status === "PAID" && p.razorpay_payment_id !== paymentId
    );
    const existingPaidTotal = paidPayments.reduce(
      (acc: number, p: any) => acc + (Number(p.amount) || 0),
      0
    );
    const remainingBalance = Math.max(0, Number(item.amount) - existingPaidTotal);

    const actualAmount = paidAmount !== undefined && paidAmount > 0 ? paidAmount : remainingBalance;

    const fallbackCreatedBy = createdById || item.billing_plan?.created_by || item.created_by;

    // 3. Insert / Upsert the Payment Record
    let paymentRecordId: string;

    if (existingPayment) {
      const updatePayload: Record<string, any> = {
        status: "PAID",
        paid_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        notes: notes || "Online payment captured and verified via Razorpay.",
      };
      if (signature) {
        updatePayload.razorpay_signature = signature;
      }

      let { data: updatedPayment, error: updateErr } = await supabase
        .from("payments")
        .update(updatePayload as never)
        .eq("id", existingPayment.id)
        .select("id")
        .single();

      if (updateErr && updateErr.message?.includes("razorpay_signature")) {
        delete updatePayload.razorpay_signature;
        const retry = await supabase
          .from("payments")
          .update(updatePayload as never)
          .eq("id", existingPayment.id)
          .select("id")
          .single();
        updatedPayment = retry.data;
        updateErr = retry.error;
      }

      if (updateErr) {
        return { success: false, error: `Failed to update payment record: ${updateErr.message}` };
      }
      paymentRecordId = (updatedPayment as any).id;
    } else {
      const insertPayload: Record<string, any> = {
        billing_schedule_item_id: item.id,
        client_id: item.client_id,
        project_id: item.project_id || null,
        amount: actualAmount,
        currency: item.currency || "INR",
        method: "RAZORPAY",
        status: "PAID",
        transaction_reference: paymentId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        paid_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        verified_by: verifiedBy || null,
        notes: notes || "Online payment captured and verified via Razorpay.",
        created_by: fallbackCreatedBy,
      };
      if (signature) {
        insertPayload.razorpay_signature = signature;
      }

      let { data: insertedPayment, error: insertErr } = await supabase
        .from("payments")
        .insert(insertPayload as never)
        .select(`
          id,
          receipt_number,
          amount,
          currency,
          paid_at,
          transaction_reference,
          status
        `)
        .single();

      if (insertErr && insertErr.message?.includes("razorpay_signature")) {
        delete insertPayload.razorpay_signature;
        const retry = await supabase
          .from("payments")
          .insert(insertPayload as never)
          .select(`
            id,
            receipt_number,
            amount,
            currency,
            paid_at,
            transaction_reference,
            status
          `)
          .single();
        insertedPayment = retry.data;
        insertErr = retry.error;
      }

      if (insertErr) {
        return { success: false, error: `Failed to insert payment record: ${insertErr.message}` };
      }
      paymentRecordId = (insertedPayment as any).id;
    }

    // 4. Update Billing Schedule Item Status
    const newTotalPaid = existingPaidTotal + actualAmount;
    const newStatus = calculateScheduleStatus(item, newTotalPaid);

    await supabase
      .from("billing_schedule_items")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", item.id);

    // Check if all schedule items in the plan are settled (PAID or WAIVED)
    if (item.billing_plan_id) {
      const { data: allPlanItems } = await supabase
        .from("billing_schedule_items")
        .select("id, status")
        .eq("billing_plan_id", item.billing_plan_id);

      if (allPlanItems && allPlanItems.length > 0) {
        const allSettled = allPlanItems.every(
          (it) => it.id === item.id ? (newStatus === "PAID" || newStatus === "WAIVED") : (it.status === "PAID" || it.status === "WAIVED")
        );
        if (allSettled) {
          await supabase
            .from("billing_plans")
            .update({
              status: "COMPLETED",
              updated_at: new Date().toISOString(),
            } as never)
            .eq("id", item.billing_plan_id);
        }
      }
    }

    // 5. Trigger In-App Notifications
    const formattedAmount = formatCurrency(actualAmount, item.currency || "INR");

    await notifyClientUsers({
      clientId: item.client_id,
      type: "PAYMENT_CONFIRMED",
      title: "Payment Received",
      message: `Your payment of ${formattedAmount} for "${item.title}" has been successfully processed via Razorpay.`,
      link: `/client/payments/${item.id}`,
    });

    await notifySuperAdmins({
      type: "PAYMENT_CONFIRMED",
      title: "Online Payment Received",
      message: `Received ${formattedAmount} via Razorpay from ${item.client?.name || "Client"} for "${item.title}".`,
      link: `/hq/payments/${item.id}`,
    });

    // 6. Revalidate Cache Paths
    try {
      revalidatePath("/hq/payments");
      revalidatePath("/client/payments");
      revalidatePath(`/hq/payments/${item.id}`);
      revalidatePath(`/client/payments/${item.id}`);
      revalidatePath(`/hq/clients/${item.client_id}`);
      revalidatePath("/client");
      revalidatePath("/hq");
    } catch {
      // Safe outside Next request lifecycle (e.g. test scripts or direct webhooks)
    }

    return {
      success: true,
      paymentRecordId,
      isDuplicate: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected reconciliation error.";
    console.error("Error in reconcileRazorpayPayment:", err);
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Verifies Razorpay Checkout payment callback signature and reconciles.
 */
export async function verifyRazorpayPaymentAction(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  scheduleItemId: string;
}): Promise<{
  success: boolean;
  paymentRecordId?: string;
  isDuplicate?: boolean;
  error?: string;
}> {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile) {
      return { success: false, error: "Authentication required." };
    }

    const { orderId, paymentId, signature, scheduleItemId } = params;

    // Verify cryptographic signature
    const isValid = verifyPaymentSignature({ orderId, paymentId, signature });
    if (!isValid) {
      return {
        success: false,
        error: "Cryptographic signature mismatch. Payment verification failed.",
      };
    }

    // Reconcile payment record
    const result = await reconcileRazorpayPayment({
      orderId,
      paymentId,
      signature,
      scheduleItemId,
      createdById: profile.id,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      paymentRecordId: result.paymentRecordId,
      isDuplicate: result.isDuplicate,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify Razorpay payment.";
    console.error("Error in verifyRazorpayPaymentAction:", err);
    return { success: false, error: msg };
  }
}
