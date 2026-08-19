"use client";

import * as React from "react";
import {
  Package,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeliverableStatusBadge } from "./deliverable-status-badge";
import { ApproveDeliverableDialog } from "./approve-deliverable-dialog";
import { RequestChangesModal } from "@/modules/requests/components/request-changes-modal";
import type { DeliverableWithMilestone } from "../types";

interface ClientDeliverablesSectionProps {
  projectId: string;
  deliverables: DeliverableWithMilestone[];
}

export function ClientDeliverablesSection({
  projectId,
  deliverables,
}: ClientDeliverablesSectionProps) {
  const [approvingDeliverable, setApprovingDeliverable] =
    React.useState<DeliverableWithMilestone | null>(null);
  const [requestingDeliverable, setRequestingDeliverable] =
    React.useState<DeliverableWithMilestone | null>(null);

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

  function getDaysRemaining(iso: string | null): string | null {
    if (!iso) return null;
    try {
      const target = new Date(iso).getTime();
      const now = new Date().getTime();
      const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) return `Expected in ${diffDays} days`;
      if (diffDays === 1) return "Expected tomorrow";
      if (diffDays === 0) return "Expected today";
      return null;
    } catch {
      return null;
    }
  }

  const readyForReview = deliverables.filter((d) => d.status === "READY_FOR_REVIEW");
  const inProgressOrUpcoming = deliverables.filter(
    (d) =>
      d.status === "PLANNED" ||
      d.status === "IN_PROGRESS" ||
      d.status === "CHANGES_REQUESTED"
  );
  const approved = deliverables.filter((d) => d.status === "APPROVED");

  return (
    <div className="space-y-6">
      {/* 1. READY FOR REVIEW (Top Priority) */}
      {readyForReview.length > 0 && (
        <Card className="border-amber-700/60 bg-card overflow-hidden shadow-sm">
          <CardHeader className="pb-3 bg-amber-950/20 border-b border-amber-800/40">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <CardTitle className="text-base font-semibold text-foreground">
                    Ready for Review ({readyForReview.length})
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-amber-200/80">
                  Please review the submitted outputs and approve or request adjustments.
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-mono border-amber-600/60 bg-amber-950/40 text-amber-300"
              >
                Action Required
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {readyForReview.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-amber-700/50 bg-secondary/20 p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h4 className="text-base font-semibold text-foreground">
                          {item.title}
                        </h4>
                        <DeliverableStatusBadge status={item.status} />
                        {item.submission_count > 1 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono text-muted-foreground"
                          >
                            Revision #{item.submission_count}
                          </Badge>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                        {item.milestone && (
                          <span className="font-mono text-[11px]">
                            Milestone: <span className="text-foreground">{item.milestone.name}</span>
                          </span>
                        )}
                        {item.submitted_at && (
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-amber-400" />
                            <span>Submitted {formatDate(item.submitted_at)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Link if available */}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 text-xs font-medium bg-background hover:bg-secondary border-border/80 text-foreground"
                        >
                          <span>View Deliverable</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>

                  {/* Client Approval Action Bar */}
                  <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-muted-foreground">
                      Review the file above before approving.
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRequestingDeliverable(item)}
                        className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border-border/70 cursor-pointer"
                      >
                        Request Changes
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setApprovingDeliverable(item)}
                        className="h-8 text-xs font-medium gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Approve Deliverable</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. IN PROGRESS & UPCOMING DELIVERABLES */}
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Deliverables</CardTitle>
                <Badge variant="secondary" className="text-xs font-mono font-normal">
                  {deliverables.length} total
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Scheduled delivery outputs and completed deliverables.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-6">
          {/* Upcoming / In Progress Grid */}
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              In Progress & Upcoming ({inProgressOrUpcoming.length})
            </div>

            {inProgressOrUpcoming.length === 0 ? (
              <div className="py-6 rounded-xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground bg-secondary/5">
                No deliverables currently in progress.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {inProgressOrUpcoming.map((item) => {
                  const countdown = getDaysRemaining(item.expected_delivery_date);

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/60 bg-secondary/15 p-4 flex flex-col justify-between space-y-3 hover:border-border transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground text-sm leading-snug">
                            {item.title}
                          </h4>
                          <DeliverableStatusBadge status={item.status} />
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Changes Requested Notice if applicable */}
                      {item.status === "CHANGES_REQUESTED" && (
                        <div className="p-2.5 rounded-lg bg-orange-950/20 border border-orange-800/40 text-[11px] text-orange-300 flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                          <span>
                            Revisions in progress based on your requested changes.
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border/30 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        {item.milestone ? (
                          <span className="font-mono text-[11px]">
                            {item.milestone.name}
                          </span>
                        ) : (
                          <span className="text-[11px]">Project Deliverable</span>
                        )}

                        {item.expected_delivery_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Expected {formatDate(item.expected_delivery_date)}
                            </span>
                            {countdown && (
                              <span className="text-foreground/80 font-normal">
                                ({countdown})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Preparing deliverable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. APPROVED DELIVERABLES */}
          {approved.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/40">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Approved Deliverables ({approved.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {approved.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-emerald-900/40 bg-secondary/15 p-4 flex flex-col justify-between space-y-3 hover:border-emerald-800/60 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-sm leading-snug">
                          {item.title}
                        </h4>
                        <DeliverableStatusBadge status={item.status} />
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/30 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        {item.milestone ? (
                          <span className="font-mono text-[11px]">
                            {item.milestone.name}
                          </span>
                        ) : (
                          <span className="text-[11px]">Project Deliverable</span>
                        )}

                        {item.approved_at && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approved {formatDate(item.approved_at)}</span>
                          </span>
                        )}
                      </div>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-block"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs font-medium gap-1.5 bg-background hover:bg-secondary border-border/70 text-foreground justify-center"
                          >
                            <span>View Deliverable</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deliverables.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/70 p-10 text-center flex flex-col items-center justify-center space-y-2.5 bg-secondary/10">
              <div className="h-9 w-9 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40">
                <Package className="h-4 w-4" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-semibold text-foreground">
                  No deliverables yet
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your project deliverables will appear here as they are prepared and submitted by Celestia Studios.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      {approvingDeliverable && (
        <ApproveDeliverableDialog
          deliverable={approvingDeliverable}
          projectId={projectId}
          isOpen={Boolean(approvingDeliverable)}
          onClose={() => setApprovingDeliverable(null)}
        />
      )}

      {/* Request Changes Modal */}
      {requestingDeliverable && (
        <RequestChangesModal
          deliverable={requestingDeliverable}
          projectId={projectId}
          isOpen={Boolean(requestingDeliverable)}
          onClose={() => setRequestingDeliverable(null)}
        />
      )}
    </div>
  );
}
