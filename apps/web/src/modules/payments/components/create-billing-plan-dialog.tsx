"use client";

import * as React from "react";
import {
  Plus,
  X,
  CreditCard,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBillingPlanAction } from "../actions";
import { formatCurrency, generateRecurringScheduleItems } from "../utils";
import type { BillingType } from "../types";
import type { Client, Project, Milestone } from "@/lib/supabase/types";

interface CreateBillingPlanDialogProps {
  clients: Client[];
  projects: Project[];
  milestones?: Milestone[];
}

export function CreateBillingPlanDialog({
  clients,
  projects,
  milestones = [],
}: CreateBillingPlanDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form State
  const [selectedClientId, setSelectedClientId] = React.useState("");
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [planName, setPlanName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [billingType, setBillingType] = React.useState<BillingType>("ONE_TIME");
  const [startDate, setStartDate] = React.useState(() => new Date().toISOString().split("T")[0]);

  // One-Time State
  const [oneTimeAmount, setOneTimeAmount] = React.useState<number>(150000);
  const [oneTimeDueDate, setOneTimeDueDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });

  // Installments State
  const [installmentContractValue, setInstallmentContractValue] = React.useState<number>(200000);
  const [installments, setInstallments] = React.useState<
    Array<{ title: string; amount: number; due_date: string }>
  >([
    { title: "Advance Payment", amount: 80000, due_date: "" },
    { title: "Development Phase", amount: 60000, due_date: "" },
    { title: "Final Delivery", amount: 60000, due_date: "" },
  ]);

  // Recurring State
  const [recurringAmount, setRecurringAmount] = React.useState<number>(40000);
  const [recurringFrequency, setRecurringFrequency] = React.useState<
    "MONTHLY" | "QUARTERLY" | "YEARLY"
  >("MONTHLY");
  const [recurringDurationType, setRecurringDurationType] = React.useState<
    "CYCLES" | "END_DATE" | "ONGOING"
  >("CYCLES");
  const [recurringCycles, setRecurringCycles] = React.useState<number>(6);
  const [recurringEndDate, setRecurringEndDate] = React.useState("");

  // Milestone State
  const [milestoneItems, setMilestoneItems] = React.useState<
    Array<{ milestone_id: string; title: string; amount: number; due_date: string }>
  >([{ milestone_id: "", title: "Milestone 1 — Initial Delivery", amount: 75000, due_date: "" }]);

  // Custom State
  const [customItems, setCustomItems] = React.useState<
    Array<{ title: string; amount: number; due_date: string; description: string }>
  >([
    { title: "First Tranche", amount: 35000, due_date: "", description: "" },
    { title: "Second Tranche", amount: 20000, due_date: "", description: "" },
    { title: "Final Tranche", amount: 45000, due_date: "", description: "" },
  ]);

  // Hybrid State
  const [hybridSetupAmount, setHybridSetupAmount] = React.useState<number>(150000);
  const [hybridSetupDueDate, setHybridSetupDueDate] = React.useState("");
  const [hybridRetainerAmount, setHybridRetainerAmount] = React.useState<number>(20000);
  const [hybridRetainerCycles, setHybridRetainerCycles] = React.useState<number>(6);

  // Auto-select first client
  React.useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Filter projects by client
  const clientProjects = React.useMemo(() => {
    if (!selectedClientId) return [];
    return projects.filter((p) => p.client_id === selectedClientId);
  }, [projects, selectedClientId]);

  // Filter milestones by project
  const projectMilestones = React.useMemo(() => {
    if (!selectedProjectId) return [];
    return milestones.filter((m) => m.project_id === selectedProjectId);
  }, [milestones, selectedProjectId]);

  function handleOpen() {
    setErrorMessage(null);
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
    setErrorMessage(null);
  }

  // Calculate totals and validation
  const installmentTotal = installments.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const installmentRemaining = installmentContractValue - installmentTotal;

  const customTotal = customItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const milestoneTotal = milestoneItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const hybridTotal = hybridSetupAmount + hybridRetainerAmount * hybridRetainerCycles;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    let totalContractValue = 0;
    let scheduleItems: Array<{
      title: string;
      description?: string | null;
      amount: number;
      due_date: string | null;
      milestone_id: string | null;
      recurrence_reference: string | null;
    }> = [];

    if (billingType === "ONE_TIME") {
      totalContractValue = Number(oneTimeAmount);
      scheduleItems = [
        {
          title: planName || "One-Time Project Fee",
          amount: totalContractValue,
          due_date: oneTimeDueDate || null,
          milestone_id: null,
          recurrence_reference: null,
        },
      ];
    } else if (billingType === "INSTALLMENTS") {
      totalContractValue = Number(installmentContractValue);
      if (Math.abs(installmentRemaining) > 0.01) {
        setErrorMessage(
          `Installment sum (${formatCurrency(installmentTotal)}) must equal contract value (${formatCurrency(installmentContractValue)}).`
        );
        return;
      }
      scheduleItems = installments.map((it, idx) => ({
        title: it.title || `Installment ${idx + 1}`,
        amount: Number(it.amount),
        due_date: it.due_date || null,
        milestone_id: null,
        recurrence_reference: `Installment ${idx + 1} of ${installments.length}`,
      }));
    } else if (billingType === "RECURRING") {
      const generated = generateRecurringScheduleItems({
        amount: Number(recurringAmount),
        frequency: recurringFrequency,
        startDate,
        durationType: recurringDurationType,
        cycles: recurringCycles,
        endDate: recurringEndDate,
        titlePrefix: planName || "Retainer",
      });
      scheduleItems = generated.map((it) => ({
        title: it.title,
        amount: it.amount,
        due_date: it.dueDate || null,
        milestone_id: null,
        recurrence_reference: it.recurrenceReference || null,
      }));
      totalContractValue = scheduleItems.reduce((acc, it) => acc + it.amount, 0);
    } else if (billingType === "MILESTONE") {
      totalContractValue = milestoneTotal;
      scheduleItems = milestoneItems.map((it) => ({
        title: it.title || "Milestone Payment",
        amount: Number(it.amount),
        due_date: it.due_date || null,
        milestone_id: it.milestone_id || null,
        recurrence_reference: null,
      }));
    } else if (billingType === "CUSTOM") {
      totalContractValue = customTotal;
      scheduleItems = customItems.map((it) => ({
        title: it.title,
        description: it.description || null,
        amount: Number(it.amount),
        due_date: it.due_date || null,
        milestone_id: null,
        recurrence_reference: null,
      }));
    } else if (billingType === "HYBRID") {
      totalContractValue = hybridTotal;
      // Setup component
      const setupItem = {
        title: `${planName || "Project"} — Setup Fee`,
        amount: Number(hybridSetupAmount),
        due_date: hybridSetupDueDate || null,
        milestone_id: null,
        recurrence_reference: "Component: Setup Fee",
      };
      // Retainer component
      const retainerItems = generateRecurringScheduleItems({
        amount: Number(hybridRetainerAmount),
        frequency: "MONTHLY",
        startDate,
        durationType: "CYCLES",
        cycles: hybridRetainerCycles,
        titlePrefix: `${planName || "Project"} — Retainer`,
      }).map((it) => ({
        title: it.title,
        amount: it.amount,
        due_date: it.dueDate || null,
        milestone_id: null,
        recurrence_reference: `Component: Retainer (${it.recurrenceReference})`,
      }));

      scheduleItems = [setupItem, ...retainerItems];
    }

    startTransition(async () => {
      const result = await createBillingPlanAction({
        client_id: selectedClientId,
        project_id: selectedProjectId || null,
        name: planName,
        description: description || null,
        billing_type: billingType,
        total_contract_value: totalContractValue,
        currency: "INR",
        start_date: startDate,
        end_date: recurringEndDate || null,
        schedule_items: scheduleItems,
      });

      if (result.success) {
        setIsOpen(false);
      } else {
        setErrorMessage(result.error || "Failed to create billing plan");
      }
    });
  }

  return (
    <>
      <Button onClick={handleOpen} className="h-9 gap-1.5 text-xs font-medium cursor-pointer">
        <Plus className="h-3.5 w-3.5" />
        <span>Create Billing Plan</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          />

          {/* Modal Container */}
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="space-y-0.5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Create Commercial Billing Plan</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Establish a structured billing arrangement with expected receivable schedules.
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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Step 1: Account Context */}
              <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-secondary/20">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground block">
                  1. Client & Plan Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Client <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
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
                    <label className="text-xs font-medium text-foreground">
                      Project <span className="text-muted-foreground font-normal">(Optional)</span>
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">General Client Account</option>
                      {clientProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Billing Plan Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Website Strategy & Build, Monthly SEO Retainer"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Start Date <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Choose Commercial Billing Type */}
              <div className="space-y-3">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground block">
                  2. Choose Commercial Structure
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: "ONE_TIME", label: "One-Time", desc: "Single fixed fee" },
                      { id: "INSTALLMENTS", label: "Installments", desc: "Advance + milestones" },
                      { id: "RECURRING", label: "Recurring", desc: "Monthly / retainer cycles" },
                      { id: "MILESTONE", label: "Milestone", desc: "Tied to deliverables" },
                      { id: "CUSTOM", label: "Custom", desc: "Arbitrary dates & sums" },
                      { id: "HYBRID", label: "Hybrid", desc: "Setup + recurring" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBillingType(item.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        billingType === item.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 bg-card hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-xs font-semibold block">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground block leading-tight mt-0.5">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Dynamic Configuration Section */}
              <div className="space-y-4 p-4 rounded-lg border border-border/80 bg-card shadow-inner">
                {/* 1. ONE_TIME UI */}
                {billingType === "ONE_TIME" && (
                  <div className="space-y-4">
                    <span className="text-xs font-mono font-semibold uppercase text-primary block">
                      One-Time Payment Setup
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Total Amount (INR) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={oneTimeAmount}
                          onChange={(e) => setOneTimeAmount(Number(e.target.value))}
                          className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Due Date</label>
                        <input
                          type="date"
                          value={oneTimeDueDate}
                          onChange={(e) => setOneTimeDueDate(e.target.value)}
                          className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-md bg-secondary/40 border border-border/40 flex items-center justify-between text-xs font-mono">
                      <span>Total Expected:</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(oneTimeAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. INSTALLMENTS UI */}
                {billingType === "INSTALLMENTS" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold uppercase text-purple-400">
                        Installment Structure
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setInstallments((prev) => [
                            ...prev,
                            { title: `Installment ${prev.length + 1}`, amount: 0, due_date: "" },
                          ])
                        }
                        className="text-xs h-7 gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Stage</span>
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Total Contract Value (INR) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={installmentContractValue}
                        onChange={(e) => setInstallmentContractValue(Number(e.target.value))}
                        className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {installments.map((inst, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/40 text-xs"
                        >
                          <span className="font-mono text-muted-foreground w-6">
                            0{idx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder="Stage title (e.g. Advance)"
                            value={inst.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInstallments((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                              );
                            }}
                            className="flex-1 h-8 px-2.5 text-xs rounded border border-border/60 bg-background text-foreground"
                          />
                          <input
                            type="number"
                            placeholder="Amount"
                            value={inst.amount || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setInstallments((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, amount: val } : item
                                )
                              );
                            }}
                            className="w-28 h-8 px-2 text-xs rounded border border-border/60 bg-background text-foreground font-mono"
                          />
                          <input
                            type="date"
                            value={inst.due_date}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInstallments((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, due_date: val } : item
                                )
                              );
                            }}
                            className="w-32 h-8 px-2 text-xs rounded border border-border/60 bg-background text-foreground"
                          />
                          {installments.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setInstallments((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-muted-foreground hover:text-red-400 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-md bg-secondary/40 border border-border/40 grid grid-cols-3 gap-2 text-xs font-mono text-center">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">SCHEDULED</span>
                        <span className="font-semibold">{formatCurrency(installmentTotal)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">CONTRACT</span>
                        <span className="font-semibold">{formatCurrency(installmentContractValue)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">REMAINING</span>
                        <span
                          className={`font-semibold ${
                            Math.abs(installmentRemaining) < 0.01
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          {formatCurrency(installmentRemaining)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. RECURRING UI */}
                {billingType === "RECURRING" && (
                  <div className="space-y-4">
                    <span className="text-xs font-mono font-semibold uppercase text-teal-400 block">
                      Recurring Retainer Setup
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Amount per Cycle (INR) *
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={recurringAmount}
                          onChange={(e) => setRecurringAmount(Number(e.target.value))}
                          className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Billing Frequency *
                        </label>
                        <select
                          value={recurringFrequency}
                          onChange={(e) => setRecurringFrequency(e.target.value as any)}
                          className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="MONTHLY">Monthly</option>
                          <option value="QUARTERLY">Quarterly (Every 3 months)</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">
                          Duration Type *
                        </label>
                        <select
                          value={recurringDurationType}
                          onChange={(e) => setRecurringDurationType(e.target.value as any)}
                          className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="CYCLES">Fixed Number of Cycles</option>
                          <option value="ONGOING">Ongoing / Continuous Retainer</option>
                          <option value="END_DATE">Fixed End Date</option>
                        </select>
                      </div>

                      {recurringDurationType === "CYCLES" && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground">
                            Number of Cycles (e.g. 6)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={recurringCycles}
                            onChange={(e) => setRecurringCycles(Number(e.target.value))}
                            className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground font-mono"
                          />
                        </div>
                      )}

                      {recurringDurationType === "END_DATE" && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground">End Date</label>
                          <input
                            type="date"
                            value={recurringEndDate}
                            onChange={(e) => setRecurringEndDate(e.target.value)}
                            className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. MILESTONE UI */}
                {billingType === "MILESTONE" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold uppercase text-amber-400">
                        Milestone Deliverables Billing
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setMilestoneItems((prev) => [
                            ...prev,
                            {
                              milestone_id: "",
                              title: `Milestone ${prev.length + 1}`,
                              amount: 50000,
                              due_date: "",
                            },
                          ])
                        }
                        className="text-xs h-7 gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Milestone</span>
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {milestoneItems.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/30 border border-border/40 text-xs"
                        >
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              placeholder="Milestone title"
                              value={it.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMilestoneItems((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, title: val } : item
                                  )
                                );
                              }}
                              className="w-full h-8 px-2.5 text-xs rounded border border-border/60 bg-background text-foreground"
                            />
                            {projectMilestones.length > 0 && (
                              <select
                                value={it.milestone_id}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const m = projectMilestones.find((pm) => pm.id === val);
                                  setMilestoneItems((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            milestone_id: val,
                                            title: m ? m.name : item.title,
                                          }
                                        : item
                                    )
                                  );
                                }}
                                className="w-full h-7 px-2 text-[11px] rounded border border-border/40 bg-background/80 text-muted-foreground"
                              >
                                <option value="">Link Project Milestone (Optional)...</option>
                                {projectMilestones.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={it.amount || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setMilestoneItems((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, amount: val } : item
                                )
                              );
                            }}
                            className="w-28 h-8 px-2 text-xs rounded border border-border/60 bg-background text-foreground font-mono self-start"
                          />
                          <input
                            type="date"
                            value={it.due_date}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMilestoneItems((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, due_date: val } : item
                                )
                              );
                            }}
                            className="w-32 h-8 px-2 text-xs rounded border border-border/60 bg-background text-foreground self-start"
                          />
                          {milestoneItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setMilestoneItems((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-muted-foreground hover:text-red-400 p-1 self-start"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-md bg-secondary/40 border border-border/40 flex items-center justify-between text-xs font-mono">
                      <span>Total Milestone Value:</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(milestoneTotal)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 5. CUSTOM UI */}
                {billingType === "CUSTOM" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold uppercase text-zinc-300">
                        Custom Schedule Breakdown
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCustomItems((prev) => [
                            ...prev,
                            {
                              title: `Tranche ${prev.length + 1}`,
                              amount: 25000,
                              due_date: "",
                              description: "",
                            },
                          ])
                        }
                        className="text-xs h-7 gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Row</span>
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {customItems.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-2.5 rounded-md bg-secondary/30 border border-border/40 text-xs"
                        >
                          <input
                            type="text"
                            placeholder="Title (e.g. Phase 1 Payment)"
                            value={it.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomItems((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, title: val } : item
                                )
                              );
                            }}
                            className="flex-1 h-8 px-2.5 text-xs rounded border border-border/60 bg-background text-foreground"
                          />
                          <input
                            type="number"
                            placeholder="Amount"
                            value={it.amount || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCustomItems((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, amount: val } : item
                                )
                              );
                            }}
                            className="w-28 h-8 px-2 text-xs rounded border border-border/60 bg-background text-foreground font-mono"
                          />
                          <input
                            type="date"
                            value={it.due_date}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomItems((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, due_date: val } : item
                                )
                              );
                            }}
                            className="w-32 h-8 px-2 text-xs rounded border border-border/60 bg-background text-foreground"
                          />
                          {customItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setCustomItems((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-muted-foreground hover:text-red-400 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-md bg-secondary/40 border border-border/40 flex items-center justify-between text-xs font-mono">
                      <span>Total Custom Value:</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(customTotal)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 6. HYBRID UI */}
                {billingType === "HYBRID" && (
                  <div className="space-y-4">
                    <span className="text-xs font-mono font-semibold uppercase text-indigo-400 block">
                      Hybrid Architecture (Setup + Retainer)
                    </span>

                    <div className="p-3 rounded-md border border-border/60 bg-secondary/20 space-y-3">
                      <span className="text-xs font-semibold text-foreground block">
                        Component 1: One-Time Setup Fee
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Setup Amount (INR)</label>
                          <input
                            type="number"
                            min={1}
                            value={hybridSetupAmount}
                            onChange={(e) => setHybridSetupAmount(Number(e.target.value))}
                            className="w-full h-8 px-2.5 text-xs rounded border border-border/80 bg-background text-foreground font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Setup Due Date</label>
                          <input
                            type="date"
                            value={hybridSetupDueDate}
                            onChange={(e) => setHybridSetupDueDate(e.target.value)}
                            className="w-full h-8 px-2.5 text-xs rounded border border-border/80 bg-background text-foreground"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-md border border-border/60 bg-secondary/20 space-y-3">
                      <span className="text-xs font-semibold text-foreground block">
                        Component 2: Monthly Maintenance Retainer
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Monthly Fee (INR)</label>
                          <input
                            type="number"
                            min={1}
                            value={hybridRetainerAmount}
                            onChange={(e) => setHybridRetainerAmount(Number(e.target.value))}
                            className="w-full h-8 px-2.5 text-xs rounded border border-border/80 bg-background text-foreground font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-muted-foreground">Number of Months</label>
                          <input
                            type="number"
                            min={1}
                            max={36}
                            value={hybridRetainerCycles}
                            onChange={(e) => setHybridRetainerCycles(Number(e.target.value))}
                            className="w-full h-8 px-2.5 text-xs rounded border border-border/80 bg-background text-foreground font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-md bg-secondary/40 border border-border/40 flex items-center justify-between text-xs font-mono">
                      <span>Total Hybrid Value:</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(hybridTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/40">
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
                  className="text-xs h-8 gap-1.5 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Create Plan & Schedules</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
