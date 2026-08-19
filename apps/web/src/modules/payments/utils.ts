import type { BillingScheduleStatus } from "./types";

/**
 * Formats a number into Indian Rupee format (e.g. ₹1,50,000) or specified currency.
 */
export function formatCurrency(amount: number, currency: string = "INR"): string {
  try {
    const num = Number(amount) || 0;
    if (currency === "INR") {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(num);
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `₹${amount.toLocaleString()}`;
  }
}

/**
 * Formats a date string into readable date (e.g. 15 Sep 2026).
 */
export function formatPaymentDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Calculates current schedule status based on amount, paid amount, and due date.
 */
export function calculateScheduleStatus(
  item: { amount: number; due_date: string | null; status?: BillingScheduleStatus },
  paidAmount: number
): BillingScheduleStatus {
  if (item.status === "CANCELLED" || item.status === "WAIVED") {
    return item.status;
  }

  const amount = Number(item.amount) || 0;
  const paid = Number(paidAmount) || 0;

  if (paid >= amount && amount > 0) {
    return "PAID";
  }

  if (paid > 0 && paid < amount) {
    return "PARTIALLY_PAID";
  }

  if (item.due_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(item.due_date);
    due.setHours(0, 0, 0, 0);

    if (due < today) {
      return "OVERDUE";
    }
    if (due.getTime() === today.getTime()) {
      return "DUE";
    }
  }

  return "SCHEDULED";
}

/**
 * Adds months to a date.
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Helper to generate recurring schedule items.
 */
export function generateRecurringScheduleItems(config: {
  amount: number;
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM";
  startDate: string;
  durationType: "CYCLES" | "END_DATE" | "ONGOING";
  cycles?: number;
  endDate?: string;
  titlePrefix?: string;
}): Array<{
  title: string;
  amount: number;
  dueDate: string;
  sequenceNumber: number;
  recurrenceReference: string;
}> {
  const items: Array<{
    title: string;
    amount: number;
    dueDate: string;
    sequenceNumber: number;
    recurrenceReference: string;
  }> = [];

  const start = new Date(config.startDate || new Date().toISOString().split("T")[0]);
  const monthStep =
    config.frequency === "QUARTERLY" ? 3 : config.frequency === "YEARLY" ? 12 : 1;

  let totalCycles = 6; // default 6 cycles for ongoing initial batch
  if (config.durationType === "CYCLES") {
    totalCycles = Math.min(Math.max(Number(config.cycles) || 1, 1), 60);
  } else if (config.durationType === "END_DATE" && config.endDate) {
    const end = new Date(config.endDate);
    const diffMonths =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    totalCycles = Math.min(Math.max(Math.ceil(diffMonths / monthStep), 1), 60);
  } else if (config.durationType === "ONGOING") {
    totalCycles = 6; // Generate 6 upcoming cycles for ongoing retainer
  }

  const prefix = config.titlePrefix || "Retainer";

  for (let i = 0; i < totalCycles; i++) {
    const dueDate = addMonths(start, i * monthStep);
    const dueDateStr = dueDate.toISOString().split("T")[0];
    const cycleNum = i + 1;
    const ref =
      config.durationType === "ONGOING"
        ? `Cycle ${cycleNum} (Ongoing)`
        : `Cycle ${cycleNum} of ${totalCycles}`;

    items.push({
      title: `${prefix} — Cycle ${cycleNum}`,
      amount: config.amount,
      dueDate: dueDateStr,
      sequenceNumber: cycleNum,
      recurrenceReference: ref,
    });
  }

  return items;
}
