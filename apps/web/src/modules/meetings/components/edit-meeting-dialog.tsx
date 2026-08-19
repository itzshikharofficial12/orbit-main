"use client";

import * as React from "react";
import { Edit2, X, Calendar as CalendarIcon, Clock, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateMeetingAction } from "../actions";
import type { MeetingWithRelations } from "../types";
import type { Client, Project } from "@/lib/supabase/types";

interface EditMeetingDialogProps {
  meeting: MeetingWithRelations;
  clients: Client[];
  projects: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMeetingDialog({
  meeting,
  clients,
  projects,
  open,
  onOpenChange,
}: EditMeetingDialogProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = React.useState<string>(meeting.client_id);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>(
    meeting.project_id || ""
  );

  React.useEffect(() => {
    setSelectedClientId(meeting.client_id);
    setSelectedProjectId(meeting.project_id || "");
  }, [meeting]);

  const clientProjects = React.useMemo(() => {
    if (!selectedClientId) return [];
    return projects.filter((p) => p.client_id === selectedClientId);
  }, [projects, selectedClientId]);

  const initialDateStr = React.useMemo(() => {
    try {
      return new Date(meeting.starts_at).toISOString().split("T")[0];
    } catch {
      return "";
    }
  }, [meeting.starts_at]);

  const initialStartTimeStr = React.useMemo(() => {
    try {
      const d = new Date(meeting.starts_at);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "16:00";
    }
  }, [meeting.starts_at]);

  const initialEndTimeStr = React.useMemo(() => {
    try {
      const d = new Date(meeting.ends_at);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "16:45";
    }
  }, [meeting.ends_at]);

  function handleClose() {
    if (isPending) return;
    onOpenChange(false);
    setErrorMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("meeting_id", meeting.id);
    formData.set("client_id", selectedClientId);
    if (selectedProjectId) {
      formData.set("project_id", selectedProjectId);
    } else {
      formData.delete("project_id");
    }

    startTransition(async () => {
      const result = await updateMeetingAction(formData);
      if (result.success) {
        onOpenChange(false);
      } else {
        setErrorMessage(result.error || "Failed to update meeting");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-xl border border-border/80 bg-card p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-primary" />
              <span>Edit / Reschedule Meeting</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Modify meeting details or reschedule time. The client will be automatically notified if the date/time is adjusted.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/30 leading-relaxed font-mono">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="edit-title" className="text-xs font-medium text-foreground">
              Meeting Title <span className="text-destructive">*</span>
            </label>
            <input
              id="edit-title"
              name="title"
              type="text"
              required
              defaultValue={meeting.title}
              className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Client & Project Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="edit-client" className="text-xs font-medium text-foreground">
                Client <span className="text-destructive">*</span>
              </label>
              <select
                id="edit-client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-project" className="text-xs font-medium text-foreground">
                Project <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <select
                id="edit-project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">General Account Meeting</option>
                {clientProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="edit-date" className="text-xs font-medium text-foreground flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                <span>Date *</span>
              </label>
              <input
                id="edit-date"
                name="date"
                type="date"
                required
                defaultValue={initialDateStr}
                className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-start-time" className="text-xs font-medium text-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Start Time *</span>
              </label>
              <input
                id="edit-start-time"
                name="start_time"
                type="time"
                required
                defaultValue={initialStartTimeStr}
                className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-end-time" className="text-xs font-medium text-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>End Time *</span>
              </label>
              <input
                id="edit-end-time"
                name="end_time"
                type="time"
                required
                defaultValue={initialEndTimeStr}
                className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Meeting URL */}
          <div className="space-y-1.5">
            <label htmlFor="edit-url" className="text-xs font-medium text-foreground flex items-center gap-1">
              <LinkIcon className="h-3 w-3 text-muted-foreground" />
              <span>Meeting Link URL *</span>
            </label>
            <input
              id="edit-url"
              name="meeting_url"
              type="url"
              required
              defaultValue={meeting.meeting_url}
              className="w-full h-9 px-3 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="edit-description" className="text-xs font-medium text-foreground">
              Agenda / Notes <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              id="edit-description"
              name="description"
              rows={3}
              defaultValue={meeting.description || ""}
              placeholder="Key topics to discuss, deliverables to review..."
              className="w-full p-2.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isPending}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="text-xs h-8 gap-1.5 cursor-pointer"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
