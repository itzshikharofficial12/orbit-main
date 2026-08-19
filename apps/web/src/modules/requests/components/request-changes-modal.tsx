"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createChangeRequestAction } from "../actions";
import type { ClientRequestPriority } from "../types";
import type { Deliverable } from "@/lib/supabase/types";

interface RequestChangesModalProps {
  deliverable: Pick<Deliverable, "id" | "title">;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RequestChangesModal({
  deliverable,
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: RequestChangesModalProps) {
  const router = useRouter();
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<ClientRequestPriority>("MEDIUM");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSubject(`Revisions for ${deliverable.title}`);
      setDescription("");
      setPriority("MEDIUM");
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, deliverable.title]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!subject.trim() || subject.trim().length < 3) {
      setErrorMessage("Please provide a subject for this change request.");
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage("Please describe what changes or adjustments are required.");
      return;
    }

    setIsLoading(true);

    const result = await createChangeRequestAction({
      projectId,
      deliverableId: deliverable.id,
      title: subject.trim(),
      description: description.trim(),
      priority,
    });

    if (!result.success) {
      setErrorMessage(result.error || "Failed to submit change request.");
      setIsLoading(false);
      return;
    }

    setSuccessMessage("Your change request has been submitted.");
    setIsLoading(false);

    setTimeout(() => {
      onClose();
      if (onSuccess) {
        onSuccess();
      }
      router.refresh();
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Request changes
            </h2>
            <p className="text-xs text-muted-foreground truncate max-w-[340px]">
              {deliverable.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {successMessage ? (
          <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="request_subject" className="text-xs font-medium">
                Subject *
              </Label>
              <Input
                id="request_subject"
                placeholder="Summary of changes needed..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isLoading}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="request_description" className="text-xs font-medium">
                Description *
              </Label>
              <Textarea
                id="request_description"
                placeholder="Provide detailed feedback on what needs to be changed or refined..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                disabled={isLoading}
                required
                className="text-xs resize-none"
              />
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Priority</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["LOW", "MEDIUM", "HIGH"] as ClientRequestPriority[]).map((p) => {
                  const isSelected = priority === p;
                  const label = p === "LOW" ? "Low" : p === "MEDIUM" ? "Medium" : "High";

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      disabled={isLoading}
                      className={`h-8 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-secondary text-foreground border-border font-semibold shadow-xs"
                          : "bg-background text-muted-foreground border-border/50 hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
                className="h-8 text-xs font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                className="h-8 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <span>{isLoading ? "Submitting..." : "Submit Request"}</span>
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
