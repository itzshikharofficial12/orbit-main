import * as React from "react";
import Link from "next/link";
import { Video, ExternalLink, Calendar as CalendarIcon, Clock, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMeetingDate, formatMeetingTimeRange } from "../utils";
import type { MeetingWithRelations } from "../types";

interface UpcomingMeetingCardClientProps {
  meeting: MeetingWithRelations | null;
}

export function UpcomingMeetingCardClient({ meeting }: UpcomingMeetingCardClientProps) {
  // If no upcoming meeting, do not display a large empty card
  if (!meeting) return null;

  return (
    <Card className="border-blue-800/60 bg-card overflow-hidden shadow-sm">
      <CardHeader className="pb-3 bg-blue-950/20 border-b border-blue-900/40">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Upcoming Meeting
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-blue-200/80">
              Your next scheduled session with Celestia Studios.
            </CardDescription>
          </div>
          <Link href="/client/meetings">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 gap-1 border-blue-800/50 bg-blue-950/40 text-blue-300 hover:bg-blue-900/40 cursor-pointer"
            >
              <span>All Meetings</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <span className="font-semibold text-foreground text-base block truncate">
              {meeting.title}
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1.5 text-foreground">
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                <span>{formatMeetingDate(meeting.starts_at)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatMeetingTimeRange(meeting.starts_at, meeting.ends_at)}</span>
              </span>
              {meeting.project && (
                <span className="text-muted-foreground font-sans">
                  • {meeting.project.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/client/meetings">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs px-3 cursor-pointer"
              >
                View
              </Button>
            </Link>
            <a
              href={meeting.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button size="sm" className="h-8 text-xs px-3 gap-1.5 cursor-pointer">
                <span>Join Meeting</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
