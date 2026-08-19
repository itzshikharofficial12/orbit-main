"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  ExternalLink,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Send,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  Inbox,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeliverableStatusBadge } from "./deliverable-status-badge";
import { AddDeliverableDialog } from "./add-deliverable-dialog";
import { EditDeliverableDialog } from "./edit-deliverable-dialog";
import { DeleteDeliverableDialog } from "./delete-deliverable-dialog";
import { SubmitDeliverableDialog } from "./submit-deliverable-dialog";
import { continueWorkDeliverableAction } from "../actions";
import type { DeliverableWithMilestone } from "../types";
import type { Milestone } from "@/lib/supabase/types";

interface ProjectDeliverablesTabProps {
  projectId: string;
  deliverables: DeliverableWithMilestone[];
  milestones: Milestone[];
}

export function ProjectDeliverablesTab({
  projectId,
  deliverables,
  milestones,
}: ProjectDeliverablesTabProps) {
  const router = useRouter();
  const [editingDeliverable, setEditingDeliverable] =
    React.useState<DeliverableWithMilestone | null>(null);
  const [submittingDeliverable, setSubmittingDeliverable] =
    React.useState<DeliverableWithMilestone | null>(null);
  const [deletingDeliverable, setDeletingDeliverable] =
    React.useState<DeliverableWithMilestone | null>(null);
  const [isUpdatingId, setIsUpdatingId] = React.useState<string | null>(null);

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  async function handleContinueWork(deliverableId: string) {
    setIsUpdatingId(deliverableId);
    try {
      const result = await continueWorkDeliverableAction(deliverableId, projectId);
      if (result.success) {
        router.refresh();
      }
    } finally {
      setIsUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-border/70 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Deliverables</CardTitle>
              <Badge variant="secondary" className="text-xs font-mono font-normal">
                {deliverables.length} {deliverables.length === 1 ? "item" : "items"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Manage client deliverables, submissions, revisions, and approval workflows.
            </CardDescription>
          </div>

          <AddDeliverableDialog projectId={projectId} milestones={milestones} />
        </CardHeader>

        <CardContent className="pt-0">
          {deliverables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-12 text-center flex flex-col items-center justify-center space-y-3 bg-secondary/10">
              <div className="h-10 w-10 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40">
                <Package className="h-5 w-5" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-semibold text-foreground">
                  No deliverables yet
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add planned deliverables, design outputs, strategy documents, or live URLs to track client approval.
                </p>
              </div>
              <div className="pt-2">
                <AddDeliverableDialog projectId={projectId} milestones={milestones} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {deliverables.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/60 bg-secondary/10 p-4 sm:p-5 space-y-3 hover:border-border transition-colors"
                >
                  {/* Top Bar: Title, Milestone, Status Badges & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-semibold text-foreground text-sm">
                          {item.title}
                        </span>
                        <DeliverableStatusBadge status={item.status} />

                        {item.submission_count > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono font-normal gap-1 bg-secondary/60 text-muted-foreground"
                          >
                            <History className="h-2.5 w-2.5" />
                            <span>Rev #{item.submission_count}</span>
                          </Badge>
                        )}

                        {item.client_visible ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal border-emerald-900/50 text-emerald-400/90 bg-emerald-950/20 gap-1"
                          >
                            <Eye className="h-2.5 w-2.5" />
                            <span>Client Visible</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal border-zinc-800 text-zinc-400 bg-zinc-900/40 gap-1"
                          >
                            <EyeOff className="h-2.5 w-2.5" />
                            <span>Internal Only</span>
                          </Badge>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                      {/* Submit for Review (if Planned, In Progress, or Changes Requested) */}
                      {(item.status === "PLANNED" ||
                        item.status === "IN_PROGRESS" ||
                        item.status === "CHANGES_REQUESTED") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSubmittingDeliverable(item)}
                          className="h-8 text-xs font-medium gap-1.5 border-amber-800/60 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>Submit for Review</span>
                        </Button>
                      )}

                      {/* Direct External URL Link */}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-2.5 rounded-md border border-border/70 bg-background hover:bg-secondary inline-flex items-center justify-center text-xs text-foreground transition-colors gap-1"
                          title="Open URL"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      )}

                      {/* Edit Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingDeliverable(item)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit deliverable"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingDeliverable(item)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete deliverable"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Changes Requested Banner if applicable */}
                  {item.status === "CHANGES_REQUESTED" && (
                    <div className="p-3.5 rounded-lg bg-orange-950/20 border border-orange-800/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                          <span>Changes Requested by Client</span>
                        </div>
                        {item.changes_requested_at && (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {formatDate(item.changes_requested_at)}
                          </span>
                        )}
                      </div>

                      {item.client_feedback ? (
                        <div className="text-xs text-foreground bg-background/60 p-2.5 rounded border border-border/50 italic leading-relaxed">
                          &ldquo;{item.client_feedback}&rdquo;
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          The client has requested revisions for this deliverable.
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContinueWork(item.id)}
                          disabled={isUpdatingId === item.id}
                          className="h-7 text-xs font-medium gap-1 bg-background hover:bg-secondary cursor-pointer"
                        >
                          <Play className="h-3 w-3 text-sky-400" />
                          <span>Continue Work (Mark In Progress)</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSubmittingDeliverable(item)}
                          className="h-7 text-xs font-medium gap-1 bg-amber-950/30 border-amber-800/60 text-amber-300 hover:bg-amber-950/50 cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>Submit Revision</span>
                        </Button>
                        <Link href="/hq/requests">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Inbox className="h-3 w-3" />
                            <span>Request Directory</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Approved Callout if applicable */}
                  {item.status === "APPROVED" && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Approved by client{" "}
                        {item.approved_at && (
                          <span className="font-mono text-emerald-400 font-medium">
                            on {formatDate(item.approved_at)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Ready for Review Callout */}
                  {item.status === "READY_FOR_REVIEW" && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300">
                      <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span>
                        Submitted for review{" "}
                        {item.submitted_at && (
                          <span className="font-mono text-amber-300">
                            on {formatDate(item.submitted_at)}
                          </span>
                        )}
                        . Awaiting client decision.
                      </span>
                    </div>
                  )}

                  {/* Metadata Row: Milestone, Expected Date, Notes */}
                  <div className="pt-2 border-t border-border/30 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-3">
                      {item.milestone ? (
                        <span className="font-mono text-[11px]">
                          Milestone: <span className="text-foreground">{item.milestone.name}</span>
                        </span>
                      ) : (
                        <span className="text-[11px]">Project-wide Deliverable</span>
                      )}

                      {item.expected_delivery_date && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono">
                          <Calendar className="h-3 w-3" />
                          <span>Expected: {formatDate(item.expected_delivery_date)}</span>
                        </span>
                      )}
                    </div>

                    {item.notes && (
                      <span className="text-[11px] text-zinc-500 italic truncate max-w-xs">
                        Internal note: {item.notes}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingDeliverable && (
        <EditDeliverableDialog
          deliverable={editingDeliverable}
          projectId={projectId}
          milestones={milestones}
          isOpen={Boolean(editingDeliverable)}
          onClose={() => setEditingDeliverable(null)}
        />
      )}

      {/* Submit for Review Dialog */}
      {submittingDeliverable && (
        <SubmitDeliverableDialog
          deliverable={submittingDeliverable}
          projectId={projectId}
          isOpen={Boolean(submittingDeliverable)}
          onClose={() => setSubmittingDeliverable(null)}
        />
      )}

      {/* Delete Dialog */}
      {deletingDeliverable && (
        <DeleteDeliverableDialog
          deliverableId={deletingDeliverable.id}
          deliverableTitle={deletingDeliverable.title}
          projectId={projectId}
          onClose={() => setDeletingDeliverable(null)}
        />
      )}
    </div>
  );
}
