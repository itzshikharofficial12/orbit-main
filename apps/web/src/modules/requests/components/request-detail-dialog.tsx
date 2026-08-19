"use client";

import * as React from "react";
import { X, Calendar, Package, FolderKanban, CheckCircle2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestStatusBadge } from "./request-status-badge";
import { RequestPriorityBadge } from "./request-priority-badge";
import type { ClientRequestWithRelations } from "../types";

interface RequestDetailDialogProps {
  request: ClientRequestWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RequestDetailDialog({
  request,
  isOpen,
  onClose,
}: RequestDetailDialogProps) {
  if (!isOpen || !request) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/40">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {request.title}
              </h2>
              <RequestStatusBadge status={request.status} />
              <RequestPriorityBadge priority={request.priority} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Created {formatDate(request.created_at)}</span>
              </span>
              {creatorName && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>By {creatorName}</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Association Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-secondary/20 border border-border/50 text-xs">
          {request.deliverable && (
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                  Deliverable
                </span>
                <span className="font-medium text-foreground truncate block">
                  {request.deliverable.title}
                </span>
              </div>
            </div>
          )}

          {request.project && (
            <div className="flex items-center gap-2">
              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                  Project
                </span>
                <span className="font-medium text-foreground truncate block">
                  {request.project.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Description / Content */}
        <div className="space-y-1.5">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold block">
            Feedback & Details
          </span>
          <div className="p-4 rounded-lg bg-secondary/15 border border-border/50 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {request.description}
          </div>
        </div>

        {/* Resolution Box if resolved */}
        {request.status === "RESOLVED" && (
          <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-1.5 text-xs text-emerald-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Resolved by Celestia Studios</span>
            </div>
            <div className="text-[11px] text-emerald-200/80 font-mono">
              {request.resolved_at && `Completed on ${formatDate(request.resolved_at)}`}
              {resolverName && ` by ${resolverName}`}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs font-medium cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
