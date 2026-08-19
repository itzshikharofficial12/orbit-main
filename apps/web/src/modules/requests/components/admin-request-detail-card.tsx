"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  FolderKanban,
  Package,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequestStatusBadge } from "./request-status-badge";
import { RequestPriorityBadge } from "./request-priority-badge";
import { updateRequestStatusAction } from "../actions";
import type { ClientRequestWithRelations, ClientRequestStatus } from "../types";

interface AdminRequestDetailCardProps {
  request: ClientRequestWithRelations;
}

export function AdminRequestDetailCard({ request }: AdminRequestDetailCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  async function handleStatusChange(newStatus: ClientRequestStatus) {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await updateRequestStatusAction(request.id, newStatus);
    if (!result.success) {
      setErrorMessage(result.error || "Failed to update request status.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.refresh();
  }

  const creatorName = request.created_by_profile
    ? `${request.created_by_profile.first_name || ""} ${
        request.created_by_profile.last_name || ""
      }`.trim() || request.created_by_profile.email
    : null;

  const resolverName = request.resolved_by_profile
    ? `${request.resolved_by_profile.first_name || ""} ${
        request.resolved_by_profile.last_name || ""
      }`.trim() || request.resolved_by_profile.email
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Button */}
      <div>
        <Link
          href="/hq/requests"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Request Directory</span>
        </Link>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main Request Card */}
      <Card className="border-border/70 bg-card shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  {request.title}
                </CardTitle>
                <RequestStatusBadge status={request.status} />
                <RequestPriorityBadge priority={request.priority} />
              </div>
              <CardDescription className="text-xs">
                Submitted by client for deliverable revision review.
              </CardDescription>
            </div>

            {/* Admin Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {request.status !== "IN_PROGRESS" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 bg-sky-950/20 text-sky-300 border-sky-800/60 hover:bg-sky-950/40 hover:text-sky-200 cursor-pointer"
                >
                  <Play className="h-3 w-3" />
                  <span>Mark In Progress</span>
                </Button>
              )}

              {request.status !== "RESOLVED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("RESOLVED")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 bg-emerald-950/20 text-emerald-300 border-emerald-800/60 hover:bg-emerald-950/40 hover:text-emerald-200 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Resolved</span>
                </Button>
              )}

              {request.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("CLOSED")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground border-border/70 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Close</span>
                </Button>
              )}

              {request.status === "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange("OPEN")}
                  disabled={isLoading}
                  className="h-8 text-xs font-medium gap-1.5 text-muted-foreground hover:text-foreground border-border/70 cursor-pointer"
                >
                  <span>Reopen Request</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Association Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/20 border border-border/50 text-xs">
            {/* Client */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Client Organization
              </span>
              {request.client ? (
                <Link
                  href={`/hq/clients/${request.client_id}`}
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{request.client.name}</span>
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            {/* Project */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Project Engagement
              </span>
              {request.project ? (
                <Link
                  href={`/hq/projects/${request.project_id}`}
                  className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5"
                >
                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{request.project.name}</span>
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>

            {/* Deliverable */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Target Deliverable
              </span>
              {request.deliverable ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/hq/projects/${request.project_id}?tab=deliverables`}
                    className="font-medium text-foreground hover:underline inline-flex items-center gap-1.5 truncate"
                  >
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{request.deliverable.title}</span>
                  </Link>
                  {request.deliverable.url && (
                    <a
                      href={request.deliverable.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      title="Open deliverable link"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>

          {/* Description Content */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Feedback Description
            </h3>
            <div className="p-5 rounded-xl bg-secondary/15 border border-border/50 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
              {request.description}
            </div>
          </div>

          {/* Timeline & Resolution Box */}
          <div className="space-y-3 pt-3 border-t border-border/40">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Activity & Timeline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Submission Date & Creator */}
              <div className="p-3.5 rounded-lg border border-border/50 bg-secondary/10 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-mono">Submission Time</span>
                </div>
                <div className="text-foreground font-medium">
                  {formatDate(request.created_at)}
                </div>
                {creatorName && (
                  <div className="text-[11px] text-muted-foreground">
                    By {creatorName}
                  </div>
                )}
              </div>

              {/* Resolution Status */}
              <div className="p-3.5 rounded-lg border border-border/50 bg-secondary/10 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-mono">Resolution State</span>
                </div>
                {request.status === "RESOLVED" ? (
                  <>
                    <div className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Resolved on {formatDate(request.resolved_at)}</span>
                    </div>
                    {resolverName && (
                      <div className="text-[11px] text-muted-foreground">
                        Handled by {resolverName}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground italic">
                    Currently awaiting completion. Use the actions above to update progress.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
