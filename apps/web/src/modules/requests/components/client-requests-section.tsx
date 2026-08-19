"use client";

import * as React from "react";
import { MessageSquarePlus, Calendar, ChevronRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestStatusBadge } from "./request-status-badge";
import { RequestPriorityBadge } from "./request-priority-badge";
import { RequestDetailDialog } from "./request-detail-dialog";
import type { ClientRequestWithRelations } from "../types";

interface ClientRequestsSectionProps {
  requests: ClientRequestWithRelations[];
}

export function ClientRequestsSection({ requests }: ClientRequestsSectionProps) {
  const [selectedRequest, setSelectedRequest] =
    React.useState<ClientRequestWithRelations | null>(null);

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

  const openCount = requests.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS").length;

  return (
    <>
      <Card className="border-border/70 bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  Change Requests
                </CardTitle>
                <Badge variant="secondary" className="text-xs font-mono font-normal">
                  {requests.length} total
                </Badge>
                {openCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs font-mono border-amber-600/60 bg-amber-950/40 text-amber-300"
                  >
                    {openCount} active
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Revisions and change requests submitted for this project.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center flex flex-col items-center justify-center space-y-2.5 bg-secondary/10">
              <div className="h-9 w-9 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground border border-border/40">
                <MessageSquarePlus className="h-4 w-4" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-semibold text-foreground">
                  No change requests
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When you review deliverables that require adjustments, submitted change requests will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className="rounded-xl border border-border/60 bg-secondary/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border hover:bg-secondary/25 transition-all cursor-pointer group"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {request.title}
                      </h4>
                      <RequestStatusBadge status={request.status} />
                      <RequestPriorityBadge priority={request.priority} />
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {request.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono pt-0.5">
                      {request.deliverable && (
                        <span className="text-[11px]">
                          Deliverable: <span className="text-foreground">{request.deliverable.title}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Calendar className="h-3 w-3" />
                        <span>Submitted {formatDate(request.created_at)}</span>
                      </span>
                      {request.status === "RESOLVED" && request.resolved_at && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Resolved {formatDate(request.resolved_at)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 self-end sm:self-center">
                    <span>View details</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <RequestDetailDialog
          request={selectedRequest}
          isOpen={Boolean(selectedRequest)}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </>
  );
}
