"use client";

import * as React from "react";
import {
  Search,
  ExternalLink,
  Edit2,
  Check,
  XCircle,
  Video,
  Clock,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingStatusBadge } from "./meeting-status-badge";
import { EditMeetingDialog } from "./edit-meeting-dialog";
import { CancelMeetingDialog } from "./cancel-meeting-dialog";
import { completeMeetingAction } from "../actions";
import { formatMeetingDate, formatMeetingTimeRange, calculateMeetingDuration } from "../utils";
import type { MeetingWithRelations } from "../types";
import type { Client, Project } from "@/lib/supabase/types";

interface AdminMeetingsDirectoryProps {
  upcomingMeetings: MeetingWithRelations[];
  pastMeetings: MeetingWithRelations[];
  clients: Client[];
  projects: Project[];
}

export function AdminMeetingsDirectory({
  upcomingMeetings,
  pastMeetings,
  clients,
  projects,
}: AdminMeetingsDirectoryProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClientId, setSelectedClientId] = React.useState("ALL");
  const [selectedProjectId, setSelectedProjectId] = React.useState("ALL");

  // Dialog states
  const [editingMeeting, setEditingMeeting] = React.useState<MeetingWithRelations | null>(null);
  const [cancellingMeeting, setCancellingMeeting] = React.useState<MeetingWithRelations | null>(null);
  const [completingId, setCompletingId] = React.useState<string | null>(null);

  // Filter projects by client filter
  const filteredProjects = React.useMemo(() => {
    if (selectedClientId === "ALL") return projects;
    return projects.filter((p) => p.client_id === selectedClientId);
  }, [projects, selectedClientId]);

  // Filter upcoming meetings
  const displayedUpcoming = React.useMemo(() => {
    return upcomingMeetings.filter((m) => {
      if (selectedClientId !== "ALL" && m.client_id !== selectedClientId) {
        return false;
      }
      if (selectedProjectId !== "ALL" && m.project_id !== selectedProjectId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchClient = m.client?.name?.toLowerCase().includes(q);
        const matchProj = m.project?.name?.toLowerCase().includes(q);
        const matchDesc = m.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchProj && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }, [upcomingMeetings, selectedClientId, selectedProjectId, searchQuery]);

  // Filter past meetings
  const displayedPast = React.useMemo(() => {
    return pastMeetings.filter((m) => {
      if (selectedClientId !== "ALL" && m.client_id !== selectedClientId) {
        return false;
      }
      if (selectedProjectId !== "ALL" && m.project_id !== selectedProjectId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchClient = m.client?.name?.toLowerCase().includes(q);
        const matchProj = m.project?.name?.toLowerCase().includes(q);
        const matchDesc = m.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchProj && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }, [pastMeetings, selectedClientId, selectedProjectId, searchQuery]);

  async function handleComplete(meetingId: string) {
    setCompletingId(meetingId);
    try {
      await completeMeetingAction(meetingId);
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* Search & Filters Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-2 border-b border-border/40">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search meetings by title, client, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Filter */}
          <select
            value={selectedClientId}
            onChange={(e) => {
              setSelectedClientId(e.target.value);
              setSelectedProjectId("ALL");
            }}
            className="h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Projects</option>
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. UPCOMING SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground font-mono flex items-center gap-2">
            <span>Upcoming</span>
            {displayedUpcoming.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground font-sans">
                ({displayedUpcoming.length})
              </span>
            )}
          </h2>
        </div>

        {displayedUpcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-card/30 p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
              <div className="rounded-full bg-secondary/60 p-3 text-muted-foreground border border-border/40">
                <Video className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-medium text-foreground">
                  No upcoming meetings
                </h3>
                <p className="text-xs text-muted-foreground">
                  Scheduled meetings with clients will appear here.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedUpcoming.map((meeting) => (
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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/90">
                          {meeting.client?.name || "Client"}
                        </span>
                        {meeting.project && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span>•</span>
                            <span>{meeting.project.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <MeetingStatusBadge status={meeting.status} />
                  </div>

                  {/* Date & Time pill */}
                  <div className="p-3 rounded-lg border border-border/60 bg-secondary/30 space-y-1">
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

                {/* Direct Action Buttons: [Join] [Complete] + Edit/Cancel */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={meeting.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button
                        size="sm"
                        className="text-xs h-8 px-3 gap-1.5 cursor-pointer font-medium"
                      >
                        <span>Join</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleComplete(meeting.id)}
                      disabled={completingId === meeting.id}
                      className="text-xs h-8 px-3 gap-1.5 cursor-pointer hover:text-emerald-400 hover:border-emerald-800/60"
                    >
                      {completingId === meeting.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      <span>Complete</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMeeting(meeting)}
                      className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Edit / Reschedule"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancellingMeeting(meeting)}
                      className="text-xs h-8 px-2 text-muted-foreground hover:text-red-400 cursor-pointer"
                      title="Cancel Meeting"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. PAST SECTION */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
          <h2 className="text-sm font-semibold tracking-wider uppercase text-foreground/80 font-mono flex items-center gap-2">
            <span>Past</span>
            {displayedPast.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground font-sans">
                ({displayedPast.length})
              </span>
            )}
          </h2>
        </div>

        {displayedPast.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-8 text-center text-xs text-muted-foreground">
            No past or completed meetings yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border/70 bg-card overflow-hidden divide-y divide-border/40 shadow-sm">
            {displayedPast.map((meeting) => (
              <div
                key={meeting.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/15 transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm truncate">
                      {meeting.title}
                    </span>
                    <MeetingStatusBadge status={meeting.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/90">
                      {meeting.client?.name || "Client"}
                    </span>
                    {meeting.project && (
                      <span className="text-muted-foreground/80">
                        • {meeting.project.name}
                      </span>
                    )}
                    <span className="font-mono flex items-center gap-1.5 text-foreground/80">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{formatMeetingDate(meeting.starts_at)}</span>
                    </span>
                    <span className="font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatMeetingTimeRange(meeting.starts_at, meeting.ends_at)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingMeeting(meeting)}
                    className="text-xs h-7 px-2.5 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingMeeting && (
        <EditMeetingDialog
          meeting={editingMeeting}
          clients={clients}
          projects={projects}
          open={Boolean(editingMeeting)}
          onOpenChange={(open) => {
            if (!open) setEditingMeeting(null);
          }}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      {cancellingMeeting && (
        <CancelMeetingDialog
          meeting={cancellingMeeting}
          open={Boolean(cancellingMeeting)}
          onOpenChange={(open) => {
            if (!open) setCancellingMeeting(null);
          }}
        />
      )}
    </div>
  );
}
