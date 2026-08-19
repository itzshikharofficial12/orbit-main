"use client";

import * as React from "react";
import { Plus, X, ArrowDownRight, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordManualPaymentAction } from "../actions";
import { formatCurrency, formatPaymentDate } from "../utils";
import type { BillingPlanWithRelations, BillingScheduleItemWithRelations } from "../types";
import type { Client, Project } from "@/lib/supabase/types";

interface RecordPaymentDialogProps {
  clients: Client[];
  projects: Project[];
  plans?: BillingPlanWithRelations[];
  defaultPlan?: BillingPlanWithRelations | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
}

export function RecordPaymentDialog({
  clients,
  projects,
  plans = [],
  defaultPlan = null,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  triggerButton,
}: RecordPaymentDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (setControlledOpen || (() => {})) : setInternalOpen;

  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = React.useState<string>(
    defaultPlan?.client_id || (clients[0]?.id || "")
  );
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(
    defaultPlan?.project_id || ""
  );
  const [selectedScheduleId, setSelectedScheduleId] = React.useState<string>("");
  const [amount, setAmount] = React.useState<number>(0);
  const [transactionRef, setTransactionRef] = React.useState("");
  const [paidAt, setPaidAt] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = React.useState("");

  // Sync state if defaultPlan prop updates
  React.useEffect(() => {
    if (defaultPlan) {
      setSelectedClientId(defaultPlan.client_id);
      setSelectedProjectId(defaultPlan.project_id || "");
      if (defaultPlan.schedule_items && defaultPlan.schedule_items.length > 0) {
        const firstUnpaid = defaultPlan.schedule_items.find(
          (it) => it.status !== "PAID" && it.status !== "CANCELLED"
        );
        if (firstUnpaid) {
          setSelectedScheduleId(firstUnpaid.id);
          setAmount(firstUnpaid.remaining_amount || firstUnpaid.amount);
        }
      }
    }
  }, [defaultPlan]);

  // Available schedule items for client
  const clientPlans = React.useMemo(() => {
    if (!selectedClientId) return [];
    return plans.filter((p) => p.client_id === selectedClientId);
  }, [plans, selectedClientId]);

  const clientScheduleItems = React.useMemo(() => {
    const items: BillingScheduleItemWithRelations[] = [];
    clientPlans.forEach((plan) => {
      (plan.schedule_items || []).forEach((it) => {
        if (it.status !== "PAID" && it.status !== "CANCELLED") {
          items.push(it);
        }
      });
    });
    return items;
  }, [clientPlans]);

  // Auto-fill amount when schedule item selected
  function handleScheduleSelect(scheduleId: string) {
    setSelectedScheduleId(scheduleId);
    if (!scheduleId) return;
    const found = clientScheduleItems.find((it) => it.id === scheduleId);
    if (found) {
      setAmount(found.remaining_amount || found.amount);
      if (found.project_id) {
        setSelectedProjectId(found.project_id);
      }
    }
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
    setErrorMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("client_id", selectedClientId);
    if (selectedProjectId) formData.set("project_id", selectedProjectId);
    if (selectedScheduleId) formData.set("billing_schedule_item_id", selectedScheduleId);
    formData.set("amount", String(amount));
    formData.set("currency", "INR");
    formData.set("transaction_reference", transactionRef);
    formData.set("paid_at", paidAt);
    if (notes) formData.set("notes", notes);

    startTransition(async () => {
      const result = await recordManualPaymentAction(formData);
      if (result.success) {
        setIsOpen(false);
        setTransactionRef("");
        setNotes("");
      } else {
        setErrorMessage(result.error || "Failed to record payment");
      }
    });
  }

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)}>{triggerButton}</span>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="h-9 gap-1.5 text-xs font-medium cursor-pointer"
        >
          <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />
          <span>Record Bank Transfer</span>
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="space-y-0.5">
                <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                  <span>Record Bank Transfer / Offline Payment</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Record verified receipt of client payment and reconcile expected schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 leading-relaxed font-mono">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Client <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      setSelectedScheduleId("");
                    }}
                    required
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Schedule Item Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Apply to Schedule Item <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => handleScheduleSelect(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">General Account Payment / Unlinked</option>
                  {clientScheduleItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} — {formatCurrency(item.remaining_amount || item.amount)} remaining (Due: {formatPaymentDate(item.due_date)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Amount Received (INR) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Transaction / UTR Ref <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AXIS12345678, IMPS987654"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Notes / Reconciliation Memo
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified via Bank statement on Aug 30..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-md border border-border/80 bg-background text-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isPending}
                  className="text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="text-xs h-8 gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Confirm & Reconcile Payment</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
