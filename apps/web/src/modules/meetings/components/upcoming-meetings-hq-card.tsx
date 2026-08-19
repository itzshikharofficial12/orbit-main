import * as React from "react";
import Link from "next/link";
import { Video, ArrowRight, ExternalLink, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMeetingDate, formatMeetingTimeRange } from "../utils";
import type { MeetingWithRelations } from "../types";

interface UpcomingMeetingsHqCardProps {
  meetings: MeetingWithRelations[];
}

export function UpcomingMeetingsHqCard({ meetings }: UpcomingMeetingsHqCardProps) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-secondary/80 text-muted-foreground border border-border/40">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Upcoming Meetings</CardTitle>
              <CardDescription className="text-xs">
                Scheduled client calls, strategy reviews, and deliveries.
              </CardDescription>
            </div>
          </div>
          <Link href="/hq/meetings">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        {meetings.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No upcoming client meetings scheduled.
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-xs truncate">
                      {meeting.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      • {meeting.client?.name || "Client"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1 text-foreground/80">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{formatMeetingDate(meeting.starts_at)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatMeetingTimeRange(meeting.starts_at, meeting.ends_at)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={meeting.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5 gap-1 cursor-pointer"
                    >
                      <span>Join</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                  <Link href="/hq/meetings">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
