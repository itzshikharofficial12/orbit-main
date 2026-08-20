"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  createBillingPlanSchema,
  recordManualPaymentSchema,
  updateBillingPlanStatusSchema,
  type CreateBillingPlanInput,
} from "./schema";
import type {
  PaymentActionResult,
  BillingPlan,
  Payment,
  BillingPlanStatus,
} from "./types";
import { calculateScheduleStatus, formatCurrency } from "./utils";
import { notifyClientUsers, notifySuperAdmins } from "@/modules/notifications/service";
import { env } from "@/lib/env";

export async function createBillingPlanAction(
  input: CreateBillingPlanInput
): Promise<PaymentActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Authentication required." };
  }

  if (profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Celestia Studios Admins can create billing plans." };
  }

  const parsed = createBillingPlanSchema.safeParse(input);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0]?.message || "Validation failed";
    return { success: false, error: firstErr };
  }

  const {
    client_id,
    project_id,
    name,
    description,
    billing_type,
    total_contract_value,
    currency,
    start_date,
    end_date,
    schedule_items,
  } = parsed.data;

  // Validate financial sum for One-Time and Installments
  if (billing_type === "ONE_TIME" || billing_type === "INSTALLMENTS") {
    const scheduleSum = schedule_items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const tolerance = 0.01;
    if (Math.abs(scheduleSum - total_contract_value) > tolerance) {
      return {
        success: false,
        error: `Schedule total (${formatCurrency(scheduleSum, currency)}) must equal contract value (${formatCurrency(total_contract_value, currency)}).`,
      };
    }
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Verify Client exists
    const { data: clientRecord, error: clientErr } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", client_id)
      .maybeSingle();

    if (clientErr || !clientRecord) {
      return { success: false, error: "Selected client does not exist." };
    }

    // 2. If Project is provided, verify it belongs to this Client
    if (project_id) {
      const { data: projectRecord, error: projErr } = await supabase
        .from("projects")
        .select("id, client_id")
        .eq("id", project_id)
        .maybeSingle();

      if (projErr || !projectRecord || projectRecord.client_id !== client_id) {
        return {
          success: false,
          error: "Selected project does not belong to the selected client.",
        };
      }
    }

    // 3. Insert Billing Plan
    const { data: newPlan, error: planErr } = await supabase
      .from("billing_plans")
      .insert({
        client_id,
        project_id: project_id || null,
        name,
        description: description || null,
        billing_type,
        total_contract_value,
        currency,
        start_date,
        end_date: end_date || null,
        status: "ACTIVE",
        created_by: profile.id,
      } as never)
      .select()
      .maybeSingle();

    if (planErr || !newPlan) {
      console.error("Error creating billing plan:", planErr);
      return {
        success: false,
        error: planErr?.message || "Failed to create billing plan.",
      };
    }

    const createdPlan = newPlan as unknown as BillingPlan;

    // 4. Batch Insert Schedule Items
    const itemsToInsert = schedule_items.map((item, index) => ({
      billing_plan_id: createdPlan.id,
      client_id,
      project_id: project_id || null,
      title: item.title,
      description: item.description || null,
      amount: item.amount,
      currency,
      due_date: item.due_date || null,
      sequence_number: index + 1,
      milestone_id: item.milestone_id || null,
      recurrence_reference: item.recurrence_reference || null,
      status: "SCHEDULED",
    }));

    const { error: itemsErr } = await supabase
      .from("billing_schedule_items")
      .insert(itemsToInsert as never);

    if (itemsErr) {
      console.error("Error creating schedule items:", itemsErr);
      return {
        success: false,
        error: "Created billing plan, but failed to insert schedule items.",
      };
    }

    // 5. Dispatch Client Notification
    await notifyClientUsers({
      clientId: client_id,
      type: "PAYMENT_CREATED",
      title: "New billing plan created",
      message: `A billing plan "${name}" (${formatCurrency(total_contract_value, currency)}) has been established.`,
      link: "/client/payments",
    });

    revalidatePath("/hq/payments");
    revalidatePath("/hq");
    revalidatePath("/client/payments");
    revalidatePath("/client");

    return {
      success: true,
      plan: createdPlan,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

export async function recordManualPaymentAction(
  formData: FormData
): Promise<PaymentActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Authentication required." };
  }

  if (profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Only Celestia Studios Admins can record manual payments." };
  }

  const rawData = {
    client_id: formData.get("client_id"),
    project_id: formData.get("project_id"),
    billing_schedule_item_id: formData.get("billing_schedule_item_id"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "INR",
    transaction_reference: formData.get("transaction_reference"),
    paid_at: formData.get("paid_at"),
    notes: formData.get("notes"),
  };

  const parsed = recordManualPaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0]?.message || "Validation failed";
    return { success: false, error: firstErr };
  }

  const {
    client_id,
    project_id,
    billing_schedule_item_id,
    amount,
    currency,
    transaction_reference,
    paid_at,
    notes,
  } = parsed.data;

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Insert Payment Record
    const { data: newPayment, error: payErr } = await supabase
      .from("payments")
      .insert({
        client_id,
        project_id: project_id || null,
        billing_schedule_item_id: billing_schedule_item_id || null,
        amount,
        currency,
        method: "BANK_TRANSFER",
        status: "PAID",
        transaction_reference,
        paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString(),
        verified_at: new Date().toISOString(),
        verified_by: profile.id,
        notes: notes || null,
        created_by: profile.id,
      } as never)
      .select()
      .maybeSingle();

    if (payErr || !newPayment) {
      console.error("Error inserting payment:", payErr);
      return { success: false, error: payErr?.message || "Failed to record payment." };
    }

    const recordedPayment = newPayment as unknown as Payment;

    // 2. If attached to a schedule item, recalculate schedule status
    if (billing_schedule_item_id) {
      const { data: scheduleItem } = await supabase
        .from("billing_schedule_items")
        .select("id, amount, due_date, billing_plan_id, status")
        .eq("id", billing_schedule_item_id)
        .maybeSingle();

      if (scheduleItem) {
        // Fetch all payments for this schedule item
        const { data: itemPayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("billing_schedule_item_id", billing_schedule_item_id)
          .eq("status", "PAID");

        const totalPaid = (itemPayments || []).reduce(
          (acc, p) => acc + (Number(p.amount) || 0),
          0
        );

        const updatedScheduleStatus = calculateScheduleStatus(scheduleItem, totalPaid);

        await supabase
          .from("billing_schedule_items")
          .update({
            status: updatedScheduleStatus,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", billing_schedule_item_id);

        // Check if all schedule items in the plan are PAID
        if (scheduleItem.billing_plan_id) {
          const { data: allPlanItems } = await supabase
            .from("billing_schedule_items")
            .select("id, amount, status")
            .eq("billing_plan_id", scheduleItem.billing_plan_id);

          if (allPlanItems && allPlanItems.length > 0) {
            const allPaid = allPlanItems.every(
              (it) => it.status === "PAID" || it.status === "WAIVED"
            );
            if (allPaid) {
              await supabase
                .from("billing_plans")
                .update({
                  status: "COMPLETED",
                  updated_at: new Date().toISOString(),
                } as never)
                .eq("id", scheduleItem.billing_plan_id);
            }
          }
        }
      }
    }

    // 3. Dispatch Client Notification
    await notifyClientUsers({
      clientId: client_id,
      type: "PAYMENT_RECEIVED",
      title: "Payment confirmed",
      message: `Payment of ${formatCurrency(amount, currency)} has been verified (Ref: ${transaction_reference}).`,
      link: "/client/payments",
    });

    revalidatePath("/hq/payments");
    revalidatePath("/hq");
    revalidatePath("/client/payments");
    revalidatePath("/client");

    return {
      success: true,
      payment: recordedPayment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

export async function updateBillingPlanStatusAction(
  planId: string,
  status: BillingPlanStatus
): Promise<PaymentActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateBillingPlanStatusSchema.safeParse({ plan_id: planId, status });
  if (!parsed.success) {
    return { success: false, error: "Invalid status parameters." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    const { data: updated, error } = await supabase
      .from("billing_plans")
      .update({ status, updated_at: new Date().toISOString() } as never)
      .eq("id", planId)
      .select()
      .maybeSingle();

    if (error || !updated) {
      return { success: false, error: error?.message || "Failed to update plan status." };
    }

    revalidatePath("/hq/payments");
    revalidatePath("/hq");
    revalidatePath("/client/payments");
    revalidatePath("/client");

    return {
      success: true,
      plan: updated as unknown as BillingPlan,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Verifies and approves a pending manual bank transfer.
 */
export async function verifyBankTransferAction(params: {
  paymentId: string;
  notes?: string;
}): Promise<PaymentActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized. Super Admin access required." };
  }

  const { paymentId, notes } = params;
  if (!paymentId) {
    return { success: false, error: "Payment ID is required." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Fetch Payment Record
    const { data: existingPayment, error: fetchErr } = await supabase
      .from("payments")
      .select(`
        *,
        client:clients(id, name),
        schedule_item:billing_schedule_items(id, title, amount, currency, billing_plan_id)
      `)
      .eq("id", paymentId)
      .maybeSingle();

    if (fetchErr || !existingPayment) {
      return { success: false, error: "Payment record not found." };
    }

    const payment = existingPayment as any;

    if (payment.status === "PAID") {
      return { success: true, payment: payment as unknown as Payment };
    }

    // 2. Mark Payment as PAID & Verified
    const { data: updatedPayment, error: updateErr } = await supabase
      .from("payments")
      .update({
        status: "PAID",
        verified_at: new Date().toISOString(),
        verified_by: profile.id,
        notes: notes || payment.notes || "Bank transfer verified by Admin.",
      } as never)
      .eq("id", paymentId)
      .select()
      .single();

    if (updateErr || !updatedPayment) {
      return { success: false, error: updateErr?.message || "Failed to update payment status." };
    }

    // 3. Recalculate schedule item status if linked
    if (payment.billing_schedule_item_id) {
      const scheduleItemId = payment.billing_schedule_item_id;

      const { data: scheduleItem } = await supabase
        .from("billing_schedule_items")
        .select("id, amount, due_date, billing_plan_id, status")
        .eq("id", scheduleItemId)
        .maybeSingle();

      if (scheduleItem) {
        const { data: itemPayments } = await supabase
          .from("payments")
          .select("amount")
          .eq("billing_schedule_item_id", scheduleItemId)
          .eq("status", "PAID");

        const totalPaid = (itemPayments || []).reduce(
          (acc, p) => acc + (Number(p.amount) || 0),
          0
        );

        const newScheduleStatus = calculateScheduleStatus(scheduleItem, totalPaid);

        await supabase
          .from("billing_schedule_items")
          .update({
            status: newScheduleStatus,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", scheduleItemId);

        // Check if all schedule items in the plan are PAID
        if (scheduleItem.billing_plan_id) {
          const { data: allPlanItems } = await supabase
            .from("billing_schedule_items")
            .select("id, amount, status")
            .eq("billing_plan_id", scheduleItem.billing_plan_id);

          if (allPlanItems && allPlanItems.length > 0) {
            const allPaid = allPlanItems.every(
              (it) => it.status === "PAID" || it.status === "WAIVED"
            );
            if (allPaid) {
              await supabase
                .from("billing_plans")
                .update({
                  status: "COMPLETED",
                  updated_at: new Date().toISOString(),
                } as never)
                .eq("id", scheduleItem.billing_plan_id);
            }
          }
        }
      }
    }

    // 4. Notify Client
    const formattedAmount = formatCurrency(payment.amount, payment.currency || "INR");
    await notifyClientUsers({
      clientId: payment.client_id,
      type: "PAYMENT_CONFIRMED",
      title: "Bank Transfer Verified",
      message: `Your bank transfer payment of ${formattedAmount} (UTR: ${payment.transaction_reference || "N/A"}) has been verified and confirmed.`,
      link: payment.billing_schedule_item_id
        ? `/client/payments/${payment.billing_schedule_item_id}`
        : "/client/payments",
    });

    // 5. Revalidate Paths
    try {
      revalidatePath("/hq/payments");
      revalidatePath("/hq");
      revalidatePath("/client/payments");
      revalidatePath("/client");
      if (payment.billing_schedule_item_id) {
        revalidatePath(`/hq/payments/${payment.billing_schedule_item_id}`);
        revalidatePath(`/client/payments/${payment.billing_schedule_item_id}`);
      }
    } catch {
      // Safe fallback
    }

    return {
      success: true,
      payment: updatedPayment as unknown as Payment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Rejects a submitted bank transfer with an authoritative reason.
 */
export async function rejectBankTransferAction(params: {
  paymentId: string;
  reason: string;
}): Promise<PaymentActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized. Super Admin access required." };
  }

  const { paymentId, reason } = params;
  if (!paymentId) {
    return { success: false, error: "Payment ID is required." };
  }
  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "A specific rejection reason is required." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    const { data: existingPayment, error: fetchErr } = await supabase
      .from("payments")
      .select(`
        *,
        client:clients(id, name),
        schedule_item:billing_schedule_items(id, title, amount, currency)
      `)
      .eq("id", paymentId)
      .maybeSingle();

    if (fetchErr || !existingPayment) {
      return { success: false, error: "Payment record not found." };
    }

    const payment = existingPayment as any;

    // Update status to FAILED and record audit reason
    const { data: updatedPayment, error: updateErr } = await supabase
      .from("payments")
      .update({
        status: "FAILED",
        verified_at: new Date().toISOString(),
        verified_by: profile.id,
        notes: `[REJECTED]: ${reason.trim()}`,
      } as never)
      .eq("id", paymentId)
      .select()
      .single();

    if (updateErr || !updatedPayment) {
      return { success: false, error: updateErr?.message || "Failed to update payment status." };
    }

    // Notify Client with specific explanation
    const formattedAmount = formatCurrency(payment.amount, payment.currency || "INR");
    await notifyClientUsers({
      clientId: payment.client_id,
      type: "PAYMENT_FAILED",
      title: "Bank Transfer Verification Rejected",
      message: `Your bank transfer payment of ${formattedAmount} (UTR: ${payment.transaction_reference || "N/A"}) could not be verified: "${reason.trim()}". Please re-submit your transfer details.`,
      link: payment.billing_schedule_item_id
        ? `/client/payments/${payment.billing_schedule_item_id}`
        : "/client/payments",
    });

    try {
      revalidatePath("/hq/payments");
      revalidatePath("/hq");
      revalidatePath("/client/payments");
      revalidatePath("/client");
      if (payment.billing_schedule_item_id) {
        revalidatePath(`/hq/payments/${payment.billing_schedule_item_id}`);
        revalidatePath(`/client/payments/${payment.billing_schedule_item_id}`);
      }
    } catch {
      // Safe fallback
    }

    return {
      success: true,
      payment: updatedPayment as unknown as Payment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Client submits a bank wire transfer / UTR for verification.
 */
export async function submitBankTransferAction(
  formData: FormData
): Promise<PaymentActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Authentication required." };
  }

  const scheduleItemId = formData.get("schedule_item_id") as string;
  const amountStr = formData.get("amount") as string;
  const transactionReference = (formData.get("transaction_reference") as string)?.trim();
  const paidAt = formData.get("paid_at") as string;
  const notes = (formData.get("notes") as string)?.trim();

  if (!scheduleItemId || !amountStr || !transactionReference) {
    return { success: false, error: "Invoice ID, amount, and UTR/reference are required." };
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: "Amount must be greater than zero." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    // 1. Fetch schedule item to verify ownership
    const { data: scheduleItem, error: itemErr } = await supabase
      .from("billing_schedule_items")
      .select(`
        *,
        client:clients(id, name),
        project:projects(id, name),
        billing_plan:billing_plans(id, name)
      `)
      .eq("id", scheduleItemId)
      .maybeSingle();

    if (itemErr || !scheduleItem) {
      return { success: false, error: "Invoice/schedule item not found." };
    }

    const item = scheduleItem as any;

    if (profile.role !== "SUPER_ADMIN" && profile.client_id !== item.client_id) {
      return { success: false, error: "Forbidden: You do not have access to this invoice." };
    }

    // 2. Insert PENDING payment record
    const { data: newPayment, error: insertErr } = await supabase
      .from("payments")
      .insert({
        client_id: item.client_id,
        project_id: item.project_id || null,
        billing_schedule_item_id: item.id,
        amount,
        currency: item.currency || "INR",
        method: "BANK_TRANSFER",
        status: "PENDING",
        transaction_reference: transactionReference,
        paid_at: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
        notes: notes || "Bank transfer submitted by client for verification.",
        created_by: profile.id,
      } as never)
      .select()
      .single();

    if (insertErr || !newPayment) {
      return { success: false, error: insertErr?.message || "Failed to submit bank transfer." };
    }

    // 3. Notify Super Admins
    const formattedAmount = formatCurrency(amount, item.currency || "INR");
    await notifySuperAdmins({
      type: "PAYMENT_CREATED",
      title: "Bank Transfer Submitted",
      message: `${item.client?.name || "Client"} submitted a bank transfer of ${formattedAmount} (UTR: ${transactionReference}) for "${item.title}".`,
      link: `/hq/payments/${item.id}`,
    });

    try {
      revalidatePath("/hq/payments");
      revalidatePath("/hq");
      revalidatePath("/client/payments");
      revalidatePath("/client");
      revalidatePath(`/hq/payments/${item.id}`);
      revalidatePath(`/client/payments/${item.id}`);
    } catch {
      // Safe fallback
    }

    return {
      success: true,
      payment: newPayment as unknown as Payment,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Client submits a payment/billing query to Super Admins.
 */
export async function submitPaymentQueryAction(params: {
  subject: string;
  message: string;
  scheduleItemId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
}): Promise<PaymentActionResult> {
  if (!env.isConfigured()) {
    return { success: false, error: "Supabase environment not configured." };
  }

  const profile = await getAuthenticatedProfile();
  if (!profile) {
    return { success: false, error: "Authentication required." };
  }

  const { subject, message, scheduleItemId, priority = "HIGH" } = params;
  if (!subject?.trim() || !message?.trim()) {
    return { success: false, error: "Subject and message are required." };
  }

  try {
    const admin = getAdminClient();
    const supabase = (admin || (await createServerClient())) as unknown as SupabaseClient<Database>;

    let invoiceContext = "";
    if (scheduleItemId) {
      const { data: item } = await supabase
        .from("billing_schedule_items")
        .select("title, amount, currency, invoice_number")
        .eq("id", scheduleItemId)
        .maybeSingle();

      if (item) {
        invoiceContext = ` (Invoice: ${item.invoice_number || item.title} - ${item.currency} ${item.amount})`;
      }
    }

    // Notify Super Admins with high priority
    await notifySuperAdmins({
      type: "PAYMENT_CREATED",
      title: `[Billing Query]: ${subject.trim()}`,
      message: `Client ${profile.first_name || ""} ${profile.last_name || ""} (${profile.email}) submitted a payment query${invoiceContext}:\n\n"${message.trim()}"`,
      link: scheduleItemId ? `/hq/payments/${scheduleItemId}` : "/hq/payments",
    });

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unexpected server error";
    return { success: false, error: msg };
  }
}
