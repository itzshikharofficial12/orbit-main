"use client";

import * as React from "react";
import { Video, ExternalLink, Calendar as CalendarIcon, Clock, FolderKanban, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingStatusBadge } from "./meeting-status-badge";
import { ClientMeetingDetailDialog } from "./client-meeting-detail-dialog";
import { formatMeetingDate, formatMeetingTimeRange, calculateMeetingDuration } from "../utils";
import type { MeetingWithRelations } from "../types";

interface ClientMeetingsViewProps {
  upcomingMeetings: MeetingWithRelations[];
  pastMeetings: MeetingWithRelations[];
}

export function ClientMeetingsView({
  upcomingMeetings,
  pastMeetings,
}: ClientMeetingsViewProps) {
  const [selectedMeeting, setSelectedMeeting] = React.useState<MeetingWithRelations | null>(null);

  return (
    <div className="space-y-10">
      {/* 1. Upcoming Meetings Section (Primary Focus) */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <span>Upcoming Meetings</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Scheduled strategy, review, and alignment sessions with Celestia Studios.
          </p>
        </div>

        {upcomingMeetings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-10 text-center">
            <div className="flex flex-col items-center justify-center space-y-2.5 max-w-sm mx-auto">
              <div className="rounded-full bg-secondary/60 p-3 text-muted-foreground border border-border/40">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">
                  No upcoming meetings scheduled
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When Celestia Studios schedules a call or review, it will appear here.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-sm hover:border-border transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground leading-snug truncate">
                        {meeting.title}
                      </h3>
                      {meeting.project ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FolderKanban className="h-3.5 w-3.5 text-primary" />
                          <span>{meeting.project.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          General Account Meeting
                        </span>
                      )}
                    </div>
                    <MeetingStatusBadge status={meeting.status} />
                  </div>

                  {/* Date & Time pill */}
                  <div className="p-3 rounded-lg border border-border/60 bg-secondary/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                      <span>{formatMeetingDate(meeting.starts_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{formatMeetingTimeRange(meeting.starts_at, meeting.ends_at)}</span>
                      </div>
                      <span>({calculateMeetingDuration(meeting.starts_at, meeting.ends_at)})</span>
                    </div>
                  </div>

                  {meeting.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {meeting.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMeeting(meeting)}
                    className="text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    View Details
                  </Button>

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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Past Meetings Section (Visually Secondary) */}
      {pastMeetings.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground/80">
              Past Meetings
            </h2>
            <p className="text-xs text-muted-foreground">
              Previous sessions and completed consultations.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="divide-y divide-border/40">
              {pastMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  onClick={() => setSelectedMeeting(meeting)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/20 transition-colors cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">
                        {meeting.title}
                      </span>
                      <MeetingStatusBadge status={meeting.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground font-mono">
                      <span>{formatMeetingDate(meeting.starts_at)}</span>
                      <span>{formatMeetingTimeRange(meeting.starts_at, meeting.ends_at)}</span>
                      {meeting.project && (
                        <span className="text-muted-foreground/80 font-sans">
                          • {meeting.project.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2.5 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      {selectedMeeting && (
        <ClientMeetingDetailDialog
          meeting={selectedMeeting}
          open={Boolean(selectedMeeting)}
          onOpenChange={(open) => {
            if (!open) setSelectedMeeting(null);
          }}
        />
      )}
    </div>
  );
}
