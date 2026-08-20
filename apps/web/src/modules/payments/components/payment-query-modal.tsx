"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  HelpCircle,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitPaymentQueryAction } from "../actions";

interface PaymentQueryItemOption {
  id: string;
  title: string;
  amount: number;
  currency: string;
  projectId?: string | null;
}

interface PaymentQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: PaymentQueryItemOption[];
  preselectedItemId?: string;
  defaultProjectId?: string;
}

export function PaymentQueryModal({
  isOpen,
  onClose,
  items = [],
  preselectedItemId,
}: PaymentQueryModalProps) {
  const [subject, setSubject] = React.useState("");
  const [selectedItemId, setSelectedItemId] = React.useState(preselectedItemId || "");
  const [message, setMessage] = React.useState("");
  const [priority, setPriority] = React.useState<"LOW" | "MEDIUM" | "HIGH">("HIGH");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const router = useRouter();

  React.useEffect(() => {
    if (isOpen) {
      setSubject("");
      setSelectedItemId(preselectedItemId || "");
      setMessage("");
      setPriority("HIGH");
      setIsSubmitting(false);
      setIsSuccess(false);
      setErrorMsg(null);
    }
  }, [isOpen, preselectedItemId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim()) {
      setErrorMsg("Please enter a query subject.");
      return;
    }

    if (!message.trim()) {
      setErrorMsg("Please provide details regarding your query.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await submitPaymentQueryAction({
        subject: subject.trim(),
        message: message.trim(),
        scheduleItemId: selectedItemId || undefined,
        priority,
      });

      if (res.success) {
        setIsSuccess(true);
        setIsSubmitting(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to submit payment query.");
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Raise Payment Query
              </h2>
              <p className="text-xs text-muted-foreground">
                Direct query to Celestia Studios finance operations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Query Submitted</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Your payment query has been submitted. Our team will review and update you via in-app notification.
              </p>
            </div>
            <div className="pt-3">
              <Button size="sm" onClick={onClose} className="text-xs h-8">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Related Invoice Selector */}
            {items.length > 0 && (
              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  Related Invoice / Milestone (Optional)
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs rounded border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">General Billing Query</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.title} — {it.currency} {it.amount}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1">
              <label className="font-medium text-foreground">
                Query Subject <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Question regarding milestone amount"
                className="text-xs h-8"
              />
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label className="font-medium text-foreground">
                Details & Questions <span className="text-destructive">*</span>
              </label>
              <Textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question or request clarification..."
                className="text-xs bg-background resize-none"
              />
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <label className="font-medium text-muted-foreground">Urgency</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPriority("LOW")}
                  className={`flex-1 py-1.5 px-2.5 rounded text-xs border transition-colors ${
                    priority === "LOW"
                      ? "bg-secondary text-foreground border-primary/50 font-medium"
                      : "border-border/60 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  Low
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("MEDIUM")}
                  className={`flex-1 py-1.5 px-2.5 rounded text-xs border transition-colors ${
                    priority === "MEDIUM"
                      ? "bg-secondary text-foreground border-primary/50 font-medium"
                      : "border-border/60 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("HIGH")}
                  className={`flex-1 py-1.5 px-2.5 rounded text-xs border transition-colors ${
                    priority === "HIGH"
                      ? "bg-destructive/10 text-destructive border-destructive/50 font-semibold"
                      : "border-border/60 text-muted-foreground hover:bg-secondary/40"
                  }`}
                >
                  High
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !subject.trim() || !message.trim()}
                className="text-xs h-8 gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{isSubmitting ? "Submitting..." : "Send Query"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
