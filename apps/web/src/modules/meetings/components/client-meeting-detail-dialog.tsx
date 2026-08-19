"use client";

import * as React from "react";
import { Video, X, Calendar as CalendarIcon, Clock, ExternalLink, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingStatusBadge } from "./meeting-status-badge";
import { formatMeetingDate, formatMeetingTimeRange, calculateMeetingDuration } from "../utils";
import type { MeetingWithRelations } from "../types";

interface ClientMeetingDetailDialogProps {
  meeting: MeetingWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientMeetingDetailDialog({
  meeting,
  open,
  onOpenChange,
}: ClientMeetingDetailDialogProps) {
  if (!open) return null;

  const isUpcoming = meeting.status === "SCHEDULED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 space-y-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/40">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <MeetingStatusBadge status={meeting.status} />
              {meeting.project && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <FolderKanban className="h-3 w-3 text-primary" />
                  <span>{meeting.project.name}</span>
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold tracking-tight text-foreground truncate">
              {meeting.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Date, Time & Duration Panel */}
        <div className="p-3.5 rounded-lg border border-border/60 bg-secondary/30 space-y-2">
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            <span>{formatMeetingDate(meeting.starts_at)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatMeetingTimeRange(meeting.starts_at, meeting.ends_at)}</span>
            </div>
            <span>({calculateMeetingDuration(meeting.starts_at, meeting.ends_at)})</span>
          </div>
        </div>

        {/* Description */}
        {meeting.description ? (
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider font-mono text-muted-foreground block">
              Agenda / Notes
            </span>
            <div className="p-3 rounded-lg border border-border/40 bg-secondary/15 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {meeting.description}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No additional notes provided for this meeting.
          </p>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 cursor-pointer"
          >
            Close
          </Button>

          {isUpcoming && (
            <a
              href={meeting.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button size="sm" className="text-xs h-8 gap-1.5 cursor-pointer">
                <span>Join Meeting</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
