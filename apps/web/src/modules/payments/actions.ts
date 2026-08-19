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
import { notifyClientUsers } from "@/modules/notifications/service";
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
