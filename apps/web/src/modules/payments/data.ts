import { createServerClient } from "@/lib/supabase/server";
import type {
  BillingPlanWithRelations,
  BillingScheduleItemWithRelations,
  PaymentWithRelations,
  PaymentOverviewMetrics,
  BillingPlanFilterParams,
  Payment,
} from "./types";
import { calculateScheduleStatus } from "./utils";
import { env } from "@/lib/env";

function isMissingTable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg = "message" in err ? String(err.message) : "";
  const code = "code" in err ? String(err.code) : "";
  return (
    msg.includes("billing_plans") ||
    msg.includes("billing_schedule_items") ||
    msg.includes("payments") ||
    code === "PGRST204" ||
    code === "42P01"
  );
}

export async function getBillingPlansForAdmin(
  filters?: BillingPlanFilterParams
): Promise<BillingPlanWithRelations[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();

    let query = supabase
      .from("billing_plans")
      .select(`
        *,
        client:clients(id, name, status, primary_contact_name, primary_contact_email),
        project:projects(id, name, status, service_type),
        created_by_profile:profiles(id, first_name, last_name, email),
        schedule_items:billing_schedule_items(
          *,
          milestone:milestones(id, name, status),
          payments(*)
        )
      `)
      .order("created_at", { ascending: false });

    if (filters?.clientId && filters.clientId !== "ALL") {
      query = query.eq("client_id", filters.clientId);
    }
    if (filters?.projectId && filters.projectId !== "ALL") {
      query = query.eq("project_id", filters.projectId);
    }
    if (filters?.billingType && filters.billingType !== "ALL") {
      query = query.eq("billing_type", filters.billingType);
    }
    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      if (!isMissingTable(error)) {
        console.warn("Notice: Error fetching billing plans:", error.message || error);
      }
      return [];
    }

    const rows = (data as unknown as BillingPlanWithRelations[]) || [];

    // Compute financial aggregates for each plan
    const enriched = rows.map((plan) => {
      let totalPlanPaid = 0;
      let nextDueDate: string | null = null;
      let nextDueAmount: number | null = null;

      const scheduleItems = (plan.schedule_items || [])
        .map((item) => {
          const itemPayments = (item.payments || []).filter((p) => p.status === "PAID");
          const itemPaid = itemPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          totalPlanPaid += itemPaid;

          const currentStatus = calculateScheduleStatus(item, itemPaid);
          const remaining = Math.max(0, Number(item.amount) - itemPaid);

          // Find earliest unpaid due date
          if (remaining > 0 && item.due_date) {
            if (!nextDueDate || new Date(item.due_date) < new Date(nextDueDate)) {
              nextDueDate = item.due_date;
              nextDueAmount = remaining;
            }
          }

          return {
            ...item,
            status: currentStatus,
            paid_amount: itemPaid,
            remaining_amount: remaining,
          };
        })
        .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));

      const totalOutstanding = Math.max(0, Number(plan.total_contract_value) - totalPlanPaid);

      return {
        ...plan,
        schedule_items: scheduleItems,
        total_collected: totalPlanPaid,
        total_outstanding: totalOutstanding,
        next_due_date: nextDueDate,
        next_due_amount: nextDueAmount,
      };
    });

    if (filters?.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      return enriched.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.client?.name?.toLowerCase().includes(q) ||
          p.project?.name?.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return enriched;
  } catch (err) {
    if (!isMissingTable(err)) {
      console.warn("Notice: Unexpected error in getBillingPlansForAdmin:", err);
    }
    return [];
  }
}

export async function getBillingPlansForClient(
  clientId: string
): Promise<BillingPlanWithRelations[]> {
  if (!env.isConfigured() || !clientId) return [];

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("billing_plans")
      .select(`
        *,
        project:projects(id, name, status, service_type),
        schedule_items:billing_schedule_items(
          *,
          milestone:milestones(id, name, status),
          payments(*)
        )
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      if (!isMissingTable(error)) {
        console.warn("Notice: Error fetching client billing plans:", error.message || error);
      }
      return [];
    }

    const rows = (data as unknown as BillingPlanWithRelations[]) || [];

    return rows.map((plan) => {
      let totalPlanPaid = 0;
      let nextDueDate: string | null = null;
      let nextDueAmount: number | null = null;

      const scheduleItems = (plan.schedule_items || [])
        .map((item) => {
          const itemPayments = (item.payments || []).filter((p) => p.status === "PAID");
          const itemPaid = itemPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
          totalPlanPaid += itemPaid;

          const currentStatus = calculateScheduleStatus(item, itemPaid);
          const remaining = Math.max(0, Number(item.amount) - itemPaid);

          if (remaining > 0 && item.due_date) {
            if (!nextDueDate || new Date(item.due_date) < new Date(nextDueDate)) {
              nextDueDate = item.due_date;
              nextDueAmount = remaining;
            }
          }

          return {
            ...item,
            status: currentStatus,
            paid_amount: itemPaid,
            remaining_amount: remaining,
          };
        })
        .sort((a, b) => (a.sequence_number || 0) - (b.sequence_number || 0));

      const totalOutstanding = Math.max(0, Number(plan.total_contract_value) - totalPlanPaid);

      return {
        ...plan,
        schedule_items: scheduleItems,
        total_collected: totalPlanPaid,
        total_outstanding: totalOutstanding,
        next_due_date: nextDueDate,
        next_due_amount: nextDueAmount,
      };
    });
  } catch (err) {
    if (!isMissingTable(err)) {
      console.warn("Notice: Unexpected error in getBillingPlansForClient:", err);
    }
    return [];
  }
}

export async function getPaymentsForAdmin(filters?: {
  clientId?: string;
  projectId?: string;
}): Promise<PaymentWithRelations[]> {
  if (!env.isConfigured()) return [];

  try {
    const supabase = await createServerClient();

    let query = supabase
      .from("payments")
      .select(`
        *,
        client:clients(id, name),
        project:projects(id, name),
        schedule_item:billing_schedule_items(id, title, amount, currency, due_date, billing_plan_id),
        verified_by_profile:profiles!payments_verified_by_fkey(id, first_name, last_name, email)
      `)
      .order("paid_at", { ascending: false });

    if (filters?.clientId && filters.clientId !== "ALL") {
      query = query.eq("client_id", filters.clientId);
    }
    if (filters?.projectId && filters.projectId !== "ALL") {
      query = query.eq("project_id", filters.projectId);
    }

    const { data, error } = await query;

    if (error) {
      if (!isMissingTable(error)) {
        console.warn("Notice: Error fetching payments:", error.message || error);
      }
      return [];
    }

    return (data as unknown as PaymentWithRelations[]) || [];
  } catch (err) {
    if (!isMissingTable(err)) {
      console.warn("Notice: Unexpected error in getPaymentsForAdmin:", err);
    }
    return [];
  }
}

export async function getPaymentsForClient(
  clientId: string
): Promise<PaymentWithRelations[]> {
  if (!env.isConfigured() || !clientId) return [];

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        project:projects(id, name),
        schedule_item:billing_schedule_items(id, title, amount, currency, due_date, billing_plan_id)
      `)
      .eq("client_id", clientId)
      .order("paid_at", { ascending: false });

    if (error) {
      if (!isMissingTable(error)) {
        console.warn("Notice: Error fetching client payments:", error.message || error);
      }
      return [];
    }

    return (data as unknown as PaymentWithRelations[]) || [];
  } catch (err) {
    if (!isMissingTable(err)) {
      console.warn("Notice: Unexpected error in getPaymentsForClient:", err);
    }
    return [];
  }
}

export async function getPaymentOverviewMetrics(
  clientId?: string
): Promise<PaymentOverviewMetrics> {
  const fallback: PaymentOverviewMetrics = {
    outstanding: 0,
    collected: 0,
    overdue: 0,
    upcoming: 0,
    currency: "INR",
  };

  if (!env.isConfigured()) return fallback;

  try {
    const supabase = await createServerClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch schedule items with their payments
    let scheduleQuery = supabase.from("billing_schedule_items").select(`
      id,
      amount,
      due_date,
      status,
      payments(*)
    `);

    if (clientId) {
      scheduleQuery = scheduleQuery.eq("client_id", clientId);
    }

    const { data: scheduleData, error: schedErr } = await scheduleQuery;

    if (schedErr || !scheduleData) {
      return fallback;
    }

    let totalOutstanding = 0;
    let totalCollected = 0;
    let totalOverdue = 0;
    let totalUpcoming = 0;

    for (const item of scheduleData as Array<{
      id: string;
      amount: number;
      due_date: string | null;
      status: string;
      payments: Payment[];
    }>) {
      const itemPayments = (item.payments || []).filter((p) => p.status === "PAID");
      const itemPaid = itemPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      totalCollected += itemPaid;

      const remaining = Math.max(0, Number(item.amount) - itemPaid);
      totalOutstanding += remaining;

      if (remaining > 0) {
        if (item.due_date) {
          const dueDate = new Date(item.due_date);
          dueDate.setHours(0, 0, 0, 0);

          if (dueDate < today) {
            totalOverdue += remaining;
          } else {
            totalUpcoming += remaining;
          }
        } else {
          totalUpcoming += remaining;
        }
      }
    }

    return {
      outstanding: totalOutstanding,
      collected: totalCollected,
      overdue: totalOverdue,
      upcoming: totalUpcoming,
      currency: "INR",
    };
  } catch (err) {
    if (!isMissingTable(err)) {
      console.warn("Notice: Unexpected error in getPaymentOverviewMetrics:", err);
    }
    return fallback;
  }
}

export async function getBillingPlanById(
  planId: string
): Promise<BillingPlanWithRelations | null> {
  if (!env.isConfigured() || !planId) return null;

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from("billing_plans")
      .select(`
        *,
        client:clients(id, name, status, primary_contact_name, primary_contact_email),
        project:projects(id, name, status, service_type),
        created_by_profile:profiles(id, first_name, last_name, email),
        schedule_items:billing_schedule_items(
          *,
          milestone:milestones(id, name, status),
          payments(*)
        )
      `)
      .eq("id", planId)
      .maybeSingle();

    if (error || !data) return null;

    const plan = data as unknown as BillingPlanWithRelations;
    let totalPlanPaid = 0;

    const scheduleItems = (plan.schedule_items || []).map((item) => {
      const itemPayments = (item.payments || []).filter((p) => p.status === "PAID");
      const itemPaid = itemPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      totalPlanPaid += itemPaid;

      const currentStatus = calculateScheduleStatus(item, itemPaid);
      const remaining = Math.max(0, Number(item.amount) - itemPaid);

      return {
        ...item,
        status: currentStatus,
        paid_amount: itemPaid,
        remaining_amount: remaining,
      };
    });

    const totalOutstanding = Math.max(0, Number(plan.total_contract_value) - totalPlanPaid);

    return {
      ...plan,
      schedule_items: scheduleItems,
      total_collected: totalPlanPaid,
      total_outstanding: totalOutstanding,
    };
  } catch {
    return null;
  }
}

export async function getInvoiceById(
  invoiceIdOrNumber: string
): Promise<import("./types").InvoiceWithDetails | null> {
  if (!env.isConfigured() || !invoiceIdOrNumber) return null;

  try {
    const supabase = await createServerClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      invoiceIdOrNumber
    );

    let query = supabase
      .from("billing_schedule_items")
      .select(`
        *,
        client:clients(id, name, primary_contact_name, primary_contact_email, primary_contact_phone),
        project:projects(id, name, service_type),
        billing_plan:billing_plans(id, name, billing_type, total_contract_value),
        milestone:milestones(id, name, status),
        payments(
          *,
          verified_by_profile:profiles!payments_verified_by_fkey(id, first_name, last_name, email)
        )
      `);

    if (isUuid) {
      query = query.eq("id", invoiceIdOrNumber);
    } else {
      query = query.eq("invoice_number", invoiceIdOrNumber);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;

    const item = data as any;
    const paidPayments = (item.payments || []).filter((p: any) => p.status === "PAID");
    const totalPaid = paidPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, Number(item.amount) - totalPaid);
    const currentStatus = calculateScheduleStatus(item, totalPaid);

    return {
      id: item.id,
      invoice_number: item.invoice_number || `CS-2026-${item.id.slice(0, 4)}`,
      billing_plan_id: item.billing_plan_id,
      client_id: item.client_id,
      project_id: item.project_id || null,
      title: item.title,
      description: item.description || null,
      amount: Number(item.amount) || 0,
      tax_amount: Number(item.tax_amount) || 0,
      currency: item.currency || "INR",
      due_date: item.due_date || null,
      issue_date: item.issue_date || item.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      sequence_number: item.sequence_number || 1,
      status: currentStatus,
      notes: item.notes || null,
      terms: item.terms || null,
      paid_amount: totalPaid,
      balance_due: balanceDue,
      client: item.client || {
        id: item.client_id,
        name: "Client",
        primary_contact_name: null,
        primary_contact_email: null,
        primary_contact_phone: null,
      },
      project: item.project || null,
      billing_plan: item.billing_plan || {
        id: item.billing_plan_id,
        name: "Billing Plan",
        billing_type: "ONE_TIME",
        total_contract_value: Number(item.amount) || 0,
      },
      milestone: item.milestone || null,
      payments: item.payments || [],
    };
  } catch (err) {
    console.error("Error in getInvoiceById:", err);
    return null;
  }
}

export async function getReceiptById(
  paymentIdOrReceiptNumber: string
): Promise<import("./types").ReceiptWithDetails | null> {
  if (!env.isConfigured() || !paymentIdOrReceiptNumber) return null;

  try {
    const supabase = await createServerClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      paymentIdOrReceiptNumber
    );

    let query = supabase
      .from("payments")
      .select(`
        *,
        client:clients(id, name, primary_contact_name, primary_contact_email),
        project:projects(id, name, service_type),
        schedule_item:billing_schedule_items(id, title, amount),
        verified_by_profile:profiles!payments_verified_by_fkey(id, first_name, last_name, email)
      `);

    if (isUuid) {
      query = query.eq("id", paymentIdOrReceiptNumber);
    } else {
      query = query.eq("receipt_number", paymentIdOrReceiptNumber);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) return null;

    const payment = data as any;

    return {
      id: payment.id,
      receipt_number: payment.receipt_number || `CS-RCP-2026-${payment.id.slice(0, 4)}`,
      invoice_number: payment.schedule_item?.invoice_number || null,
      payment_date: payment.paid_at || payment.created_at,
      amount: Number(payment.amount) || 0,
      currency: payment.currency || "INR",
      method: payment.method,
      transaction_reference: payment.transaction_reference || null,
      status: payment.status,
      notes: payment.notes || null,
      client: payment.client || {
        id: payment.client_id,
        name: "Client",
        primary_contact_name: null,
        primary_contact_email: null,
      },
      project: payment.project || null,
      schedule_item: payment.schedule_item || null,
      verified_by_profile: payment.verified_by_profile || null,
    };
  } catch (err) {
    console.error("Error in getReceiptById:", err);
    return null;
  }
}

