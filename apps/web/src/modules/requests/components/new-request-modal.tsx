"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  HelpCircle,
  FolderKanban,
  FileCheck,
  CreditCard,
  Video,
  AlertTriangle,
  Inbox,
  Send,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClientRequestAction } from "../actions";
import type { RequestCategory, ClientRequestPriority } from "../types";

export interface RequestResourceOption {
  id: string;
  name: string;
  projectId?: string;
  type?: "PROJECT" | "DELIVERABLE" | "PAYMENT" | "MEETING";
}

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: Array<{ id: string; name: string }>;
  deliverables?: Array<{ id: string; title: string; projectId: string }>;
  defaultCategory?: RequestCategory;
  defaultProjectId?: string;
  defaultDeliverableId?: string;
}

const CATEGORIES: Array<{
  id: RequestCategory;
  label: string;
  icon: typeof HelpCircle;
  description: string;
}> = [
  { id: "GENERAL", label: "General", icon: HelpCircle, description: "General inquiry or account question" },
  { id: "PROJECT", label: "Project", icon: FolderKanban, description: "Milestone, timeline, or scope inquiry" },
  { id: "DELIVERABLE", label: "Deliverable", icon: FileCheck, description: "Review feedback or asset revision" },
  { id: "PAYMENT", label: "Payment", icon: CreditCard, description: "Billing, invoice, or receipt question" },
  { id: "MEETING", label: "Meeting", icon: Video, description: "Schedule, reschedule, or agenda" },
  { id: "TECHNICAL", label: "Technical Issue", icon: AlertTriangle, description: "Bug, blocker, or unexpected behavior" },
  { id: "OTHER", label: "Other", icon: Inbox, description: "Any other support inquiry" },
];

export function NewRequestModal({
  isOpen,
  onClose,
  projects = [],
  deliverables = [],
  defaultCategory = "GENERAL",
  defaultProjectId,
  defaultDeliverableId,
}: NewRequestModalProps) {
  const router = useRouter();

  const [category, setCategory] = React.useState<RequestCategory>(defaultCategory);
  const [projectId, setProjectId] = React.useState<string>(defaultProjectId || "");
  const [deliverableId, setDeliverableId] = React.useState<string>(defaultDeliverableId || "");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<ClientRequestPriority>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setProjectId(defaultProjectId || (projects[0]?.id || ""));
      setDeliverableId(defaultDeliverableId || "");
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, defaultCategory, defaultProjectId, defaultDeliverableId, projects]);

  if (!isOpen) return null;

  // Filter deliverables for currently selected project if any
  const availableDeliverables = projectId
    ? deliverables.filter((d) => d.projectId === projectId)
    : deliverables;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg("Please enter a request title.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Please provide a description or message.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await createClientRequestAction({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        projectId: projectId || null,
        deliverableId: category === "DELIVERABLE" && deliverableId ? deliverableId : null,
      });

      if (res.success && res.request) {
        setIsSubmitting(false);
        onClose();
        router.push(`/client/requests/${res.request.id}`);
      } else {
        setErrorMsg(res.error || "Failed to create request.");
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

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold block mb-0.5">
              Support & Inquiries
            </span>
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              New Request
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ask a question, report an issue, or request an update from Celestia Studios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Category Selection */}
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "bg-secondary text-foreground border-primary/60 font-semibold shadow-sm"
                        : "border-border/60 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Optional Related Resource Selector */}
          {(category === "PROJECT" || category === "DELIVERABLE" || category === "PAYMENT" || projects.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  Related Project {category === "PROJECT" || category === "DELIVERABLE" ? "" : "(Optional)"}
                </label>
                <select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setDeliverableId("");
                  }}
                  className="w-full h-8 px-2.5 text-xs rounded border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {category === "DELIVERABLE" && availableDeliverables.length > 0 && (
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Related Deliverable</label>
                  <select
                    value={deliverableId}
                    onChange={(e) => setDeliverableId(e.target.value)}
                    className="w-full h-8 px-2.5 text-xs rounded border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Deliverable</option>
                    {availableDeliverables.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 3. Title */}
          <div className="space-y-1">
            <label className="font-medium text-foreground">
              Subject / Title <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Update on landing page mockup or question regarding billing"
              className="text-xs h-8"
            />
          </div>

          {/* 4. Priority */}
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground">Priority</label>
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
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority("HIGH")}
                className={`flex-1 py-1.5 px-2.5 rounded text-xs border transition-colors ${
                  priority === "HIGH"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/50 font-semibold"
                    : "border-border/60 text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                High
              </button>
            </div>
          </div>

          {/* 5. Description / Message */}
          <div className="space-y-1">
            <label className="font-medium text-foreground">
              Details & Message <span className="text-destructive">*</span>
            </label>
            <Textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about your request, question, or issue..."
              className="text-xs bg-background resize-none"
            />
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{isSubmitting ? "Submitting..." : "Submit Request"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
